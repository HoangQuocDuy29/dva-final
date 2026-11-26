import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from 'lucide-react';
import { ContactBanner } from '../components/common/ContactBanner';
import {
  DVA_SQUAD_USAV_MAPPING,
  SKILL_RANK_DVA_HINT,
  SKILL_RANK_LIST,
  type SkillRank,
} from '../shared/skillRanks';

type PageLang = 'vi' | 'en';

interface LevelCopy {
  tierTag: string;
  label: string;
  description: string;
  highlights: readonly string[];
}

interface PageContent {
  breadcrumbParent: string;
  breadcrumbCurrent: string;
  tierCountBadge: string;
  title: string;
  introPrefix: string;
  introFederation: string;
  introMid: string;
  introChampionship: string;
  introSuffix: string;
  progressionLabel: string;
  citationEyebrow: string;
  citationBodyPrefix: string;
  citationBodyMid: string;
  citationBodySuffix: string;
  citationHint: string;
  btnRules: string;
  btnManual: string;
  sectionTitle: string;
  sectionSubtitle: string;
  viewRosterCta: string;
  squadMapTitle: string;
  squadMapSubtitle: string;
  squadMapApplyCta: string;
  levels: Record<SkillRank, LevelCopy>;
  ctaBadge: string;
  ctaTitle: string;
  ctaDesc: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

const CONTENT: Record<PageLang, PageContent> = {
  vi: {
    breadcrumbParent: 'Thông tin',
    breadcrumbCurrent: '🇺🇸 Bảng Phân Cấp Trình Độ (USAV)',
    tierCountBadge: '6 Bậc: C → OPEN',
    title: 'Bảng Phân Cấp Trình Độ Bóng Chuyền Chuẩn Quốc Tế (USAV)',
    introPrefix: 'Hệ thống phân hạng trình độ tại ',
    introFederation: 'Liên đoàn Bóng chuyền Mỹ (USA Volleyball - USAV)',
    introMid: ' — mô hình phân chia hạng câu lạc bộ chính thức tại giải vô địch quốc gia ',
    introChampionship: 'USA Volleyball Open National Championship (Club Divisions: Open, AA, A, BB, B)',
    introSuffix: ' đang được áp dụng rộng rãi tại Bắc Mỹ cũng như cộng đồng bóng chuyền phong trào Việt Nam.',
    progressionLabel: 'Lộ trình phát triển trình độ (Thấp → Đỉnh cao)',
    citationEyebrow: 'Nguồn Tham Chiếu Chính Thức',
    citationBodyPrefix: ' là giải đấu vô địch mở rộng lâu đời và lớn nhất Hoa Kỳ, sử dụng hệ thống phân hạng ',
    citationBodyMid: ' (cùng bậc nhập môn ',
    citationBodySuffix: ') để đảm bảo các trận đấu cân bằng và an toàn.',
    citationHint:
      'Người chơi mới có thể đối chiếu kỹ năng thực tế với bảng 6 bậc bên dưới trước khi đăng ký Tryout hoặc chọn ca giao lưu phù hợp tại DVA.',
    btnRules: '🌐 Quy chế phân hạng USAV Open National Championship',
    btnManual: '📄 Tài liệu điều lệ gốc USAV (PDF)',
    sectionTitle: 'Chi Tiết 6 Bậc Trình Độ Chuẩn USAV (C → OPEN)',
    sectionSubtitle:
      'Đối chiếu kỹ thuật bước 1, phát bóng, di chuyển đội hình và tốc độ chiến thuật để tự định vị chính xác hạng thi đấu của bạn.',
    viewRosterCta: 'Xem Hạng VĐV DVA',
    squadMapTitle: 'Quy Đổi Chuẩn USAV ↔ Đội Hình CLB DVA',
    squadMapSubtitle:
      'Chọn nhanh đội hình phù hợp với mặt bằng trình độ hiện tại của bạn để điền sẵn biểu mẫu đăng ký Tryout.',
    squadMapApplyCta: 'Đăng ký Tryout đội này',
    levels: {
      C: {
        tierTag: 'BẬC 01 · NHẬP MÔN',
        label: 'Recreational (Mới chơi - Giải trí)',
        description:
          'Làm quen luật cơ bản và các động tác đệm, chuyền, đập đơn giản; ưu tiên vui chơi và an toàn.',
        highlights: [
          'Luật cơ bản & an toàn trên sân',
          'Đệm bóng, chuyền & phát bóng căn bản',
          'Ưu tiên tinh thần giao lưu vui vẻ',
        ],
      },
      B: {
        tierTag: 'BẬC 02 · TRUNG CẤP',
        label: 'Trung cấp',
        description:
          'Nắm rõ luật chơi, bắt đầu ổn định hơn ở bước 1 và phát bóng, có thể thực hiện đủ 3 chạm nhưng độ chính xác còn chưa đều.',
        highlights: [
          'Nắm rõ luật thi đấu 6v6',
          'Thực hiện đủ nhịp 3 chạm cơ bản',
          'Bước 1 & phát bóng đang ổn định dần',
        ],
      },
      BB: {
        tierTag: 'BẬC 03 · TRUNG CẤP CAO',
        label: 'Trung cấp cao',
        description:
          'Nắm vững luật kỹ thuật và đội hình/xoay vòng; bước 1 khá ổn định (đưa bóng tương đối chuẩn cho chuyền hai), biết chạy đà đập bóng cơ bản, phát bóng tay cao tương đối ổn định và phối hợp vị trí tốt hơn.',
        highlights: [
          'Thành thạo đội hình & xoay vòng (5-1 / 6-2)',
          'Bước 1 đưa bóng tương đối chuẩn cho chuyền hai',
          'Chạy đà đập cơ bản & phát bóng tay cao ổn định',
        ],
      },
      A: {
        tierTag: 'BẬC 04 · NÂNG CAO',
        label: 'Nâng cao',
        description:
          'Kỹ thuật chắc chắn và đồng đều, bắt bước 1 tốt, tổ chức nhiều bài đánh/chiến thuật hơn, tấn công mạnh và đa dạng, chắn bóng có tổ chức.',
        highlights: [
          'Bước 1 chắc chắn, kỹ thuật đồng đều',
          'Tấn công đa dạng & bài đánh chiến thuật',
          'Hệ thống chắn bóng & bọc lót có tổ chức',
        ],
      },
      AA: {
        tierTag: 'BẬC 05 · BÁN CHUYÊN',
        label: 'Bán chuyên / Rất cao',
        description:
          'Tốc độ bóng nhanh, kỹ năng toàn diện, phát bóng tấn công/nhảy phát mạnh, phối hợp chiến thuật phức tạp và ít lỗi cá nhân.',
        highlights: [
          'Nhịp bóng tốc độ cao & kỹ năng toàn diện',
          'Nhảy phát / phát bóng tấn công uy lực',
          'Phối hợp chiến thuật phức tạp, hạn chế tối đa lỗi cá nhân',
        ],
      },
      OPEN: {
        tierTag: 'BẬC 06 · ĐỈNH CAO',
        label: 'Đỉnh cao / Chuyên nghiệp',
        description:
          'Hạng đấu cao nhất trong hệ thống USAV, quy tụ các vận động viên chuyên nghiệp, tuyển thủ hoặc trình độ thi đấu đỉnh cao.',
        highlights: [
          'Hạng đấu cao nhất hệ thống USA Volleyball',
          'Quy tụ VĐV chuyên nghiệp & tuyển thủ đỉnh cao',
          'Cường độ thi đấu & tư duy chiến thuật ở mức cao nhất',
        ],
      },
    },
    ctaBadge: 'Đánh Giá Năng Lực Trực Tiếp Trên Sân',
    ctaTitle: 'Sẵn Sàng Kiểm Tra Hạng Trình Độ Cùng CLB DVA?',
    ctaDesc:
      'Ban huấn luyện DVA sẽ đánh giá thực tế kỹ năng bước 1, tấn công, chắn bóng và xoay vòng chiến thuật để xếp hạng trình độ USAV & đội hình thi đấu phù hợp nhất cho bạn.',
    ctaPrimary: 'Đăng Ký Tryout DVA Ngay',
    ctaSecondary: 'Xem Lịch Try-Out Hàng Tuần',
  },
  en: {
    breadcrumbParent: 'Information',
    breadcrumbCurrent: '🇺🇸 USAV Skill Levels',
    tierCountBadge: '6 Tiers: C → OPEN',
    title: 'USAV Volleyball Skill Level Classification',
    introPrefix: 'Skill rankings at ',
    introFederation: 'USA Volleyball (USAV)',
    introMid: ' — modeled on the official club divisions of the ',
    introChampionship: 'USA Volleyball Open National Championship (Club Divisions: Open, AA, A, BB, B)',
    introSuffix: ', widely adopted across North America and competitive club volleyball communities.',
    progressionLabel: 'Skill Progression Pathway (Entry → Elite)',
    citationEyebrow: 'Official Reference Standard',
    citationBodyPrefix: ' is the largest and longest-running adult volleyball championship in the United States, structuring club divisions from ',
    citationBodyMid: ' (plus entry-level ',
    citationBodySuffix: ') to keep matches competitive, fair, and safe.',
    citationHint:
      'New players can self-assess against the 6 tiers below before signing up for a DVA tryout or selecting an open scrimmage session.',
    btnRules: '🌐 USAV Open National Championship Divisions',
    btnManual: '📄 Official USAV Championship Manual (PDF)',
    sectionTitle: '6 Official USAV Skill Levels (C → OPEN)',
    sectionSubtitle:
      'Compare first-ball passing, serving consistency, rotational tactics, and tempo to benchmark your competitive division.',
    viewRosterCta: 'View DVA Player Ranks',
    squadMapTitle: 'USAV ↔ DVA Squad Equivalence',
    squadMapSubtitle:
      'Match your current USAV tier to the right DVA squad and pre-fill your tryout registration in one click.',
    squadMapApplyCta: 'Apply for this squad',
    levels: {
      C: {
        tierTag: 'TIER 01 · ENTRY',
        label: 'Recreational',
        description:
          'Learning fundamental rules along with basic passing, setting, and hitting mechanics; focused on fun, safety, and active rallying.',
        highlights: [
          'Core court rules & safe play habits',
          'Basic forearm passing, setting & serving',
          'Social, welcoming recreational environment',
        ],
      },
      B: {
        tierTag: 'TIER 02 · INTERMEDIATE',
        label: 'Intermediate',
        description:
          'Clear grasp of standard rules with steadier serve-receive and serving; regularly executes three-contact plays though consistency still varies.',
        highlights: [
          'Solid command of standard 6v6 rules',
          'Consistent three-contact rally attempts',
          'Developing accuracy in passing & serving',
        ],
      },
      BB: {
        tierTag: 'TIER 03 · UPPER INTERMEDIATE',
        label: 'Upper Intermediate',
        description:
          'Strong grasp of technical rules and rotational systems; reliable first-ball passing to the setter, fundamental approach hitting, consistent overhand serving, and coordinated positional play.',
        highlights: [
          'Proficient in 5-1 / 6-2 rotational systems',
          'Dependable serve-receive passing to target',
          'Structured spike approach & steady overhand serves',
        ],
      },
      A: {
        tierTag: 'TIER 04 · ADVANCED',
        label: 'Advanced',
        description:
          'Well-rounded and consistent mechanics, crisp serve-receive passing, structured offensive combinations, powerful and varied attacks, and organized team blocking.',
        highlights: [
          'High-consistency passing & ball control',
          'Multi-tempo offense & varied hitting angles',
          'Organized double blocking & defensive coverage',
        ],
      },
      AA: {
        tierTag: 'TIER 05 · SEMI-PRO',
        label: 'Semi-Pro / High Level',
        description:
          'Fast-tempo gameplay with complete all-around skills, aggressive jump/topspin serving, complex tactical combinations, and minimal unforced errors.',
        highlights: [
          'High-speed tempo & complete all-around skillset',
          'Aggressive jump serves & terminal attacking',
          'Complex offensive plays with minimal errors',
        ],
      },
      OPEN: {
        tierTag: 'TIER 06 · PINNACLE',
        label: 'Elite / Pro',
        description:
          'The highest competitive tier in the USAV structure, featuring professional athletes, national-level players, and elite tournament competition.',
        highlights: [
          'Highest division in USA Volleyball competition',
          'Professional & national-caliber athletes',
          'Peak match intensity & tactical execution',
        ],
      },
    },
    ctaBadge: 'Live On-Court Skill Assessment',
    ctaTitle: 'Ready to Get Ranked with DVA Volleyball Club?',
    ctaDesc:
      'DVA coaches evaluate live serve-receive, attacking, blocking, and rotational IQ on court to place you in the right USAV rank and squad tier.',
    ctaPrimary: 'Register for DVA Tryout',
    ctaSecondary: 'View Weekly Try-Out Schedule',
  },
};

export const SkillLevelsPage: React.FC = () => {
  const { i18n } = useTranslation('common');
  const [lang, setLang] = useState<PageLang>('vi');

  useEffect(() => {
    const handleGlobalLangChange = (lng: string) => {
      setLang(lng.startsWith('vi') ? 'vi' : 'en');
    };
    i18n.on('languageChanged', handleGlobalLangChange);
    return () => {
      i18n.off('languageChanged', handleGlobalLangChange);
    };
  }, [i18n]);

  const handleSelectLang = (next: PageLang) => {
    setLang(next);
    if ((i18n.language?.startsWith('vi') ? 'vi' : 'en') !== next) {
      void i18n.changeLanguage(next);
    }
  };

  const copy = CONTENT[lang];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white py-10 sm:py-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* Top Bar: Breadcrumb + Single-Language Segmented Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400">
            <Link to="/information" className="hover:text-white transition-colors font-semibold">
              {copy.breadcrumbParent}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-orange-400 font-bold">{copy.breadcrumbCurrent}</span>
          </nav>

          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex items-center p-1 dva-glass-pill shadow-lg"
          >
            <button
              type="button"
              onClick={() => handleSelectLang('vi')}
              aria-pressed={lang === 'vi'}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                lang === 'vi'
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => handleSelectLang('en')}
              aria-pressed={lang === 'en'}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* HERO & INTERNATIONAL ORIGIN BOX */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161F30] via-[#1B1528] to-[#0E1524] border border-blue-500/30 p-6 sm:p-10 shadow-2xl">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/50 text-blue-200 text-[11px] font-black uppercase tracking-widest shadow">
                  <span className="text-base leading-none" aria-hidden="true">🇺🇸</span>
                  <span>USA VOLLEYBALL (USAV) STANDARD</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/70 border border-red-700/60 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                  <Award className="w-3 h-3 text-orange-400" />
                  <span>{copy.tierCountBadge}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight leading-tight">
                {copy.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {copy.introPrefix}
                <strong className="text-white">DVA Volleyball Club</strong>{' '}
                {lang === 'vi' ? 'được xây dựng dựa trên quy chuẩn của ' : 'are anchored to the standards of '}
                <strong className="text-blue-300">{copy.introFederation}</strong>
                {copy.introMid}
                <strong className="text-orange-300">{copy.introChampionship}</strong>
                {copy.introSuffix}
              </p>

              {/* Quick Progression Strip */}
              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  {copy.progressionLabel}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SKILL_RANK_LIST.map((tier, idx) => (
                    <React.Fragment key={tier.code}>
                      <a
                        href={`#rank-${tier.code.toLowerCase()}`}
                        className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-transform hover:scale-105 ${tier.badgeClass}`}
                      >
                        {tier.code}
                      </a>
                      {idx < SKILL_RANK_LIST.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Official USAV Source Citation Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 via-slate-900 to-red-600/30 border border-blue-500/40 flex items-center justify-center text-xl">
                      🇺🇸
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                        {copy.citationEyebrow}
                      </div>
                      <div className="text-sm font-black text-white font-heading">
                        USA Volleyball (USAV)
                      </div>
                    </div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>

                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">USA Volleyball Open National Championship</strong>
                    {copy.citationBodyPrefix}
                    <span className="font-mono font-bold text-amber-300">Open · AA · A · BB · B</span>
                    {copy.citationBodyMid}
                    <span className="font-mono font-bold text-slate-200">C / Recreational</span>
                    {copy.citationBodySuffix}
                  </p>
                  <p className="text-[11px] text-slate-400">{copy.citationHint}</p>
                </div>

                <div className="space-y-2">
                  <a
                    href="https://usavolleyball.org/event/2026-usa-volleyball-open-national-championship/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/50 text-blue-200 hover:text-white text-xs font-bold flex items-center justify-between gap-2 transition-colors"
                  >
                    <span>{copy.btnRules}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <a
                    href="https://usavolleyball.org/wp-content/uploads/2026/02/2026-Adult-Opens-Championship-Manual-FINAL.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-between gap-2 transition-colors"
                  >
                    <span>{copy.btnManual}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 6 SKILL LEVELS TABLE / CARDS (C -> OPEN) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                  {copy.sectionTitle}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">{copy.sectionSubtitle}</p>
            </div>
            <Link
              to="/players"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161F30] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-colors w-fit"
            >
              <Users className="w-3.5 h-3.5 text-orange-400" />
              <span>{copy.viewRosterCta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SKILL_RANK_LIST.map((tier) => {
              const levelCopy = copy.levels[tier.code];
              return (
                <article
                  id={`rank-${tier.code.toLowerCase()}`}
                  key={tier.code}
                  className={`dva-glass-card ${tier.cardBorderClass} p-6 shadow-xl flex flex-col justify-between space-y-4 scroll-mt-24`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                          {levelCopy.tierTag}
                        </span>
                        <h3 className="font-heading font-black text-lg text-white leading-snug">
                          <span className={tier.accentTextClass}>{tier.code}</span> — {levelCopy.label}
                        </h3>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 shadow ${tier.pillBgClass}`}
                      >
                        {tier.code}
                      </span>
                    </div>

                    {/* Skill Meter */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-[#0B0F19] overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${tier.pillBgClass}`}
                          style={{ width: tier.progressWidth }}
                        />
                      </div>
                    </div>

                    <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                      {levelCopy.description}
                    </p>
                  </div>

                  <ul className="space-y-1.5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300">
                    {levelCopy.highlights.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${tier.accentTextClass}`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">
                      {SKILL_RANK_DVA_HINT[tier.code][lang]}
                    </span>
                    <span className={`font-mono font-black ${tier.accentTextClass}`}>USAV {tier.code}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: USAV <-> DVA SQUAD EQUIVALENCE */}
        <section className="space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                {copy.squadMapTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">{copy.squadMapSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {DVA_SQUAD_USAV_MAPPING.map((squad) => (
              <div
                key={squad.level}
                className={`dva-glass-card ${squad.borderClass} p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${squad.badgeClass}`}>
                      {squad.level}
                    </span>
                    <span className={`font-mono text-xs font-black ${squad.accentClass}`}>
                      🇺🇸 USAV {squad.usavRange}
                    </span>
                  </div>
                  <h3 className="font-heading font-black text-lg text-white">
                    {lang === 'vi' ? squad.titleVi : squad.titleEn}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'vi' ? squad.descVi : squad.descEn}
                  </p>
                </div>

                <Link
                  to={`/register?level=${squad.level}`}
                  className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 text-xs font-bold text-slate-200 hover:text-white transition-colors"
                >
                  <span>{copy.squadMapApplyCta}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Banner */}
        <ContactBanner />

        {/* BOTTOM CTA */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161F30] via-[#1B1325] to-[#0E1524] border-2 border-orange-500/40 p-7 sm:p-10 shadow-2xl text-center">
          <div className="absolute -top-20 right-1/4 w-72 h-72 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{copy.ctaBadge}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
              {copy.ctaTitle}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{copy.ctaDesc}</p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/40 hover:scale-[1.02] transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>{copy.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/information/try-out"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-200 bg-[#0E1524] hover:bg-slate-800 border border-slate-700 transition-colors"
              >
                <Target className="w-4 h-4 text-orange-400" />
                <span>{copy.ctaSecondary}</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
