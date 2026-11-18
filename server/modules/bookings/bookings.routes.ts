import crypto from 'crypto';
import { Router } from 'express';
import { env } from '../../config/env';
import { isStaff, isSuperAdmin } from '../../middlewares/auth.middleware';
import { requireSuperAdmin } from '../../middlewares/rbac.middleware';
import {
  ah,
  publicWriteLimiter,
  vietQrLimiter,
  webhookLimiter,
} from '../../middlewares/error.middleware';
import { applyPublicCacheHeaders } from '../../utils/cache';
import { sanitize } from '../../utils/validation';
import {
  BOOKING_CREATE_SCHEMA,
  BOOKING_STATUS_SCHEMA,
  BOOKING_UPDATE_SCHEMA,
  CLOSED_SLOT_TOGGLE_SCHEMA,
  COURSE_SCHEMA,
  COURT_MAINTENANCE_TOGGLE_SCHEMA,
  COURT_SCHEMA,
  GUEST_SESSION_CREATE_SCHEMA,
  GUEST_SESSION_STATUS_SCHEMA,
  TRAINING_REGISTER_SCHEMA,
  TRAINING_REGISTRATION_STATUS_SCHEMA,
  VIETQR_GENERATE_SCHEMA,
  VISIBILITY_TOGGLE_SCHEMA,
} from '../../utils/schemas';
import { parseSlotLabel } from '../../../src/shared/schedule';
import {
  confirmBookingPayment,
  createAndSendGuestSessionEmail,
  createBooking,
  createCourt,
  createTrainingCourse,
  deleteBooking,
  deleteCourt,
  deleteGuestSession,
  deleteTrainingCourse,
  deleteTrainingRegistration,
  generateVietQrPayload,
  listBookings,
  listClosedSlots,
  listCourts,
  listGuestSessions,
  listTrainingCourses,
  listTrainingRegistrations,
  processPaymentWebhook,
  registerTraining,
  toggleClosedSlot,
  toggleCourtMaintenance,
  toggleTrainingCourseVisibility,
  updateBooking,
  updateBookingStatus,
  updateCourt,
  updateGuestSessionStatus,
  updateTrainingCourse,
  updateTrainingRegistrationStatus,
} from './bookings.service';

export const bookingsRouter = Router();

// Courts
bookingsRouter.get(
  '/courts',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 120, swrSec: 300 });
    const courts = await listCourts(staff);
    res.json(courts);
  })
);

bookingsRouter.post(
  '/courts',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, COURT_SCHEMA, { required: ['name'] });
    const created = await createCourt(data);
    res.status(201).json(created);
  })
);

bookingsRouter.put(
  '/courts/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, COURT_SCHEMA, { partial: true });
    const updated = await updateCourt(req.params.id, data);
    res.json(updated);
  })
);

bookingsRouter.patch(
  '/courts/:id/toggle-maintenance',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, COURT_MAINTENANCE_TOGGLE_SCHEMA, { partial: true });
    const result = await toggleCourtMaintenance(req.params.id, data);
    res.json(result);
  })
);

bookingsRouter.delete(
  '/courts/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteCourt(req.params.id);
    res.json(result);
  })
);

bookingsRouter.get(
  '/courts/closed-slots',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 15, swrSec: 30 });
    const slots = await listClosedSlots(
      {
        courtId: typeof req.query.courtId === 'string' ? req.query.courtId : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        subCourt: typeof req.query.subCourt === 'string' ? req.query.subCourt : undefined,
      },
      staff
    );
    res.json(slots);
  })
);

bookingsRouter.post(
  '/courts/closed-slots/toggle',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, CLOSED_SLOT_TOGGLE_SCHEMA, {
      required: ['courtId', 'date', 'slotLabel'],
    });
    const closedBy = req.user?.fullName || 'Admin';
    const result = await toggleClosedSlot(data as any, closedBy);
    res.json(result);
  })
);

