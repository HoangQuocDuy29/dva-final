import crypto from 'crypto';
import {
  fromRotationEnum,
  prisma,
  resolveApplicationBirthYear,
  toApplicationDto,
  toRotationEnum,
} from '../../config/prisma';
import { invalidateCache } from '../../utils/cache';
import { HttpError } from '../../utils/validation';
import {
  removeVietnameseTones,
  sendAdminNotification,
  sendMemberRegistrationEmail,
  sendTryoutInvitationEmail,
  sendTryoutResultEmail,
} from '../../utils/email.service';
import { getTryoutDayInfo } from '../../../src/shared/tryoutEmail';
import { dispatchGoogleSheetsWebhookAsync } from '../integrations/sheets.service';

type AssignedPlayerLevel = 'SENIOR' | 'JUNIOR' | 'YOUTH';

function resolveAssignedPlayerLevel(requested: unknown, fallback: unknown): AssignedPlayerLevel {
  const raw = String(requested || fallback || 'JUNIOR').trim().toUpperCase();
  if (raw === 'SENIOR' || raw === 'JUNIOR' || raw === 'YOUTH') return raw;
  return 'JUNIOR';
}

export function assertCanRejectApplication(isSuperAdminUser: boolean, ...candidates: unknown[]): void {
  if (isSuperAdminUser) return;
  for (const val of candidates) {
    if (String(val ?? '').trim().toUpperCase() === 'REJECTED') {
      throw new HttpError(403, 'Only SUPERADMIN can reject applications');
    }
  }
}

function deriveLevelFromExperience(experience?: string, birthYear?: number): 'SENIOR' | 'JUNIOR' | 'YOUTH' {
  const exp = (experience || '').toLowerCase();
  if (exp.includes('3+') || exp.includes('senior') || exp.includes('advanced') || exp.includes('trên 3')) {
    return 'SENIOR';
  }
  if (
    exp.includes('< 1') ||
    exp.includes('dưới 1') ||
    exp.includes('beginner') ||
    exp.includes('mới') ||
    exp.includes('6 tháng') ||
    exp.includes('youth') ||
    (birthYear !== undefined && birthYear >= 2010)
  ) {
    return 'YOUTH';
  }
  return 'JUNIOR';
}

async function promoteApplicationToPlayerIfNeeded(tx: any, existing: any): Promise<boolean> {
  if (existing.status === 'APPROVED') return false;
  const resolvedBornYear = resolveApplicationBirthYear(existing);
  await tx.player.create({
    data: {
      id: `p-${crypto.randomUUID()}`,
      fullName: existing.fullName,
      jerseyNumber: existing.desiredJerseyNumber || Math.floor(Math.random() * 50) + 1,
      height: existing.height || 185,
      weight: existing.weight || 75,
      spikeTouch: existing.spikeReach || 325,
      blockTouch: existing.blockReach || 310,
      hometownCountry: existing.hometownCountry || 'Việt Nam',
      countryName: 'Vietnam',
      countryCode: 'VN',
      countryFlag: '🇻🇳',
      bornYear: resolvedBornYear,
      level: existing.level || 'JUNIOR',
      position: existing.position || 'OH',
      avatarUrl: '',
      bio: `Tân binh DVA gia nhập qua đợt tuyển chọn thành viên 2026. Am hiểu sơ đồ ${fromRotationEnum(existing.rotationKnowledge)}.`,
      joinedYear: new Date().getFullYear(),
    },
  });
  console.log(`[DVA Member Approved] Auto-created player profile for ${existing.fullName} in PostgreSQL!`);
  return true;
}

export async function listApplications(includeSensitive: boolean) {
  const dbApps = await prisma.memberApplication.findMany({ orderBy: { createdAt: 'desc' } });
  return dbApps.map((a) => toApplicationDto(a, includeSensitive));
}

