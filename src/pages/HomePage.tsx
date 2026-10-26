import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  UserPlus, 
  Trophy, 
  ShieldCheck, 
  Award, 
  Flame, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Court, Player, NewsPost } from '../types';
import { courtService, playerService, newsService } from '../services/api';
import { INITIAL_COURTS, INITIAL_PLAYERS, INITIAL_NEWS } from '../data/mockData';

interface LeadershipMember {
  name: string;
  badge: string;
  badgeColor: string;
  specialty: string;
  specialtyColor: string;
  description: string;
  roleFooter: string;
  fallbackInitials: string;
  avatarGradient: string;
  hoverBorder: string;
  image?: string;
}

const LEADERSHIP_MEMBERS: LeadershipMember[] = [
  {
    name: 'Hoang Quoc Duy',
    badge: 'Founder & Club Manager',
    badgeColor: 'bg-red-950 text-red-400 border-red-800',
    specialty: 'Operations & Community Lead',
    specialtyColor: 'text-orange-400',
    description: 'Founder and manager of DVA Volleyball Club. Oversees match scheduling, court coordination, and community activities to maintain an accessible, organized playing environment for all members.',
    roleFooter: 'Role : Senior Squad Captain',
    fallbackInitials: 'DUY',
    avatarGradient: 'from-red-600 to-orange-500',
    hoverBorder: 'hover:border-red-500/50',
    image: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792859772/88fd036d-168d-4c9b-b74d-48448e5808da.png',
  },
  {
    name: 'Hoang Manh Kien',
    badge: 'Technical & System Manager',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    specialty: 'Information Technology',
    specialtyColor: 'text-blue-400',
    description: 'Manages the technical infrastructure and digital platforms of DVA. Responsible for system stability, match data tracking, and coordinating technical support during events.',
    roleFooter: 'Role : System Technical',
    fallbackInitials: 'KIEN',
    avatarGradient: 'from-blue-700 to-cyan-600',
    hoverBorder: 'hover:border-blue-500/50',
    image: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792859693/dedfed66-f2fc-44ad-b4d8-e8b4bb66ef24.png',
  },
  {
    name: 'Luong The Phong',
    badge: 'Junior Team Captain',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    specialty: 'Squad Leader & Match Support',
    specialtyColor: 'text-amber-400',
    description: 'Captain of the DVA Junior Team. Leads training drills on the court, supports match organization, and helps connect younger members with club activities.',
    roleFooter: 'Role: Junior Squad Captain',
    fallbackInitials: 'PHONG',
    avatarGradient: 'from-amber-600 to-yellow-500',
    hoverBorder: 'hover:border-amber-500/50',
    image: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792864125/46219df4-39ee-4418-a31d-3c0d69cbf589.png',
  },
  {
    name: 'Tran Cong Huy',
    badge: 'Youth Squad Captain',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    specialty: 'Squad Leader & Youth Development',
    specialtyColor: 'text-emerald-400',
    description: 'Captain of the DVA Youth Team, responsible for leading training sessions, instructing youth athletes on fundamental skills, and fostering team cohesion.',
    roleFooter: 'Role : Youth Squad Captain',
    fallbackInitials: 'HUY',
    avatarGradient: 'from-emerald-600 to-teal-500',
    hoverBorder: 'hover:border-emerald-500/50',
  },
  {
    name: 'Hoang Minh Hieu',
    badge: 'Social Media & Communications',
    badgeColor: 'bg-orange-950 text-orange-300 border-orange-800',
    specialty: 'Media & Community Channels',
    specialtyColor: 'text-orange-400',
    description: 'Manages social media channels and communications for DVA. Captures match photos, posts game schedules, and keeps members updated across club platforms.',
    roleFooter: 'Role: Social Media & Communications',
    fallbackInitials: 'HIEU',
    avatarGradient: 'from-red-600 to-pink-600',
    hoverBorder: 'hover:border-orange-500/50',
    image: 'https://res.cloudinary.com/dsezvx7xf/image/upload/v1792919620/6d3b1902-b8d9-4097-b65e-fca87ecff4aa.png',
  },
];