// Bookings
bookingsRouter.get(
  '/bookings',
  ah(async (req, res) => {
    const superAdmin = isSuperAdmin(req.user);
    applyPublicCacheHeaders(res, superAdmin, { maxAgeSec: 10, swrSec: 20 });
    const result = await listBookings(
      {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        courtId: typeof req.query.courtId === 'string' ? req.query.courtId : undefined,
      },
      superAdmin
    );
    res.json(result);
  })
);

bookingsRouter.post(
  ['/bookings', '/courts/book'],
  publicWriteLimiter,
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    const rawBody = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const parsedTimeSlot = typeof rawBody.timeSlot === 'string' ? parseSlotLabel(rawBody.timeSlot) : null;
    const sanitizedInput = {
      courtId: rawBody.courtId,
      subCourt: rawBody.subCourt,
      customerName: rawBody.customerName,
      customerEmail: rawBody.customerEmail,
      customerPhone: rawBody.customerPhone,
      bookingDate: rawBody.bookingDate ?? rawBody.date,
      startTime: rawBody.startTime ?? parsedTimeSlot?.start,
      endTime: rawBody.endTime ?? parsedTimeSlot?.end,
      addons: rawBody.addons,
      notes: rawBody.notes,
    };

    const data = sanitize(sanitizedInput, BOOKING_CREATE_SCHEMA, {
      required: ['courtId', 'customerName', 'customerEmail', 'customerPhone', 'bookingDate', 'startTime', 'endTime'],
    });
    const dto = await createBooking(data, rawBody.addons, staff);
    res.status(201).json(dto);
  })
);

bookingsRouter.patch(
  '/bookings/:id/status',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { paymentStatus } = sanitize(req.body, BOOKING_STATUS_SCHEMA, { required: ['paymentStatus'] });
    const dto = await updateBookingStatus(req.params.id, paymentStatus);
    res.json(dto);
  })
);

bookingsRouter.post(
  '/bookings/:id/confirm-payment',
  ah(async (req, res) => {
    const result = await confirmBookingPayment(req.params.id);
    res.json(result);
  })
);

bookingsRouter.put(
  '/bookings/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, BOOKING_UPDATE_SCHEMA, { partial: true });
    const dto = await updateBooking(req.params.id, data);
    res.json(dto);
  })
);

bookingsRouter.delete(
  '/bookings/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteBooking(req.params.id);
    res.json(result);
  })
);

// Training Courses & Registrations
bookingsRouter.get(
  '/training/courses',
  ah(async (req, res) => {
    const staff = isStaff(req.user);
    applyPublicCacheHeaders(res, staff, { maxAgeSec: 60, swrSec: 180 });
    const courses = await listTrainingCourses({
      staff,
      all: typeof req.query.all === 'string' ? req.query.all : undefined,
      isActive: typeof req.query.isActive === 'string' ? req.query.isActive : undefined,
    });
    res.json(courses);
  })
);

bookingsRouter.post(
  '/training/courses',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body, COURSE_SCHEMA, { required: ['title'] });
    const created = await createTrainingCourse(data);
    res.status(201).json(created);
  })
);

const handleUpdateCourse = ah(async (req, res) => {
  const data = sanitize(req.body, COURSE_SCHEMA, { partial: true });
  const updated = await updateTrainingCourse(req.params.id, data);
  res.json(updated);
});

bookingsRouter.put('/training/courses/:id', requireSuperAdmin, handleUpdateCourse);
bookingsRouter.patch('/training/courses/:id', requireSuperAdmin, handleUpdateCourse);

bookingsRouter.patch(
  '/training/courses/:id/visibility',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, VISIBILITY_TOGGLE_SCHEMA, { partial: true });
    const updated = await toggleTrainingCourseVisibility(req.params.id, data.isActive);
    res.json(updated);
  })
);

bookingsRouter.delete(
  '/training/courses/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTrainingCourse(req.params.id);
    res.json(result);
  })
);