export async function registerApplication(data: Record<string, any>, isTryoutPage: boolean) {
  const resolvedDob = data.dob || (data.birthYear ? `${data.birthYear}-01-01` : '');
  if (!resolvedDob) {
    throw new HttpError(400, 'Date of birth or birth year is required.');
  }

  const resolvedLevel = data.level || deriveLevelFromExperience(data.experience, data.birthYear);
  const resolvedRotation =
    data.rotationKnowledge || (resolvedLevel === 'SENIOR' ? '5-1' : resolvedLevel === 'YOUTH' ? 'BEGINNER' : '4-2');

  const appId = `app-${crypto.randomUUID()}`;
  const created = await prisma.memberApplication.create({
    data: {
      id: appId,
      fullName: data.fullName,
      dob: resolvedDob,
      position: data.position,
      hometownCountry: data.hometownCountry || 'Hà Nội',
      desiredJerseyNumber: data.desiredJerseyNumber ?? 0,
      level: resolvedLevel,
      height: data.height,
      weight: data.weight ?? 0,
      spikeReach: data.spikeReach ?? 0,
      blockReach: data.blockReach ?? 0,
      gmail: data.gmail,
      instagram: data.instagram || 'None',
      zalo: data.zalo,
      rotationKnowledge: toRotationEnum(resolvedRotation),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      experience: data.experience || null,
      preferredDays: data.preferredDays || null,
    },
  });

  const dto = toApplicationDto(created, true);

  const memberSheetPayload = {
    'Họ và tên': dto.fullName,
    'Ngày sinh': dto.dob,
    'Vị trí': dto.position,
    'Cấp độ':
      dto.level === 'SENIOR'
        ? 'Senior (Advanced, 3+ yrs)'
        : dto.level === 'JUNIOR'
          ? 'Junior (Intermediate)'
          : 'Youth',
    'Số áo mong muốn': dto.desiredJerseyNumber,
    'Chiều cao (cm)': dto.height,
    'Cân nặng (kg)': dto.weight,
    'Bật đập (cm)': dto.spikeReach,
    'Bật chắn (cm)': dto.blockReach,
    'Số Zalo': dto.zalo,
    Email: dto.gmail || '',
    Instagram: dto.instagram || 'None',
    'Chiến thuật 5-1': dto.rotationKnowledge,
    'Quê quán': dto.hometownCountry,
    ...(dto.experience ? { 'Kinh nghiệm': dto.experience } : {}),
    ...(dto.preferredDays ? { 'Khung ngày mong muốn': dto.preferredDays } : {}),
    'Thời gian gửi': new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  };
  dispatchGoogleSheetsWebhookAsync('Member_Registrations', 'TuyenThanhVien', memberSheetPayload);

  const memberEmail = (dto.gmail || '').trim();
  if (memberEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) {
    sendMemberRegistrationEmail({
      id: dto.id,
      passId: dto.id,
      fullName: dto.fullName,
      dob: dto.dob,
      position: dto.position,
      level: dto.level,
      desiredJerseyNumber: dto.desiredJerseyNumber,
      height: dto.height,
      weight: dto.weight,
      spikeReach: dto.spikeReach,
      blockReach: dto.blockReach,
      gmail: dto.gmail || '',
      zalo: dto.zalo || '',
      instagram: dto.instagram,
      rotationKnowledge: dto.rotationKnowledge,
      hometownCountry: dto.hometownCountry,
      experience: dto.experience,
      preferredDays: dto.preferredDays,
    }).catch((mailError: any) => {
      console.error('[Email Service Warning] Gửi mail thất bại cho:', memberEmail, mailError?.message || mailError);
    });
  }

  const cleanMemberName = removeVietnameseTones(dto.fullName).replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cleanMemberPhone = (dto.zalo || '').replace(/\D/g, '').trim() || (dto.zalo || '').trim();
  const memberTransferContent = `register_${cleanMemberName}_clubentry_${cleanMemberPhone}`;

  sendAdminNotification({
    type: 'MEMBER',
    title: isTryoutPage ? 'Đăng Ký Try-Out CLB DVA' : 'Đăng Ký Thành Viên CLB (Phí 100k)',
    code: dto.id,
    customerName: dto.fullName,
    phone: dto.zalo || '',
    email: dto.gmail || undefined,
    amount: 100000,
    transferContent: memberTransferContent,
    details: [
      `Cấp độ: ${dto.level}`,
      `Vị trí: ${dto.position || 'N/A'}`,
      `Chiều cao: ${dto.height}cm`,
      dto.experience ? `Kinh nghiệm: ${dto.experience}` : '',
      dto.preferredDays ? `Ngày mong muốn: ${dto.preferredDays}` : '',
      `Quê: ${dto.hometownCountry || 'N/A'}`,
    ]
      .filter(Boolean)
      .join(' | '),
  }).catch((err) => console.error('[Admin Alert Error - Member Application]:', err?.message || err));

  return dto;
}