const LeadershipCard: React.FC<{ member: LeadershipMember }> = ({ member }) => (
  <div
    className={`w-[280px] sm:w-[320px] min-h-[390px] shrink-0 bg-[#121826] rounded-3xl border border-slate-800 p-6 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:shadow-2xl hover:-translate-y-1 ${member.hoverBorder} select-none`}
  >
    <div className="space-y-4">
      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.avatarGradient} overflow-hidden relative flex items-center justify-center font-athletic font-black text-2xl text-white shadow-lg mx-auto`}>
        {member.image ? (
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover relative z-10"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center font-athletic font-black text-2xl text-white">
          {member.fallbackInitials}
        </span>
      </div>

      <div className="text-center space-y-1">
        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border inline-block ${member.badgeColor}`}>
          {member.badge}
        </span>
        <h3 className="font-heading font-black text-lg text-white">
          {member.name}
        </h3>
        <p className={`text-[11px] font-semibold ${member.specialtyColor}`}>
          {member.specialty}
        </p>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed text-center">
        {member.description}
      </p>
    </div>

    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-center text-slate-500 font-mono">
      {member.roleFooter}
    </div>
  </div>
);

export const HomePage: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [news, setNews] = useState<NewsPost[]>(INITIAL_NEWS);

  // Leadership slider refs & state
  const sliderRef = useRef<HTMLDivElement>(null);
  const setMeasureRef = useRef<HTMLDivElement>(null);
  const [singleSetWidth, setSingleSetWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isHoveredRef = useRef(false);
  const isInteractingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const currentScrollPosRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Measure single set width on mount and on resize
  useEffect(() => {
    const updateWidth = () => {
      if (setMeasureRef.current) {
        const width = setMeasureRef.current.offsetWidth;
        if (width > 0) {
          setSingleSetWidth(width);
          if (sliderRef.current && currentScrollPosRef.current === 0) {
            sliderRef.current.scrollLeft = width;
            currentScrollPosRef.current = width;
          }
        }
      }
    };

    updateWidth();
    const timer = setTimeout(updateWidth, 120);
    window.addEventListener('resize', updateWidth);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Smooth continuous auto-sliding loop (moving left to right)
  useEffect(() => {
    if (singleSetWidth <= 0) return;

    let animId: number;
    const speed = 0.7; // pixels per frame

    const step = () => {
      if (!isHoveredRef.current && !isInteractingRef.current && !isDraggingRef.current && sliderRef.current) {
        // Decreasing scrollLeft moves cards visually from Left to Right
        currentScrollPosRef.current -= speed;

        if (currentScrollPosRef.current <= 0) {
          currentScrollPosRef.current += singleSetWidth;
        } else if (currentScrollPosRef.current >= 2 * singleSetWidth) {
          currentScrollPosRef.current -= singleSetWidth;
        }

        sliderRef.current.scrollLeft = currentScrollPosRef.current;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [singleSetWidth]);

  // Global mouse up to reliably stop drag even when releasing outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          isInteractingRef.current = false;
          if (!isHoveredRef.current) {
            setIsPaused(false);
          }
        }, 1500);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Handle user scroll (manual swipe or trackpad)
  const handleSliderScroll = () => {
    const container = sliderRef.current;
    if (!container || singleSetWidth <= 0) return;

    if (isInteractingRef.current || isDraggingRef.current) {
      currentScrollPosRef.current = container.scrollLeft;
    }

    // Seamless infinite wrap during manual scrolling
    if (container.scrollLeft <= 10) {
      container.scrollLeft += singleSetWidth;
      currentScrollPosRef.current = container.scrollLeft;
      if (isDraggingRef.current) {
        startScrollLeftRef.current += singleSetWidth;
      }
    } else if (container.scrollLeft >= 2 * singleSetWidth - 10) {
      container.scrollLeft -= singleSetWidth;
      currentScrollPosRef.current = container.scrollLeft;
      if (isDraggingRef.current) {
        startScrollLeftRef.current -= singleSetWidth;
      }
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = sliderRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    isInteractingRef.current = true;
    setIsPaused(true);
    startXRef.current = e.pageX - container.offsetLeft;
    startScrollLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    sliderRef.current.scrollLeft = startScrollLeftRef.current - walk;
    currentScrollPosRef.current = sliderRef.current.scrollLeft;
  };

  // Mouse hover handlers
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (!isInteractingRef.current && !isDraggingRef.current) {
      setIsPaused(false);
    }
  };

  // Touch swipe handlers
  const handleTouchStart = () => {
    isInteractingRef.current = true;
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleTouchEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
      if (!isHoveredRef.current) {
        setIsPaused(false);
      }
    }, 1500);
  };

  // Manual step button navigation
  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = sliderRef.current;
    if (!container) return;

    isInteractingRef.current = true;
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
      if (!isHoveredRef.current) {
        setIsPaused(false);
      }
    }, 2500);

    const stepOffset = direction === 'left' ? -344 : 344;
    container.scrollBy({ left: stepOffset, behavior: 'smooth' });
  };

  useEffect(() => {
    courtService.getCourts().then((res) => {
      if (Array.isArray(res) && res.length > 0) setCourts(res);
    }).catch(console.error);

    playerService.getPlayers().then((res) => {
      if (Array.isArray(res) && res.length > 0) setPlayers(res);
    }).catch(console.error);

    newsService.getNews().then((res) => {
      if (Array.isArray(res) && res.length > 0) setNews(res);
    }).catch(console.error);
  }, []);

  const seniorCaptain = players.find(p => p.isCaptain || (p as any).captain) || players[0] || INITIAL_PLAYERS[0];
  const featuredPlayers = players.slice(0, 3);
  const latestNews = news.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      
      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#080C14] via-[#0B0F19] to-[#0B0F19] text-white overflow-hidden py-20 lg:py-28 border-b border-slate-800">
        
        {/* Subtle background ambient sports graphics */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-red-600 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-500 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-800/80 px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="tracking-widest uppercase">DVA Volleyball Club · Hanoi Sports Arena</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white font-heading">
                Elite Athleticism. <br />
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                  Championship Mindset.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Connecting Hanoi's vibrant volleyball community with <strong>international players</strong>, offering comprehensive local volleyball services—from high-energy open sessions on tournament-grade <strong>Taraflex courts</strong> to official <strong>Mikasa V200W</strong> match play and professional <strong>5-1 rotational coaching</strong>.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/services/court-booking"
                  className="px-7 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-xl shadow-red-900/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Court Online</span>
                </Link>

                <Link
                  to="/register"
                  className="px-6 py-4 rounded-2xl font-bold text-sm text-white bg-[#161F30] hover:bg-slate-800 border border-slate-700 hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-orange-400" />
                  <span>Join DVA Squad</span>
                </Link>
              </div>

              {/* Guarantee highlights */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>550,000 VND / Hour (Min 1.5h)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Free Mikasa V200W Match Ball</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant VietQR MB Bank Sync</span>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Card (Court Central + Captain Spotlight) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden bg-[#121826] border border-slate-800 shadow-2xl p-6 space-y-5">
                
                {/* Court illustration graphic */}
                <div className="relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-red-950 via-slate-900 to-[#121826] border border-slate-700/80 flex flex-col justify-between p-5">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider shadow">
                      CENTRAL COURT · SÂN TT
                    </span>
                    <span className="text-xs text-slate-300 font-mono bg-black/50 px-2 py-1 rounded backdrop-blur border border-white/10">
                      Taraflex 7.5mm
                    </span>
                  </div>

                  <div className="my-auto text-center space-y-2">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                    <div className="font-heading font-black text-2xl text-white tracking-wide">
                      DVA SPORTS ARENA
                    </div>
                    <p className="text-xs text-slate-300">
                      1200 Lux Glare-Free Arena Lighting · Antenna Nets
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-300 border-t border-white/10 pt-3">
                    <span className="font-semibold text-orange-400 font-mono">550,000 VND / Hour</span>
                    <span className="text-slate-400">Prime evening slots available</span>
                  </div>
                </div>

                {/* Captain spotlight mini card */}
                <div className="flex items-center gap-4 p-4 bg-[#161F30] rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center font-athletic font-black text-2xl text-white shadow">
                    #1
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{seniorCaptain.fullName}</span>
                      <span className="text-[10px] text-orange-400 bg-orange-950 border border-orange-800 px-1.5 py-0.2 rounded font-bold">Team Captain</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Spike Reach: <strong className="text-white font-mono">{seniorCaptain.spikeTouch}cm</strong> · Block: <strong className="text-white font-mono">{seniorCaptain.blockTouch}cm</strong>
                    </div>
                  </div>
                  <Link
                    to="/players/senior"
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>

      </section>

      {/* QUICK STATS ROW */}
      <section className="bg-[#0E1524] border-b border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="p-5 rounded-2xl bg-[#161F30] border border-slate-800">
              <div className="font-heading font-black text-3xl sm:text-4xl text-red-500 tabular-nums">
                03
              </div>
              <div className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wide">
                 Regulation Courts
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Central Court, Court 1 & 2</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161F30] border border-slate-800">
              <div className="font-heading font-black text-3xl sm:text-4xl text-orange-400 tabular-nums">
                400+
              </div>
              <div className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wide">
                Active Club Athletes
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Senior, Junior & Youth Squads</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161F30] border border-slate-800">
              <div className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums">
                04
              </div>
              <div className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wide">
                National Tier Coaches
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">5-1 System Specialists</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161F30] border border-slate-800">
              <div className="font-heading font-black text-3xl sm:text-4xl text-red-500 tabular-nums">
                270+
              </div>
              <div className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wide">
                Matches / Year
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">League & Tournament Play</div>
            </div>

          </div>
        </div>
      </section>

      {/* 3 REPRESENTATIVE TEAMS (Senior, Junior, Youth - as requested by admin) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-red-500 tracking-wider uppercase">DVA Squads</span>
            <h2 className="text-3xl font-black text-white font-heading mt-1">
              3 Representative Club Squads
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Structured across 3 distinct competitive tiers: Senior (3+ Years Comp Exp), Junior (Intermediate Development), and Youth.
            </p>
          </div>
          <Link
            to="/players"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
          >
            <span>View All Team Rosters</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* TEAM 1: SENIOR SQUAD */}
          <div className="bg-[#131822] rounded-3xl border border-red-900/40 p-6 sm:p-7 shadow-2xl flex flex-col justify-between hover:border-red-500/70 transition-all duration-300 relative group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950 text-red-300 border border-red-700">
                  TIER: SENIOR
                </span>
                <span className="text-xs font-mono font-bold text-orange-400">197 Roster Athletes</span>
              </div>

              <div className="h-40 rounded-2xl overflow-hidden relative bg-gradient-to-br from-red-950 via-slate-900 to-black p-4 flex flex-col justify-between border border-red-900/30">
                <img
                  src="/teams/senior.png"
                  alt="DVA Senior Team"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div className="relative z-10 text-3xl">🏆</div>
                <div className="relative z-10">
                  <h3 className="font-heading font-black text-2xl text-white">
                    DVA Senior Team
                  </h3>
                  <p className="text-xs text-red-300 font-medium">Championship Core Squad</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Elite squad of seasoned athletes with <strong>over 3 years of competitive tournament experience</strong>. Premier team executing high-octane 5-1 offensive rotations and lock-down floor defense.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0c1017] p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Experience:</span>
                  <span className="font-bold text-white">&gt; 3 Years</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Formation:</span>
                  <span className="font-bold text-emerald-400">5-1 & 6-2</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Height:</span>
                  <span className="font-mono font-bold text-white">180 cm</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Spike Reach:</span>
                  <span className="font-mono font-bold text-orange-400">300 cm</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-800">
              <Link
                to="/players/senior"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center block text-white bg-gradient-to-r from-red-600 to-orange-600 hover:brightness-110 transition-all shadow-md"
              >
                View Senior Squad Roster
              </Link>
            </div>
          </div>

          {/* TEAM 2: JUNIOR SQUAD */}
          <div className="bg-[#131822] rounded-3xl border border-blue-900/40 p-6 sm:p-7 shadow-2xl flex flex-col justify-between hover:border-blue-500/70 transition-all duration-300 relative group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-700">
                  TIER: JUNIOR
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">174 Emerging Athletes</span>
              </div>

              <div className="h-40 rounded-2xl overflow-hidden relative bg-gradient-to-br from-blue-950 via-slate-900 to-black p-4 flex flex-col justify-between border border-blue-900/30">
                <img
                  src="/teams/junior.png"
                  alt="DVA Junior Team"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div className="relative z-10 text-3xl">⚡</div>
                <div className="relative z-10">
                  <h3 className="font-heading font-black text-2xl text-white">
                    DVA Junior Team
                  </h3>
                  <p className="text-xs text-blue-300 font-medium">Intermediate Skill Squad</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Dedicated to <strong>intermediate recreational and club players</strong> perfecting first-ball reception platform, approach biomechanics, and tactical 5-1 / 6-2 rotation flow.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0c1017] p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Skill Tier:</span>
                  <span className="font-bold text-white">Intermediate</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tactical System:</span>
                  <span className="font-bold text-cyan-400">5-1</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Height:</span>
                  <span className="font-mono font-bold text-white">170 cm</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Spike Reach:</span>
                  <span className="font-mono font-bold text-cyan-400">280 cm</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-800">
              <Link
                to="/players/junior"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center block text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 transition-all shadow-md"
              >
                View Junior Squad Roster
              </Link>
            </div>
          </div>

          {/* TEAM 3: YOUTH SQUAD */}
          <div className="bg-[#131822] rounded-3xl border border-emerald-900/40 p-6 sm:p-7 shadow-2xl flex flex-col justify-between hover:border-emerald-500/70 transition-all duration-300 relative group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700">
                  TIER: YOUTH
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">20+ Youth Trainees</span>
              </div>

              <div className="h-40 rounded-2xl overflow-hidden relative bg-gradient-to-br from-emerald-950 via-slate-900 to-black p-4 flex flex-col justify-between border border-emerald-900/30">
                <img
                  src="/teams/youth.png"
                  alt="DVA Youth"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <div className="relative z-10 text-3xl">🌱</div>
                <div className="relative z-10">
                  <h3 className="font-heading font-black text-2xl text-white">
                    DVA Youth
                  </h3>
                  <p className="text-xs text-emerald-300 font-medium">Youth</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Nurturing young talents. Developing athletic motor skills, platform fundamentals, quick court reflexes, and teamwork spirit.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0c1017] p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Tier:</span>
                  <span className="font-bold text-emerald-400">Youth</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rotation:</span>
                  <span className="font-bold text-white">4-2</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Avg Height :</span>
                  <span className="font-bold text-white">165 cm</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Environment:</span>
                  <span className="font-bold text-emerald-400">Encouraging & Safe</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-800">
              <Link
                to="/players/youth"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center block text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 transition-all shadow-md"
              >
                View Youth Roster
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* LEADERSHIP, MANAGEMENT & CONTENT CREATOR SHOWCASE */}
      <section className="py-16 bg-[#080C14] border-t border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Leadership & Operations</span>
              <h2 className="text-3xl font-black text-white font-heading mt-1">
                Club Leadership, Technical & Media Team
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                The core team managing club operations, system infrastructure, youth player activities, and community communications at DVA Volleyball Club.
              </p>
            </div>

            {/* Slider Controls & Live Status Pill */}
            <div className="flex items-center gap-3 self-start md:self-end">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#121826] border border-slate-800 text-slate-400 shadow-sm">
                <span className={`w-2 h-2 rounded-full transition-colors ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <span className="hidden sm:inline">{isPaused ? 'Tạm dừng (Rê chuột / Vuốt)' : 'Tự động trượt (Trái → Phải)'}</span>
                <span className="sm:hidden">{isPaused ? 'Tạm dừng' : 'Trượt tự động'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleManualScroll('left')}
                  className="p-2.5 rounded-xl bg-[#121826] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer shadow-md"
                  aria-label="Xem thẻ phía trước"
                  title="Xem thẻ trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleManualScroll('right')}
                  className="p-2.5 rounded-xl bg-[#121826] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer shadow-md"
                  aria-label="Xem thẻ tiếp theo"
                  title="Xem thẻ tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Slider with edge fade masks */}
          <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            {/* Left fade gradient overlay */}
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#080C14] to-transparent z-10 pointer-events-none" />
            {/* Right fade gradient overlay */}
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#080C14] to-transparent z-10 pointer-events-none" />

            <div
              ref={sliderRef}
              onScroll={handleSliderScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="overflow-x-auto scrollbar-none flex cursor-grab active:cursor-grabbing select-none py-4 px-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex">
                {/* Set 0 (Buffer Set for seamless backward wrap) */}
                <div ref={setMeasureRef} className="flex gap-6 shrink-0 pr-6">
                  {LEADERSHIP_MEMBERS.map((member, idx) => (
                    <LeadershipCard key={`set0-${idx}`} member={member} />
                  ))}
                </div>

                {/* Set 1 (Main Set) */}
                <div className="flex gap-6 shrink-0 pr-6">
                  {LEADERSHIP_MEMBERS.map((member, idx) => (
                    <LeadershipCard key={`set1-${idx}`} member={member} />
                  ))}
                </div>

                {/* Set 2 (Buffer Set for seamless forward wrap) */}
                <div className="flex gap-6 shrink-0 pr-6">
                  {LEADERSHIP_MEMBERS.map((member, idx) => (
                    <LeadershipCard key={`set2-${idx}`} member={member} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: COURTS OVERVIEW */}
      <section className="py-16 bg-[#0E1524] border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-red-500 tracking-wider uppercase">Facility Highlights</span>
              <h2 className="text-3xl font-black text-white font-heading mt-1">
                Indoor Courts
              </h2>
            </div>
            <Link
              to="/services/court-booking"
              className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
            >
              <span>Check Time Slots & Rates</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courts.map((court) => (
              <div
                key={court.id}
                className="bg-[#161F30] rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={court.imageUrl}
                      alt={court.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#161F30] via-black/50 to-black/30" />

                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase bg-red-600 text-white shadow-md">
                        {court.code}
                      </span>
                      <span className="font-mono text-xs bg-black/60 backdrop-blur px-2.5 py-0.5 rounded text-orange-400 font-bold border border-orange-500/30">
                        {court.hourlyRate ? `${Math.round(court.hourlyRate / 1000)}k/h` : '500k/h'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-heading font-black text-xl text-white drop-shadow-md">
                        {court.name}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">{court.floorType}</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {court.description}
                    </p>

                    <div className="space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
                      {(court.includes || []).slice(0, 3).map((item: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link
                    to={`/services/court-booking?courtId=${court.id}`}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center block text-white bg-red-600 hover:bg-red-500 transition-colors shadow-md"
                  >
                    Book {court.name.split('(')[0].trim()}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: NEWS TEASER */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-xs font-bold text-red-500 tracking-wider uppercase">Club Bulletin</span>
            <h2 className="text-3xl font-black text-white font-heading mt-1">
              Latest News & Technical Articles
            </h2>
          </div>
          <Link
            to="/news"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
          >
            <span>Read All Articles</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latestNews.map((news) => (
            <article
              key={news.id}
              className="bg-[#161F30] rounded-3xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl space-y-4"
            >
              <div className="space-y-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-red-950 text-red-400 border border-red-800">
                  {news.category}
                </span>
                <h3 className="font-heading font-black text-base text-white hover:text-orange-400 transition-colors">
                  <Link to={`/news/${news.id}`}>{news.title}</Link>
                </h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {news.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500">{news.publishedAt}</span>
                <Link
                  to={`/news/${news.id}`}
                  className="font-bold text-orange-400 hover:underline flex items-center gap-1"
                >
                  <span>Read Story</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
};
