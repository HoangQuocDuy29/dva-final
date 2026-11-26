# Feature Specification: Public Site Spatial Glassmorphism Unification

**Feature ID**: `012-public-spatial-glassmorphism`  
**Created**: 2026-11-26  
**Status**: Implemented & Verified  

## 1. Objective
Unify all public-facing pages (`HomePage`, `PlayersPage`, `TournamentsPage`, `TrainingPage`, `CourtBookingPage`, `CourtMapPage`, `NewsPage`, `InformationPage`, `SkillLevelsPage`) and the global `Layout` / `Navbar` to **Spatial Dark Mode Glassmorphism** matching the multi-role Dashboard (Spec 011).

## 2. Zero-Bloat Constraints
- **No new React components**, **no page layout rewrites**, **no new npm dependencies**.
- Define 3 shared CSS component utilities in `src/index.css` (`@layer components`): `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-pill`.
- Keep total source code changes strictly **under 90 lines**.

## 3. Scope
1. **Shared Glass Utilities (`src/index.css`)**: `.dva-glass-panel`, `.dva-glass-card`, `.dva-glass-pill`.
2. **Global Ambient Mesh & Floating Glass Navbar (`src/App.tsx`, `src/components/layout/Navbar.tsx`)**:
   - `#0B0D12` root surface + 2 subtle ambient orbs (`pointer-events-none blur-[140px] opacity-20`, `bg-orange-500` & `bg-rose-600`).
   - Floating pill `Navbar` (`rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/15`, `12px` top offset on desktop, responsive on mobile).
3. **Public Page Card & Filter Surface Sync**:
   - Replace opaque dark card/filter/header backgrounds with `.dva-glass-card`, `.dva-glass-panel`, and `.dva-glass-pill` across `HomePage`, `PlayersPage`, `TournamentsPage` + all `src/components/tournaments/*` views (`PoolStandingsTable` transparent `thead`/`tr`, `MatchScoreboardRow`, `TournamentScheduleView`, `TournamentOverviewView`, `TournamentBracketView`, `TournamentRulesAndOfficialsView`, `TeamRosterDrawer`), `TrainingPage`, `CourtBookingPage`, `CourtMapPage` (non-sticky glass filter panel, glass map/list wrapper, venue cards, glass drawer/bottom sheet, 4-step guide & pin legend cards), `CourtClubDetailPage`, `ShopPage`, `NewsPage`, `InformationPage`, `SkillLevelsPage`, `Footer` (transparent shell, glass VietQR card, pill quick links, glass map frame with floating `Mở trong Maps` pill), and circular `BackToTop`.
   - Outer `<header>` in `Navbar.tsx` uses `bg-transparent border-none pointer-events-none` with permanent floating pill (`mt-3 rounded-full bg-[#0B0D12]/70 backdrop-blur-2xl border border-white/15`) so no top horizontal seam appears at `scrollY === 0`.

## 4. Verification
- Zero TypeScript errors (`npx tsc --noEmit`).
- Clean production build (`npm run build`).
- Total `src/` diff strictly < 90 lines.
