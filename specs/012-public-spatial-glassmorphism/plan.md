# Implementation Plan: Public Site Spatial Glassmorphism Unification

**Spec Reference**: `specs/012-public-spatial-glassmorphism/spec.md`

## Approach (Surgical, < 90 Lines Total in `src/`)
1. **`src/index.css`** (~13 lines): Add `@layer components` defining `.dva-glass-panel`, `.dva-glass-card`, and `.dva-glass-pill`.
2. **`src/App.tsx`** (~6 lines): Switch root surface to `#0B0D12` and mount 2 fixed ambient light orbs (`orange-500`, `rose-600`, `pointer-events-none blur-[140px] opacity-20`).
3. **`src/components/layout/Navbar.tsx`** (~4 lines): Style public Navbar container as a floating rounded-full glass pill (`pt-2 sm:pt-3`, `rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/15`).
4. **Public Pages** (~45 lines total across 9 files): Swap opaque card/filter backgrounds for `.dva-glass-card`, `.dva-glass-panel`, and `.dva-glass-pill` on:
   - `HomePage.tsx` (Leadership, hero panel, services, courts, news cards)
   - `PlayersPage.tsx` (`PlayerCard`, filter panel, position/rank pills)
   - `TournamentsPage.tsx` (main tournament panel & sub-view tab pills)
   - `TrainingPage.tsx` (level filter pills, course cards, coach cards)
   - `CourtBookingPage.tsx` (court cards & booking panels)
   - `CourtMapPage.tsx` (venue cards & filter controls)
   - `NewsPage.tsx` (category pill bar & article cards)
   - `InformationPage.tsx` (fee cards, schedule table, rules cards, map panel)
   - `SkillLevelsPage.tsx` (language pill, USAV tier cards, squad equivalence cards)
5. **Verification**: Check `git diff --stat src/` (< 90 lines), run `npx tsc --noEmit`, run `npm run build`, and sync `ARCHITECTURE.md`.
