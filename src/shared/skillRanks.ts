export const SKILL_RANKS = ['C', 'B', 'BB', 'A', 'AA', 'OPEN'] as const;

export type SkillRank = (typeof SKILL_RANKS)[number];

export interface SkillRankMeta {
  code: SkillRank;
  order: number;
  labelVi: string;
  labelEn: string;
  tierTag: string;
  descriptionVi: string;
  highlightsVi: string[];
  badgeClass: string;
  cardBorderClass: string;
  pillBgClass: string;
  accentTextClass: string;
  progressWidth: string;
}

export const SKILL_RANK_LIST: readonly SkillRankMeta[] = [
  {
    code: 'C',
    order: 1,
    labelVi: 'Recreational (Mới chơi - Giải trí)',
    labelEn: 'Recreational / Beginner',
    tierTag: 'TIER 01 · ENTRY',
    descriptionVi:
      'Làm quen luật cơ bản và các động tác đệm, chuyền, đập đơn giản; ưu tiên vui chơi và an toàn.',
    highlightsVi: ['Luật cơ bản & an toàn trên sân', 'Đệm bóng, chuyền & phát bóng căn bản', 'Ưu tiên tinh thần giao lưu vui vẻ'],
    badgeClass: 'bg-slate-800/90 text-slate-200 border-slate-500/70 hover:border-slate-300',
    cardBorderClass: 'border-slate-700/80 hover:border-slate-500',
    pillBgClass: 'bg-slate-700 text-white',
    accentTextClass: 'text-slate-300',
    progressWidth: '17%',
  },
  {
    code: 'B',
    order: 2,
    labelVi: 'Trung cấp',
    labelEn: 'Intermediate',
    tierTag: 'TIER 02 · INTERMEDIATE',
    descriptionVi:
      'Nắm rõ luật chơi, bắt đầu ổn định hơn ở bước 1 và phát bóng, có thể thực hiện đủ 3 chạm nhưng độ chính xác còn chưa đều.',
    highlightsVi: ['Nắm rõ luật thi đấu 6v6', 'Thực hiện đủ nhịp 3 chạm cơ bản', 'Bước 1 & phát bóng đang ổn định dần'],
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 hover:border-emerald-300',
    cardBorderClass: 'border-emerald-800/60 hover:border-emerald-500/80',
    pillBgClass: 'bg-emerald-600 text-white',
    accentTextClass: 'text-emerald-400',
    progressWidth: '34%',
  },
  {
    code: 'BB',
    order: 3,
    labelVi: 'Trung cấp cao',
    labelEn: 'Upper Intermediate',
    tierTag: 'TIER 03 · UPPER INTERMEDIATE',
    descriptionVi:
      'Nắm vững luật kỹ thuật và đội hình/xoay vòng; bước 1 khá ổn định (đưa bóng tương đối chuẩn cho chuyền hai), biết chạy đà đập bóng cơ bản, phát bóng tay cao tương đối ổn định và phối hợp vị trí tốt hơn.',
    highlightsVi: ['Thành thạo đội hình & xoay vòng (5-1 / 6-2)', 'Bước 1 đưa bóng tương đối chuẩn cho chuyền hai', 'Chạy đà đập cơ bản & phát bóng tay cao ổn định'],
    badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-500/60 hover:border-sky-300',
    cardBorderClass: 'border-sky-800/60 hover:border-sky-500/80',
    pillBgClass: 'bg-sky-600 text-white',
    accentTextClass: 'text-sky-400',
    progressWidth: '52%',
  },
  {
    code: 'A',
    order: 4,
    labelVi: 'Nâng cao',
    labelEn: 'Advanced',
    tierTag: 'TIER 04 · ADVANCED',
    descriptionVi:
      'Kỹ thuật chắc chắn và đồng đều, bắt bước 1 tốt, tổ chức nhiều bài đánh/chiến thuật hơn, tấn công mạnh và đa dạng, chắn bóng có tổ chức.',
    highlightsVi: ['Bước 1 chắc chắn, kỹ thuật đồng đều', 'Tấn công đa dạng & bài đánh chiến thuật', 'Hệ thống chắn bóng & bọc lót có tổ chức'],
    badgeClass: 'bg-violet-950/90 text-violet-300 border-violet-500/60 hover:border-violet-300',
    cardBorderClass: 'border-violet-800/60 hover:border-violet-500/80',
    pillBgClass: 'bg-violet-600 text-white',
    accentTextClass: 'text-violet-400',
    progressWidth: '70%',
  },
  {
    code: 'AA',
    order: 5,
    labelVi: 'Bán chuyên / Rất cao',
    labelEn: 'Semi-Pro / High Competitive',
    tierTag: 'TIER 05 · SEMI-PRO',
    descriptionVi:
      'Tốc độ bóng nhanh, kỹ năng toàn diện, phát bóng tấn công/nhảy phát mạnh, phối hợp chiến thuật phức tạp và ít lỗi cá nhân.',
    highlightsVi: ['Nhịp bóng tốc độ cao & kỹ năng toàn diện', 'Nhảy phát / phát bóng tấn công uy lực', 'Phối hợp chiến thuật phức tạp, hạn chế tối đa lỗi cá nhân'],
    badgeClass: 'bg-orange-950/90 text-orange-300 border-orange-500/70 hover:border-orange-300',
    cardBorderClass: 'border-orange-700/70 hover:border-orange-500',
    pillBgClass: 'bg-gradient-to-r from-red-600 to-orange-500 text-white',
    accentTextClass: 'text-orange-400',
    progressWidth: '86%',
  },
  {
    code: 'OPEN',
    order: 6,
    labelVi: 'Đỉnh cao / Chuyên nghiệp',
    labelEn: 'Elite / Open Division',
    tierTag: 'TIER 06 · PINNACLE',
    descriptionVi:
      'Hạng đấu cao nhất trong hệ thống USAV, quy tụ các vận động viên chuyên nghiệp, tuyển thủ hoặc trình độ thi đấu đỉnh cao.',
    highlightsVi: ['Hạng đấu cao nhất hệ thống USA Volleyball', 'Quy tụ VĐV chuyên nghiệp & tuyển thủ đỉnh cao', 'Cường độ thi đấu & tư duy chiến thuật ở mức cao nhất'],
    badgeClass:
      'bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-orange-500/25 text-amber-200 border-amber-400/80 hover:border-yellow-300 shadow-sm shadow-amber-500/20',
    cardBorderClass: 'border-amber-500/70 hover:border-amber-400 shadow-lg shadow-amber-950/30',
    pillBgClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950',
    accentTextClass: 'text-amber-300',
    progressWidth: '100%',
  },
] as const;

