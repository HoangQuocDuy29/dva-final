<!--
Sync Impact Report
- Version change: 0.0.0 (Template) → 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. English-First & 100% English Public UI (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. Backward-Compatible API & Schema Stability (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. PostgreSQL Single Source of Truth & Idempotent Mutations
  - [PRINCIPLE_4_NAME] → IV. Fire-and-Forget Isolation for Third-Party Integrations
  - [PRINCIPLE_5_NAME] → V. Modular Domain Architecture & Living Context Map
- Added sections:
  - Tech Stack & Directory Architecture
  - Non-Breaking Feature Development Workflow
  - Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (reads constitution dynamically at runtime)
  - ✅ .specify/templates/spec-template.md (aligned with Public UI and non-breaking constraints)
  - ✅ .specify/templates/tasks-template.md (aligned with verification and architecture sync steps)
- Follow-up TODOs: None
-->
# DVA Volleyball Club Constitution

## Core Principles

### I. English-First & 100% English Public UI (NON-NEGOTIABLE)
- All public-facing screens and components (`HomePage`, `Navbar`, `Footer`, `NewsPage`,
  `NewsDetailPage`, `TrainingPage`, `CourseDetailModal`, `CourtBookingPage`, `PlayersPage`,
  `InformationPage`, `MemberRegisterPage`, `CountrySelect`, `VietQRModal`, `AuthModal`) MUST
  initialize and render 100% in English (`lng: 'en'`, `fallbackLng: 'en'`).
- All Static UI elements—including headers, footers, navigation items, CTA buttons, form labels,
  category filters, pagination controls, input placeholders, modal titles, and toast/alert
  messages—MUST be written in professional athletic English. Mixing Vietnamese and English on
  public screens is strictly prohibited.
- All Dynamic UI values, seed/fallback datasets (`src/data/mockData.ts`, `data/*.json`), and DTO
  mappers (`lib/prisma.ts`, `src/services/api.ts`) MUST normalize public-facing data to English
  (e.g., billing units `/ player / session`, player positions `Setter`, `Outside Hitter`,
  `Opposite Spiker`, `Middle Blocker`, `Libero`, `Head Coach`, and US English publication dates
  `Month DD, YYYY` via `formatEnglishDate()` parsing `YYYY-MM-DD` in local time to prevent UTC
  day-shift bugs).
- Client internationalization (`src/lib/i18n.ts`, `src/locales/{en,vi}/`) MUST only read explicit
  user selection from `localStorage` (`lookupLocalStorage: 'dva_lang'`) with `'en'` as fallback,
  scoping translations strictly to Static UI without mutating database schemas or API payloads.
- Automated transactional HTML emails sent via Resend (`lib/mailer.ts`) MUST maintain a clear
  bilingual (English - Vietnamese) format to serve both international and domestic club members.

**Rationale**: Ensures a consistent, international-grade user experience across all public touchpoints
while keeping database contracts and bilingual email notifications clean and predictable.

### II. Backward-Compatible API & Schema Stability (NON-NEGOTIABLE)
- Existing REST API routes in `server.ts`, request/response DTO contracts (`lib/schemas.ts`,
  `lib/prisma.ts`, `src/services/api.ts`), and `prisma/schema.prisma` models MUST NOT be broken,
  renamed, or removed during feature development unless explicitly instructed by the user.
- UI display normalization MUST preserve underlying API and database payload values (e.g.,
  `formatSubCourtLabel` displays `Court A` and `Court B` on `CourtBookingPage.tsx` while retaining
  internal values `'Sân A'` and `'Sân B'` for backend compatibility).
- Every endpoint under `/api` MUST obey the Default-Deny access policy (`apiAccessPolicy` in
  `lib/security.ts`), requiring `ADMIN` or `SUPERADMIN` authentication (`Authorization: Bearer <dva_token>`)
  unless explicitly declared in `PUBLIC_RULES`. User deletion and role assignment MUST require
  `SUPERADMIN`.
- Authorized schema updates MUST be applied exclusively via `npm run prisma:push`
  (`prisma db push`). Running `prisma migrate dev` or passing `--accept-data-loss` against the
  shared/production PostgreSQL database is strictly forbidden.

**Rationale**: Protects live club operations, prevents accidental data loss on Render PostgreSQL,
and guarantees that frontend/backend enhancements never break existing integrations.

### III. PostgreSQL Single Source of Truth & Idempotent Mutations
- All business data reads and mutations (`User`, `Player`, `Court`, `ClosedSlot`, `Booking`,
  `CoachProfile`, `TrainingCourse`, `TrainingRegistration`, `MemberApplication`, `NewsPost`,
  `AppConfig`, `GoogleSheetsSyncLog`) MUST run 100% through Prisma ORM v7 against PostgreSQL
  (`lib/prisma.ts`). Writing runtime mutations to local JSON files (`data/*.json`) is prohibited to
  avoid split-brain state and unnecessary disk I/O on ephemeral containers.
- New or updated Prisma queries MUST align `where` and `orderBy` clauses with existing composite
  index prefixes following the `[Equality (=)] -> [Range] -> [ORDER BY]` ordering rule in
  `prisma/schema.prisma`.
- Time-sensitive mutations (court bookings and slot locks) MUST validate conflicts server-side
  (`hasBookingConflict()`, `hasClosedSlotConflict()`) before persisting, and client-side POST
  requests MUST use `deduplicatedPost<T>()` (`src/services/api.ts`) to prevent duplicate submissions
  from double clicks.

**Rationale**: Eliminates race conditions, double bookings, and state divergence while keeping
database queries fast and index-backed.

### IV. Fire-and-Forget Isolation for Third-Party Integrations
- All external side effects—including Resend email dispatch (`lib/mailer.ts`), Google Apps Script
  webhook synchronization (`dispatchGoogleSheetsWebhookAsync` for `DatSan`, `DangKyKhoaHoc`,
  `TuyenThanhVien`, `LienHe`), and external logging—MUST execute asynchronously inside isolated
  `void (async () => { try { ... } catch { ... } })()` blocks.
- Third-party latency, rate limits, or network failures MUST NEVER block the main request thread or
  cause a primary HTTP `200` client response to fail.
- All VietQR transfer content strings (`lib/mailer.ts`, MBBank account `0002090671521` /
  `HOANG QUOC DUY`) MUST pass through `removeVietnameseTones()` before building Quicklink URLs via
  `buildBookingVietQrUrl(amount, transferContent)`.

**Rationale**: Decouples core club transactions from external service availability and guarantees
100% compatibility with Vietnamese banking QR parsers.

### V. Modular Domain Architecture & Living Context Map
- The Admin Dashboard (`src/pages/admin/`) MUST maintain its modular tab-based architecture: a thin
  orchestration shell (`src/pages/admin/AdminDashboardPage.tsx`) lazy-loaded via the 1-line
  re-export at `src/pages/AdminDashboardPage.tsx`, shared state in `AdminDashboardContext.tsx`,
  business logic in domain hooks (`hooks/`), and isolated UI in `tabs/` and `components/`.
- All UI components MUST adhere to the Premium Dark Athletic design system (`#0B0F19` background,
  `#111827` surface card, `#1E293B` border, `#FFFFFF` primary text, `#94A3B8` muted text,
  `#38BDF8` accent blue, `#FACC15` price/value yellow, `#F97316` sport orange, `#8B0000` brand
  cherry) and the single-container transitioning Floating Capsule `Navbar`.
- Any addition or modification to routes, helpers, components, i18n dictionaries, or data flows
  MUST be documented in `./ARCHITECTURE.md` within the same task.

**Rationale**: Prevents regression back to monolithic files, preserves bundle splitting, and keeps
`./ARCHITECTURE.md` reliable as the single context map for engineers and AI agents.

## Tech Stack & Directory Architecture

### Standardized Technology Stack
- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion (Framer Motion v12), Lucide
  React, React Router v7 (`react-router-dom`).
- **Internationalization (i18n)**: `i18next`, `react-i18next`, `i18next-browser-languagedetector`
  (`src/lib/i18n.ts`, English-first `'en'` default, `'en' | 'vi'` toggle cached in `localStorage`
  under `'dva_lang'`, rendered via the Micro Segmented Pill `LanguageSwitcher.tsx`).
- **Backend**: Node.js, Express v4 (`server.ts`), TypeScript, `bcrypt` (10 rounds), HS256 HMAC JWT
  (`dva_token`).
- **Database & ORM**: PostgreSQL (Render) with Prisma ORM v7 (`@prisma/client`,
  `@prisma/adapter-pg`, schema in `prisma/schema.prisma`).
- **Third-Party Services**: Resend API (bilingual transactional emails), Google Apps Script Webhook
  (real-time Google Sheets sync), Cloudinary CDN (image hosting), VietQR Quicklink (MBBank dynamic
  QR generation).

### Canonical Directory Structure
- `src/components/`: Scoped reusable UI components (`auth/`, `common/` including `ShareButton.tsx`
  and `LanguageSwitcher.tsx`, `training/CourseDetailModal.tsx`, `layout/` including `Navbar.tsx`
  and `Footer.tsx`).
- `src/lib/`: Client library initializers (`i18n.ts`).
- `src/locales/`: Static translation dictionaries (`src/locales/{en,vi}/common.json`, `news.json`).
- `src/pages/`: Top-level route views (`HomePage.tsx`, `CourtBookingPage.tsx`, `TrainingPage.tsx`,
  `MemberRegisterPage.tsx`, `PlayersPage.tsx`, `NewsPage.tsx`, `NewsDetailPage.tsx`,
  `InformationPage.tsx`, and the 1-line lazy-load re-export `AdminDashboardPage.tsx`).
- `src/pages/admin/`: Modular admin workspace (`AdminDashboardPage.tsx` shell, `context/`,
  `layout/`, `tabs/`, `hooks/`, `components/`, `utils/scheduleEditor.ts`).
- `src/services/`: Client HTTP wrapper (`api.ts` with `request<T>()`, `deduplicatedPost<T>()`,
  `authService`, `bookingService`, `trainingService`, `sheetsService`, and `401` session-expiry
  dispatch `dva:session-expired`).
- `src/data/`, `src/types/`, `src/utils/`, `src/shared/`, `src/config/`: Static fallbacks
  (`mockData.ts`, `vietnamLocations.ts`), TypeScript contracts (`src/types/index.ts` including
  `NEWS_CATEGORIES`), client helpers (`cloudinary.ts`, `date.ts`), shared FE/BE schedule logic
  (`schedule.ts`), and API base URL config (`api.ts`).
- `lib/`: Core backend modules (`mailer.ts`, `prisma.ts`, `security.ts`, `schemas.ts`,
  `validation.ts`).
- `prisma/`: Database schema (`schema.prisma` with 12 models) and admin seed (`seed-admin.ts`).
- `server.ts`: Express REST API entry point, RBAC middleware, and webhook dispatchers.

## Non-Breaking Feature Development Workflow

1. **Specification & Context Check**: Before writing or modifying code, inspect active feature
   specifications in `specs/`, this constitution (`.specify/memory/constitution.md`), and
   `./ARCHITECTURE.md`.
2. **Additive, Non-Breaking API & DTO Evolution**:
   - Keep existing endpoint paths, HTTP methods, and response keys intact.
   - Add new payload fields as optional in `lib/schemas.ts` (e.g., `OPTIONAL_STRING`,
     `OPTIONAL_DATE`, optional booleans) with safe default values in `lib/prisma.ts` DTO mappers
     (`toCourseDto`, `toNewsDto`, etc.).
   - Preserve server-side sorting and fallback parity (e.g., `GET /api/players` sorting by
     `level ASC, isCaptain DESC, jerseyNumber ASC` and `GET /api/news` sorting by `isPinned DESC,
     publishedAt DESC, createdAt DESC` on the `"All Articles"` view).
3. **Reuse Established Helpers & Components**:
   - Route all frontend API calls through `src/services/api.ts` (`request<T>()` /
     `deduplicatedPost<T>()`).
   - Reuse `ShareButton.tsx` for native/clipboard sharing, `formatEnglishDate()` for US date
     rendering, `removeVietnameseTones()` + `buildBookingVietQrUrl()` for payment QR generation, and
     `dispatchGoogleSheetsWebhookAsync()` for non-blocking sheet logging.
4. **Type Safety & Build Verification Gates**:
   - Every change MUST pass `npx tsc --noEmit` with zero TypeScript errors and complete a clean
     production build (`npm run build`) before task completion.
5. **Mandatory Architecture Map Update**:
   - Synchronize any new or updated components, hooks, i18n keys, or API behaviors into
     `./ARCHITECTURE.md` before closing the task.

## Governance

- This Constitution and `./ARCHITECTURE.md` supersede ad-hoc implementation conventions across the
  repository.
- Amendments to this Constitution MUST be made through `/speckit.constitution`, documented with a
  Sync Impact Report, and versioned according to Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - **MAJOR**: Backward-incompatible governance changes, removal of core principles, or
    architectural redefinitions.
  - **MINOR**: Addition of new principles, new mandatory sections, or materially expanded
    operational rules.
  - **PATCH**: Wording clarifications, typo fixes, or non-semantic refinements.
- All feature specifications (`/speckit.specify`), implementation plans (`/speckit.plan`), task
  breakdowns (`/speckit.tasks`), and code reviews MUST verify compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-03