export async function updateApplicationStatus(
  id: string,
  input: { status: string; reviewNotes?: string; entryFee?: number },
  isSuperAdminUser: boolean
) {
  assertCanRejectApplication(isSuperAdminUser, input.status);
  if (!isSuperAdminUser && input.status === 'APPROVED') {
    throw new HttpError(
      403,
      'Direct priority approval is restricted to SUPERADMIN. Use the Evaluation Scorecard to evaluate candidates.'
    );
  }
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Application not found');

  const existingPay = String(existing.paymentStatus || 'PENDING').toUpperCase();
  const resolvedFee =
    isSuperAdminUser && input.entryFee !== undefined
      ? input.entryFee
      : existingPay === 'FREE'
        ? 0
        : (existing.entryFee ?? 100000);

  let promoted = false;
  const updated = await prisma.$transaction(async (tx) => {
    const appUpdated = await tx.memberApplication.update({
      where: { id },
      data: {
        status: input.status as any,
        ...(input.reviewNotes ? { reviewNotes: input.reviewNotes } : {}),
        ...(input.status === 'APPROVED'
          ? { approvedAt: existing.approvedAt ?? new Date(), entryFee: resolvedFee }
          : { approvedAt: null }),
      },
    });
    if (input.status === 'APPROVED') {
      promoted = await promoteApplicationToPlayerIfNeeded(tx, existing);
    }
    return appUpdated;
  });

  if (promoted) {
    invalidateCache(['players', 'home']);
  }

  return {
    application: toApplicationDto(updated, isSuperAdminUser),
    promotedPlayer: input.status === 'APPROVED' && (promoted || existing.status === 'APPROVED'),
  };
}

export async function updateTryoutApplication(
  id: string,
  input: {
    level?: string;
    status?: string;
    conclusion?: string;
    outcome?: string;
    reviewNotes?: string;
    coachNotes?: string;
    entryFee?: number;
  },
  isSuperAdminUser: boolean
) {
  const targetStatus = input.status ?? input.conclusion ?? input.outcome;
  assertCanRejectApplication(isSuperAdminUser, input.status, input.conclusion, input.outcome);

  if (!isSuperAdminUser && targetStatus === 'APPROVED') {
    throw new HttpError(
      403,
      'Direct priority approval is restricted to SUPERADMIN. Use the Evaluation Scorecard to evaluate candidates.'
    );
  }
  if (!isSuperAdminUser && input.entryFee !== undefined) {
    throw new HttpError(403, 'Only SUPERADMIN can perform this action.');
  }

  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Application not found');

  const nextLevel =
    input.level !== undefined ? resolveAssignedPlayerLevel(input.level, existing.level) : existing.level;

  const existingPay = String(existing.paymentStatus || 'PENDING').toUpperCase();
  const resolvedFee =
    isSuperAdminUser && input.entryFee !== undefined
      ? input.entryFee
      : existingPay === 'FREE'
        ? 0
        : (existing.entryFee ?? 100000);

  let promoted = false;
  const updated = await prisma.$transaction(async (tx) => {
    const updateData: Record<string, any> = {};
    if (input.level !== undefined) updateData.level = nextLevel;
    if (input.reviewNotes !== undefined) updateData.reviewNotes = input.reviewNotes;
    if (input.coachNotes !== undefined) updateData.coachNotes = input.coachNotes;
    if (isSuperAdminUser && input.entryFee !== undefined) updateData.entryFee = input.entryFee;

    if (targetStatus !== undefined) {
      updateData.status = targetStatus as any;
      if (targetStatus === 'APPROVED') {
        updateData.approvedAt = existing.approvedAt ?? new Date();
        updateData.entryFee = resolvedFee;
      } else {
        updateData.approvedAt = null;
      }
    }

    const appUpdated = await tx.memberApplication.update({
      where: { id },
      data: updateData,
    });

    if (targetStatus === 'APPROVED') {
      promoted = await promoteApplicationToPlayerIfNeeded(tx, { ...existing, level: nextLevel });
    }
    return appUpdated;
  });

  if (promoted) {
    invalidateCache(['players', 'home']);
  }

  return toApplicationDto(updated, isSuperAdminUser);
}

export async function updateApplicationEntryFee(id: string, entryFee: number) {
  const existing = await prisma.memberApplication.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Application not found');
  const updated = await prisma.memberApplication.update({
    where: { id },
    data: { entryFee },
  });
  return toApplicationDto(updated, true);
}

export async function updateApplicationPaymentStatus(id: string, paymentStatus: 'PENDING' | 'PAID' | 'FREE') {
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Application not found');

  const now = new Date();
  if (paymentStatus === 'PENDING') {
    const restoredFee = existing.entryFee > 0 ? existing.entryFee : 100000;
    const updated = await prisma.memberApplication.update({
      where: { id },
      data: { paymentStatus: 'PENDING', paidAt: null, entryFee: restoredFee },
    });
    return toApplicationDto(updated, true);
  }

  const nextEntryFee = paymentStatus === 'FREE' ? 0 : existing.entryFee > 0 ? existing.entryFee : 100000;
  const updated = await prisma.memberApplication.update({
    where: { id },
    data: {
      paymentStatus,
      paidAt: existing.paidAt ?? now,
      entryFee: nextEntryFee,
    },
  });
  return toApplicationDto(updated, true);
}