export const SKILL_RANK_MAP: Record<SkillRank, SkillRankMeta> = SKILL_RANK_LIST.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<SkillRank, SkillRankMeta>
);

export const UNRANKED_BADGE_CLASS =
  'bg-slate-900/80 text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300';

export function normalizeSkillRank(value: unknown): SkillRank | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toUpperCase();
  return (SKILL_RANKS as readonly string[]).includes(clean) ? (clean as SkillRank) : null;
}

export function getSkillRankMeta(rank?: string | null): SkillRankMeta | null {
  const normalized = normalizeSkillRank(rank);
  return normalized ? SKILL_RANK_MAP[normalized] : null;
}

export const RECOMMENDED_SKILL_RANK_PRESETS: readonly string[] = [
  'C',
  'C – B',
  'B',
  'B – BB',
  'BB',
  'BB+',
  'BB – A',
  'A',
  'A+',
  'AA',
  'AA+',
  'OPEN',
] as const;

export function deriveDefaultUsavRangeForLevel(level?: string | null): string {
  const upper = String(level || '').trim().toUpperCase();
  if (upper.includes('SENIOR') || upper.includes('ADVANCED') || upper.includes('PRO')) return 'BB – A+';
  if (upper.includes('YOUTH') || upper.includes('KID') || upper.includes('BEGINNER')) return 'C – B';
  if (upper.includes('JUNIOR') || upper.includes('INTERMEDIATE')) return 'B – BB';
  return 'B – BB';
}

export interface DvaSquadEquivalence {
  level: 'YOUTH' | 'JUNIOR' | 'SENIOR';
  usavRange: string;
  accentClass: string;
  borderClass: string;
  badgeClass: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
}

export const DVA_SQUAD_USAV_MAPPING: readonly DvaSquadEquivalence[] = [
  {
    level: 'YOUTH',
    usavRange: 'C – B',
    accentClass: 'text-emerald-400',
    borderClass: 'border-emerald-700/60 hover:border-emerald-400/80',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70',
    titleVi: 'Đội Hình Youth',
    titleEn: 'Youth Squad',
    descVi: 'Phù hợp người mới tập đến nhập môn phong trào, rèn nền tảng đệm bóng, phát bóng và xoay vòng 4-2.',
    descEn: 'Ideal for developing athletes building passing fundamentals, serving consistency, and 4-2 rotations.',
  },
  {
    level: 'JUNIOR',
    usavRange: 'B – BB',
    accentClass: 'text-sky-400',
    borderClass: 'border-sky-700/60 hover:border-sky-400/80',
    badgeClass: 'bg-sky-950/90 text-sky-300 border-sky-600/70',
    titleVi: 'Đội Hình Junior',
    titleEn: 'Junior Squad',
    descVi: 'Phù hợp trình độ trung cấp đến trung cấp cao, nắm chắc bước 1, chạy đà đập và đội hình 5-1 / 6-2.',
    descEn: 'Built for intermediate to upper-intermediate athletes running structured 5-1 / 6-2 systems.',
  },
  {
    level: 'SENIOR',
    usavRange: 'BB – A / AA',
    accentClass: 'text-orange-400',
    borderClass: 'border-orange-700/70 hover:border-orange-400/80',
    badgeClass: 'bg-orange-950/90 text-orange-300 border-orange-500/70',
    titleVi: 'Đội Hình Senior',
    titleEn: 'Senior Squad',
    descVi: 'Dành cho VĐV phong trào nâng cao đến bán chuyên, tốc độ bóng cao, chiến thuật đa dạng & thi đấu giải.',
    descEn: 'Competitive core for advanced and semi-pro athletes playing fast-tempo tournament volleyball.',
  },
] as const;

export const SKILL_RANK_DVA_HINT: Record<SkillRank, { vi: string; en: string }> = {
  C: { vi: 'Tương đương: Youth', en: 'DVA Fit: Youth' },
  B: { vi: 'Tương đương: Youth / Junior', en: 'DVA Fit: Youth / Junior' },
  BB: { vi: 'Tương đương: Junior / Senior', en: 'DVA Fit: Junior / Senior' },
  A: { vi: 'Tương đương: Senior', en: 'DVA Fit: Senior' },
  AA: { vi: 'Tương đương: Senior (Core)', en: 'DVA Fit: Senior (Core)' },
  OPEN: { vi: 'Tương đương: Senior / Pro', en: 'DVA Fit: Senior / Pro' },
};