bookingsRouter.get(
  '/training/registrations',
  requireSuperAdmin,
  ah(async (_req, res) => {
    const regs = await listTrainingRegistrations();
    res.json(regs);
  })
);

bookingsRouter.post(
  '/training/register',
  publicWriteLimiter,
  ah(async (req, res) => {
    const data = sanitize(req.body, TRAINING_REGISTER_SCHEMA, { required: ['courseId', 'fullName', 'phone'] });
    const result = await registerTraining(data);
    res.status(200).json(result);
  })
);

bookingsRouter.patch(
  '/training/registrations/:id/status',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { status } = sanitize(req.body, TRAINING_REGISTRATION_STATUS_SCHEMA, { required: ['status'] });
    const updated = await updateTrainingRegistrationStatus(req.params.id, status);
    res.json(updated);
  })
);

bookingsRouter.delete(
  '/training/registrations/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteTrainingRegistration(req.params.id);
    res.json(result);
  })
);

// Guest Sessions
bookingsRouter.get(
  '/admin/guest-sessions',
  requireSuperAdmin,
  ah(async (req, res) => {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const rows = await listGuestSessions(statusFilter);
    res.json(rows);
  })
);

bookingsRouter.patch(
  '/admin/guest-sessions/:id/status',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { paymentStatus } = sanitize(req.body, GUEST_SESSION_STATUS_SCHEMA, { required: ['paymentStatus'] });
    const updated = await updateGuestSessionStatus(req.params.id, paymentStatus);
    res.json(updated);
  })
);

bookingsRouter.delete(
  '/admin/guest-sessions/:id',
  requireSuperAdmin,
  ah(async (req, res) => {
    const result = await deleteGuestSession(req.params.id);
    res.json(result);
  })
);

bookingsRouter.post(
  '/admin/send-guest-session-email',
  requireSuperAdmin,
  ah(async (req, res) => {
    const data = sanitize(req.body ?? {}, GUEST_SESSION_CREATE_SCHEMA, {
      required: ['guestEmail', 'fullName', 'phone', 'sessionDate', 'sessionTime', 'amount'],
    });
    const result = await createAndSendGuestSessionEmail(data);
    if (result.duplicateDetected) {
      return res.status(409).json({
        error: result.error,
        duplicateDetected: true,
        existingSession: result.existingSession,
      });
    }
    return res.json(result);
  })
);

// VietQR & Webhook
bookingsRouter.post('/vietqr/generate', vietQrLimiter, (req, res) => {
  const { amount, bookingCode, description } = sanitize(req.body, VIETQR_GENERATE_SCHEMA, { required: ['amount'] });
  res.json(generateVietQrPayload(amount, bookingCode, description));
});

bookingsRouter.post(
  '/webhooks/payment',
  webhookLimiter,
  ah(async (req, res) => {
    const expectedApiKey = env.paymentWebhookApiKey;
    const authHeader = String(req.headers.authorization || '').trim();
    const headerToken = authHeader.replace(/^(Bearer|Apikey|Token)\s+/i, '').trim();
    const altToken = String(
      req.headers['secure-token'] || req.headers['x-api-key'] || req.headers['api-key'] || ''
    ).trim();
    const providedToken = headerToken || altToken;

    if (!expectedApiKey) {
      console.error('[Payment Webhook Security Error] PAYMENT_WEBHOOK_API_KEY is not configured on the server.');
      return res.status(503).json({ success: false, message: 'Webhook endpoint not configured' });
    }

    const expectedBuf = Buffer.from(expectedApiKey);
    const providedBuf = Buffer.from(providedToken);
    const isTokenValid = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!providedToken || !isTokenValid) {
      return res.status(401).json({ success: false, message: 'Unauthorized webhook token' });
    }

    const result = await processPaymentWebhook(req.body);
    return res.status(result.statusCode).json(result.body);
  })
);