export async function evaluateApplication(
  id: string,
  input: { scores: any; coachNotes?: string; status: 'APPROVED' | 'RETEST' | 'REJECTED'; level?: string },
  actor: { fullName?: string; role?: string },
  isSuperAdminUser: boolean
) {
  assertCanRejectApplication(isSuperAdminUser, input.status);
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Application not found');

  const resolvedLevel = resolveAssignedPlayerLevel(input.level, existing.level);
  const now = new Date();
  const scoresPayload = {
    ...input.scores,
    evaluatedBy: actor.fullName || actor.role || 'Coach',
    evaluatedAt: now.toISOString(),
  };

  let promoted = false;
  const updated = await prisma.$transaction(async (tx) => {
    const appUpdated = await tx.memberApplication.update({
      where: { id },
      data: {
        level: resolvedLevel,
        evaluationScores: scoresPayload as any,
        coachNotes: input.coachNotes !== undefined ? input.coachNotes : existing.coachNotes,
        status: input.status,
        ...(input.status === 'APPROVED' ? { approvedAt: existing.approvedAt ?? now } : { approvedAt: null }),
      },
    });
    if (input.status === 'APPROVED') {
      promoted = await promoteApplicationToPlayerIfNeeded(tx, { ...existing, level: resolvedLevel });
    }
    return appUpdated;
  });

  if (promoted) {
    invalidateCache(['players', 'home']);
  }
  return toApplicationDto(updated, isSuperAdminUser);
}

export async function sendTryoutEmail(
  id: string,
  body: Record<string, any>,
  kind: 'SCHEDULE' | 'RESULT',
  actor: { fullName?: string; role?: string },
  isSuperAdminUser: boolean
) {
  const existing = await prisma.memberApplication.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Application not found');

  const resolvedRecipient =
    isSuperAdminUser && body.toEmail && body.toEmail.trim()
      ? body.toEmail.trim().toLowerCase()
      : (existing.gmail || '').trim().toLowerCase();

  if (!resolvedRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedRecipient)) {
    throw new HttpError(400, 'Ứng viên chưa có địa chỉ email hợp lệ trong hệ thống.');
  }

  const now = new Date();

  if (kind === 'SCHEDULE') {
    if (existing.status === 'APPROVED') {
      throw new HttpError(400, 'Hồ sơ đã được APPROVED — không cần gửi lịch hẹn Try-Out.');
    }

    const date = body.date;
    const timeSlot = (body.timeSlot || '').trim();
    const notes = body.notes || '';
    if (!date || !timeSlot) {
      throw new HttpError(400, 'Vui lòng chọn ngày và khung giờ hẹn Try-Out.');
    }

    const dayInfo = getTryoutDayInfo(date);
    if (!dayInfo.valid) {
      throw new HttpError(400, 'Ngày hẹn Try-Out không hợp lệ.');
    }

    const mailResult = await sendTryoutInvitationEmail({
      applicationId: existing.id,
      fullName: existing.fullName,
      position: existing.position,
      level: existing.level,
      phone: existing.zalo,
      toEmail: resolvedRecipient,
      date,
      timeSlot,
      notes,
      paymentStatus: existing.paymentStatus || 'PENDING',
    });

    const prevHistory = Array.isArray(existing.scheduleHistory) ? existing.scheduleHistory : [];
    const nextEntry = {
      date,
      dayLabel: dayInfo.combinedLabel,
      timeSlot,
      notes,
      toEmail: resolvedRecipient,
      sentAt: now.toISOString(),
      sentBy: actor.fullName || actor.role || 'Admin',
      emailSent: mailResult.sent,
    };

    const scheduledAtDate = new Date(`${date}T00:00:00+07:00`);
    const updated = await prisma.memberApplication.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: Number.isNaN(scheduledAtDate.getTime()) ? now : scheduledAtDate,
        scheduledDate: date,
        scheduledDayLabel: dayInfo.combinedLabel,
        scheduledTime: timeSlot,
        scheduledNotes: notes || null,
        scheduledEmailSentAt: now,
        scheduleHistory: [nextEntry, ...prevHistory].slice(0, 20) as any,
      },
    });

    return {
      success: true,
      emailSent: mailResult.sent,
      emailError: mailResult.error,
      message: mailResult.sent
        ? isSuperAdminUser
          ? `Đã gửi thư mời Try-Out tới ${resolvedRecipient} (${dayInfo.viDay} ${dayInfo.formattedDate} · ${timeSlot}).`
          : `Đã gửi thư mời Try-Out cho ${existing.fullName} (${dayInfo.viDay} ${dayInfo.formattedDate} · ${timeSlot}).`
        : `Đã lưu lịch hẹn Try-Out cho ${existing.fullName} (Email chưa gửi được: ${mailResult.error || 'Chưa cấu hình Resend'}).`,
      application: toApplicationDto(updated, isSuperAdminUser),
    };
  }

  // kind === 'RESULT'
  const requestedOutcome = body.outcome as 'APPROVED' | 'REJECTED' | undefined;
  const resolvedOutcome: 'APPROVED' | 'REJECTED' | null =
    requestedOutcome ||
    (existing.status === 'APPROVED' || existing.status === 'REJECTED' ? existing.status : null);

  assertCanRejectApplication(isSuperAdminUser, requestedOutcome, resolvedOutcome);

  if (!resolvedOutcome) {
    throw new HttpError(400, 'Vui lòng chấm điểm hoặc chọn kết luận (APPROVED / REJECTED) trước khi gửi mail kết quả.');
  }

  const resolvedLevel = resolveAssignedPlayerLevel(body.level, existing.level);
  const resolvedScores =
    body.scores ||
    (existing.evaluationScores && typeof existing.evaluationScores === 'object'
      ? (existing.evaluationScores as any)
      : null);
  const resolvedCoachNotes = body.coachNotes !== undefined ? body.coachNotes : existing.coachNotes ?? '';

  const scoresWithMeta = body.scores
    ? {
        ...body.scores,
        evaluatedBy: actor.fullName || actor.role || 'Coach',
        evaluatedAt: now.toISOString(),
      }
    : existing.evaluationScores;

  const mailResult = await sendTryoutResultEmail({
    applicationId: existing.id,
    fullName: existing.fullName,
    position: existing.position,
    level: resolvedLevel,
    toEmail: resolvedRecipient,
    outcome: resolvedOutcome,
    scores: resolvedScores,
    coachNotes: resolvedCoachNotes,
  });

  const prevResHistory = Array.isArray(existing.resultEmailHistory) ? existing.resultEmailHistory : [];
  const nextResEntry = {
    outcome: resolvedOutcome,
    level: resolvedLevel,
    coachNotes: resolvedCoachNotes,
    toEmail: resolvedRecipient,
    sentAt: now.toISOString(),
    sentBy: actor.fullName || actor.role || 'Admin',
    emailSent: mailResult.sent,
  };

  let promoted = false;
  const updated = await prisma.$transaction(async (tx) => {
    const appUpdated = await tx.memberApplication.update({
      where: { id },
      data: {
        level: resolvedLevel,
        status: resolvedOutcome,
        ...(scoresWithMeta ? { evaluationScores: scoresWithMeta as any } : {}),
        ...(resolvedCoachNotes !== undefined ? { coachNotes: resolvedCoachNotes || null } : {}),
        ...(resolvedOutcome === 'APPROVED' ? { approvedAt: existing.approvedAt ?? now } : { approvedAt: null }),
        resultEmailSentAt: now,
        resultEmailHistory: [nextResEntry, ...prevResHistory].slice(0, 20) as any,
      },
    });
    if (resolvedOutcome === 'APPROVED') {
      promoted = await promoteApplicationToPlayerIfNeeded(tx, { ...existing, level: resolvedLevel });
    }
    return appUpdated;
  });

  if (promoted) {
    invalidateCache(['players', 'home']);
  }

  return {
    success: true,
    emailSent: mailResult.sent,
    emailError: mailResult.error,
    message: mailResult.sent
      ? isSuperAdminUser
        ? `Đã gửi email kết quả (${resolvedOutcome}) tới ${resolvedRecipient}.`
        : `Đã gửi email kết quả (${resolvedOutcome}) cho ${existing.fullName} thành công!`
      : `Đã lưu kết quả ${resolvedOutcome} cho ${existing.fullName} (Email chưa gửi được: ${mailResult.error || 'Chưa cấu hình Resend'}).`,
    application: toApplicationDto(updated, isSuperAdminUser),
  };
}

export async function deleteApplication(id: string) {
  const existing = await prisma.memberApplication.findUnique({ where: { id }, select: { id: true } });
  if (existing) await prisma.memberApplication.delete({ where: { id } });
  return { success: true, message: 'Application deleted' };
}
