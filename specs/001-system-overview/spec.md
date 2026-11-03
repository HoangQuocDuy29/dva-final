# Feature Specification: DVA Volleyball Club — Baseline System Overview

**Feature Branch**: `001-system-overview`

**Created**: 2026-11-03

**Status**: Baseline (Active Production State)

**Input**: User description: "Tạo một baseline specification tổng quan về hiện trạng hệ thống dva-final dựa trên ARCHITECTURE.md và cấu trúc thư mục src/. Đặt tên spec là specs/system-overview.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Online Court Reservation & Instant VietQR Payment (Priority: P1)

Players and club guests visit the Court Booking page to inspect volleyball courts, view sub-courts (`Court A`, `Court B`), select a booking date and available time slots (distinguishing `Standard Hours` and `Peak Hours`), and submit a reservation. Upon confirmation, the system places a temporary hold on the slot, displays a dynamic bank transfer QR code with sanitized non-accented transfer content, and sends a bilingual confirmation email containing venue directions and map links.

**Why this priority**: Court reservation and payment collection represent the primary revenue-generating and operational workflow of the club.

**Independent Test**: Can be fully tested by selecting an available court, date, and time slot on the Court Booking page, submitting valid contact details, verifying that the VietQR modal displays an accurate payment QR code and transfer syntax, and confirming the selected slot transitions to booked/held status.

**Acceptance Scenarios**:

1. **Given** a visitor views the Court Booking page, **When** they select a venue, sub-court (`Court A` or `Court B`), date, and an `Available` time slot, **Then** the system calculates the total fee based on standard/peak pricing and enables the reservation form in 100% English.
2. **Given** a visitor submits a valid reservation form, **When** no conflicting booking or closed slot exists, **Then** the system records the pending booking, prevents duplicate double-click submissions, displays the dynamic MBBank VietQR code with tone-stripped transfer text, and dispatches confirmation emails and spreadsheet sync logs without delaying the booking confirmation screen.
3. **Given** a time slot is already booked or locked for maintenance, **When** another user views or attempts to book the same court, date, and overlapping time window, **Then** the system blocks the reservation and displays an explicit conflict message.

---

### User Story 2 - Training Academy Discovery, Deep-Linking & Course Enrollment (Priority: P1)

Prospective trainees browse volleyball training packages, filter courses by skill level (`All Levels`, `Beginner / Fundamentals`, `Intermediate`, `Senior / Advanced & Tactics`), inspect detailed curriculum modals via `"View Details"` or direct shareable URLs (`/training?courseId=<id>`), review coaching staff profiles, and submit course enrollments (`"Enroll Now"`) or single guest-session registrations.

**Why this priority**: Training courses and guest sessions drive new member onboarding and academy enrollment.

**Independent Test**: Can be independently tested by filtering courses on the Training page, opening `/training?courseId=<id>` directly in the browser to verify automatic modal launch, sharing the course link via the Share button, and submitting an enrollment form.

**Acceptance Scenarios**:

1. **Given** a user visits `/training?courseId=<valid-id>`, **When** the course catalog loads, **Then** the system automatically opens the corresponding `CourseDetailModal` displaying 100% English metadata (`Schedule`, `Duration`, `Max Slots`, `Registered`, `Target Audience`, `Coach In Charge`, `Program Overview`, `Package Inclusions`, `Tuition Fee`, `Billing Unit` normalized as `/ player / session`, and the `"Enroll Now"` button).
2. **Given** a user visits `/training?courseId=<invalid-id>` or closes an open `CourseDetailModal`, **When** the modal closes or fails to match a course, **Then** the system cleanly removes the `courseId` query parameter from the URL without page reload.
3. **Given** a user submits a training enrollment form, **When** the registration succeeds, **Then** the system persists the enrollment, sends a bilingual confirmation email with tuition transfer instructions, and logs the entry to the training spreadsheet tab asynchronously.

---

### User Story 3 - Athlete Roster, Club Information & Membership Recruitment (Priority: P2)

Visitors explore the official DVA athlete roster (sorted by competitive tier `Senior` → `Junior` → `Youth`, captaincy status, and jersey number), view athlete metrics (height, spike reach, block reach, and standardized English positions: `Setter`, `Outside Hitter`, `Opposite Spiker`, `Middle Blocker`, `Libero`, `Head Coach`), review club rules, pricing, and venue maps on the Information page, and submit applications to join the club on the Member Registration page.

**Why this priority**: Establishes club identity, transparency, and talent recruitment pipeline from prospective applicants to active roster athletes.

**Independent Test**: Can be tested by viewing the Players page to verify server-ordered roster rendering, reviewing the Information page, and submitting a new application on the Member Registration page.

**Acceptance Scenarios**:

1. **Given** a visitor opens the Players page, **When** the roster loads (or falls back to offline seed data), **Then** athletes are displayed in deterministic order (`SENIOR` → `JUNIOR` → `YOUTH`, Captains first, then ascending jersey numbers) with 100% English position and hometown labels.
2. **Given** a prospective player completes the Member Registration form, **When** they submit valid personal and athletic details, **Then** the system stores the application with `PENDING` status, sends a bilingual acknowledgment email, and records the submission to the recruitment spreadsheet tab.

---

### User Story 4 - Editorial News, Pinned Announcements, Category Filtering & Sharing (Priority: P2)

Readers browse club news and tactical articles on the News page, filter across `"All Articles"` and 7 standardized English categories (`Tournaments & Matches`, `Technique & Biomechanics`, `Tryouts & Recruiting`, `Club Events`, `Tactics & Strategy`, `Community & Activities`, `Partnerships & Sponsors`), search by keyword, navigate paginated article cards (6 articles per page), read full editorial articles with US English publication dates (`Month DD, YYYY`), and share articles via native mobile share dialogs or clipboard copy (`"Link Copied!"`).

**Why this priority**: Keeps the community informed about tournaments, tryouts, and club announcements with high shareability.

**Independent Test**: Can be tested by switching between `"All Articles"` and specific category tabs on the News page, verifying pinned article priority on `"All Articles"`, navigating pagination controls, opening an article detail view, and clicking `"Share Article"`.

**Acceptance Scenarios**:

1. **Given** a reader views the News page on the default `"All Articles"` tab with no search query, **When** the article list renders, **Then** articles marked `isPinned = true` appear first (with a `PINNED` badge, ordered by newest publication date), followed by unpinned articles ordered from newest to oldest, limited to 6 articles per page.
2. **Given** a reader selects a specific category filter or enters a search keyword, **When** the filtered list renders, **Then** pagination resets to Page 1 and all matching articles are sorted strictly by newest publication date (`publishedAt` descending) regardless of pin status.
3. **Given** a reader views any news card or article detail page across any browser timezone, **When** the publication date (`YYYY-MM-DD`) is formatted, **Then** it renders in US English format (`Month DD, YYYY`, e.g., `"February 28, 2025"`) without shifting backward by one day due to UTC parsing.

---

### User Story 5 - English-First Public UI & Static Language Toggle (Priority: P2)

All visitors experience a 100% English public interface by default across every public page, modal, filter, button, and dynamic dataset under the Premium Dark Athletic theme and Floating Capsule Navbar. Users who prefer Vietnamese navigation and static interface labels can toggle between `EN` and `VI` using the Micro Segmented Pill (`LanguageSwitcher`) in the top navigation bar or mobile drawer footer, saving their explicit preference for future visits.

**Why this priority**: Guarantees international accessibility and visual consistency while offering optional localized static navigation.

**Independent Test**: Can be tested by loading the application in a clean browser session (verifying `'en'` default regardless of browser locale), toggling the `EN | VI` pill in the Navbar, and reloading the page to confirm persistence via `dva_lang`.

**Acceptance Scenarios**:

1. **Given** a user visits the website for the first time with no prior language selection stored, **When** any public page renders, **Then** the interface initializes in English (`en`) by default and displays the `EN` segment active with the UK flag icon in the `LanguageSwitcher`.
2. **Given** a user clicks `VI` on the `LanguageSwitcher`, **When** the selection changes, **Then** static UI dictionaries (`common`, `news`) switch immediately to Vietnamese, the preference is persisted under `dva_lang`, and database/API payloads remain untouched.

---

### User Story 6 - Modular Role-Based Administration & Operations Dashboard (Priority: P3)

Authenticated Administrators (`ADMIN`) and Super Administrators (`SUPERADMIN`) access the lazy-loaded Admin Dashboard comprising 10 domain tabs (`Overview`, `Courts`, `Bookings`, `Applications`, `Players`, `Training`, `Coaches`, `News`, `Users`, `Sheets`) to manage court schedules, lock maintenance slots, create/update bookings, approve or reject membership applications (automatically promoting approved applicants into the player roster), publish/pin/backdate news articles, send guest-session emails, manage user roles (`SUPERADMIN` only), and monitor Google Sheets webhook sync logs.

**Why this priority**: Centralizes all day-to-day club operations into a secure, modular back-office workspace without bloating the public client bundle.

**Independent Test**: Can be tested by signing in as `ADMIN` or `SUPERADMIN`, navigating across the 10 tabs, approving a pending application or pinning a news post, and verifying immediate state synchronization across dashboard badges and public views.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user or standard member attempts to access admin endpoints or the Admin Dashboard, **When** authorization is checked, **Then** the system denies access under the Default-Deny policy and restricts role updates or user deletions exclusively to `SUPERADMIN`.
2. **Given** an administrator approves a pending membership application in `OverviewTab` or `ApplicationsTab`, **When** the action completes, **Then** the applicant is added to the active `Players` dataset and tab notification badges update immediately across the dashboard context.
3. **Given** an administrator creates or edits a news post in `NewsFormModal`, **When** they set a custom `Publish Date` (`YYYY-MM-DD`) and toggle `Pin to Top`, **Then** both `publishedAt` and `isPinned` persist accurately and reflect immediately on the public News page.

---

### Edge Cases

- **Double-Click / Concurrent Booking Submissions**: When a user rapidly clicks the booking or registration submit button multiple times, the client deduplicates in-flight POST requests (`deduplicatedPost`) and the server re-verifies `hasBookingConflict()` and `hasClosedSlotConflict()` before committing.
- **Expired Booking Holds**: When a `PENDING` booking exceeds its `holdExpiresAt` timestamp without payment confirmation, `releaseExpiredHolds()` automatically frees the slot for other players.
- **Invalid or Stale Deep-Link Query Parameters**: When `/training?courseId=<id>` references a deleted or non-existent course ID, the Training page suppresses modal opening and strips the invalid query parameter via `replace: true`.
- **UTC vs. Local Timezone Date Drift**: When rendering `YYYY-MM-DD` strings from the database, date utilities parse `[year, month - 1, day]` in local time rather than `new Date("YYYY-MM-DD")` UTC parsing, preventing previous-day shifts in Western hemisphere timezones.
- **Third-Party Service Outages (Email / Google Sheets)**: When Resend or Google Apps Script endpoints time out or return errors, isolated fire-and-forget wrappers catch and log the error asynchronously so the user still receives an immediate HTTP `200` confirmation.
- **Vietnamese Diacritics in Bank Transfer Notes**: When customer names contain Vietnamese accents or special characters, `removeVietnameseTones()` strips all diacritics before constructing the VietQR URL so banking apps never reject the transfer description.
- **Expired Admin Authentication Token**: When an API call returns `401 Unauthorized` while a token is present, the client automatically clears the session and dispatches the global `dva:session-expired` event to prompt re-authentication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Public UI 100% English Baseline)**: The system MUST render all public-facing views (`HomePage`, `Navbar`, `Footer`, `CourtBookingPage`, `TrainingPage`, `CourseDetailModal`, `PlayersPage`, `MemberRegisterPage`, `NewsPage`, `NewsDetailPage`, `InformationPage`, `AuthModal`, `VietQRModal`, `CountrySelect`) in 100% English by default (`lng: 'en'`, `fallbackLng: 'en'`), including static labels, dynamic DTO values, and offline fallback datasets.
- **FR-002 (Explicit Static Language Switcher)**: The system MUST provide a Micro Segmented Pill (`LanguageSwitcher`) in the top `Navbar` and Mobile Drawer footer allowing users to toggle static UI dictionaries (`common.json`, `news.json`) between `'en'` and `'vi'`, persisting explicit choices exclusively in `localStorage` under `'dva_lang'`.
- **FR-003 (Floating Capsule Navigation & Dark Athletic Theme)**: The public layout MUST implement the Premium Dark Athletic color tokens (`#0B0F19` page background, `#111827` surface cards, `#1E293B` borders, `#38BDF8` accent blue, `#FACC15` value yellow, `#F97316` sport orange, `#8B0000` brand cherry) and a single-container `Navbar` that transitions smoothly from full-width (`scrollY <= 20px`) to a blurred floating capsule (`scrollY > 20px`).
- **FR-004 (Court Availability, Pricing & Sub-Court Normalization)**: The system MUST support multi-court and sub-court scheduling, displaying normalized English sub-court names (`Court A`, `Court B`) on the UI while preserving internal identifiers (`'Sân A'`, `'Sân B'`) for API and database compatibility, and calculating fees across standard and peak hours.
- **FR-005 (Conflict-Free Booking & Hold Expiration)**: The system MUST check both existing bookings (`hasBookingConflict`) and administrative slot locks (`hasClosedSlotConflict`) before accepting a court reservation, automatically release expired `PENDING` holds (`releaseExpiredHolds`), and prevent duplicate client POST requests via in-flight request deduplication.
- **FR-006 (VietQR Payment Link Generation)**: The system MUST generate dynamic MBBank VietQR payment links (`0002090671521` — `HOANG QUOC DUY`) for court bookings using tone-stripped transfer descriptions (`removeVietnameseTones`).
- **FR-007 (Training Catalog Filtering & Deep-Linking)**: The Training page MUST provide 4 English skill-level filters (`"All Levels"`, `"Beginner / Fundamentals"`, `"Intermediate"`, `"Senior / Advanced & Tactics"`), render cards with a single `"View Details"` CTA, support direct deep-linking via `/training?courseId=<id>` to open `CourseDetailModal` (with an `"Enroll Now"` CTA), and clean up URL query parameters when the modal closes or when an invalid `courseId` is supplied.
- **FR-008 (Normalized Course & Athlete DTOs)**: The system MUST normalize course billing units (via `getPriceUnitLabel()` / `normalizeCoursePublicData()` / `toCourseDto()`) and athlete positions (`Setter`, `Outside Hitter`, `Opposite Spiker`, `Middle Blocker`, `Libero`, `Head Coach`) into English across both database responses and seed/mock fallbacks.
- **FR-009 (Server-Side Athlete Roster Sorting)**: `GET /api/players` (and its offline fallback) MUST return athletes pre-sorted by competitive level (`SENIOR` → `JUNIOR` → `YOUTH`), then `isCaptain DESC`, then `jerseyNumber ASC`.
- **FR-010 (Editorial News Categories, Pinning & Sorting Engine)**: The News module MUST support `"All Articles"` (`ALL`) plus 7 standardized English categories (`NEWS_CATEGORIES`), prioritizing pinned articles (`isPinned = true`) at the top ONLY when viewing `"All Articles"` without a search filter, and sorting purely by `publishedAt DESC, createdAt DESC` when filtering by a specific category or search keyword.
- **FR-011 (News Pagination & Local-Time US Date Formatting)**: The News page MUST paginate results at 6 articles per page (`ITEMS_PER_PAGE = 6`) with smooth scroll-to-top on page change, and format all article publication dates (`HomePage`, `NewsPage`, `NewsDetailPage`) in US English (`Month DD, YYYY`) using local-time date parsing to prevent timezone day-shift bugs.
- **FR-012 (Native & Clipboard Content Sharing)**: The reusable `ShareButton` component MUST invoke the native mobile share sheet (`navigator.share`) when supported and fall back to copying the URL to the clipboard with a 2-second `"Link Copied!"` visual confirmation state on desktop browsers.
- **FR-013 (Default-Deny RBAC & Session Management)**: All `/api` routes MUST enforce a Default-Deny security policy requiring `ADMIN` or `SUPERADMIN` JWT authentication (`Bearer <dva_token>`) unless explicitly whitelisted in `PUBLIC_RULES`, with user deletion and role changes restricted to `SUPERADMIN`.
- **FR-014 (Modular Lazy-Loaded Admin Dashboard)**: The Admin Dashboard MUST be code-split via `src/pages/AdminDashboardPage.tsx` and organized into 10 domain tabs (`Overview`, `Courts`, `Bookings`, `Applications`, `Players`, `Training`, `Coaches`, `News`, `Users`, `Sheets`) backed by `AdminDashboardContext` and dedicated domain hooks (`useAdminData`, `useCourtCrud`, `useCourtSlotLock`, `useApplicationActions`, `useAdminMetrics`, `useUsersTab`, `useFeedback`).
- **FR-015 (Fire-and-Forget Bilingual Emails & Google Sheets Sync)**: All Resend transactional emails (booking confirmation, training registration, member application, guest session) and Google Apps Script webhook dispatches (`DatSan`, `DangKyKhoaHoc`, `TuyenThanhVien`, `LienHe`) MUST execute asynchronously inside isolated `try/catch` blocks so external failures never block HTTP `200` responses.
- **FR-016 (PostgreSQL Single Source of Truth)**: All operational data mutations MUST persist exclusively to PostgreSQL via Prisma ORM without writing runtime mutations to local JSON files (`data/*.json`).

### Key Entities

- **User**: Club account holder or administrator with role-based permissions (`SUPERADMIN`, `ADMIN`, `MEMBER`), credentials, and account status.
- **Player**: Active club roster athlete with competitive tier (`SENIOR`, `JUNIOR`, `YOUTH`), standardized position, jersey number, captain status, height, spike/block reach, and hometown.
- **Court**: Volleyball venue containing sub-courts (`Sân A` / `Court A`, `Sân B` / `Court B`), weekly operating schedules, standard/peak pricing, guide images, and map coordinates.
- **ClosedSlot**: Administrative time-slot lock placed on a specific court, sub-court, date, and time window for maintenance or internal club events.
- **Booking**: Customer court reservation tracking court/sub-court selection, date, start/end times, customer contact info, total price, payment status (`PENDING`, `PAID`, `CANCELLED`), and temporary hold expiration (`holdExpiresAt`).
- **CoachProfile**: Coaching staff record with title, biography, certifications, achievements, and assigned training courses.
- **TrainingCourse**: Volleyball academy package defining skill level, schedule, duration, tuition fee, normalized billing unit, max slots, registered count, inclusions, and lead coach.
- **TrainingRegistration**: Student enrollment or guest-session registration linked to a training course and student contact profile.
- **MemberApplication**: Recruitment application submitted by prospective club members, tracking personal/athletic metrics and review status (`PENDING`, `APPROVED`, `REJECTED`).
- **NewsPost**: Editorial article containing title, excerpt, content, category (`NEWS_CATEGORIES`), author, cover image, custom `publishedAt` date (`YYYY-MM-DD`), `featured` flag, and `isPinned` top-priority flag.
- **AppConfig**: System-wide configuration store (including Google Sheets webhook URLs and sync settings).
- **GoogleSheetsSyncLog**: Audit log recording the status, target tab (`DatSan`, `DangKyKhoaHoc`, `TuyenThanhVien`, `LienHe`), payload summary, and timestamp of each asynchronous spreadsheet synchronization attempt.

## Baseline System Architecture & `src/` Directory Mapping

| Layer / Directory | Files & Modules | Baseline Responsibility |
| :--- | :--- | :--- |
| **App Entry & Routing** | `src/main.tsx`, `src/App.tsx`, `src/index.css` | Initializes `i18n`, mounts React root, configures client routes, and lazy-loads `AdminDashboardPage`. |
| **Layout & Navigation** | `src/components/layout/Navbar.tsx`, `Footer.tsx` | Single-container transitioning Floating Capsule Navbar, Mobile Drawer, `LanguageSwitcher` integration, and club footer with VietQR banking info. |
| **Shared UI Components** | `src/components/common/LanguageSwitcher.tsx`, `ShareButton.tsx`, `VietQRModal.tsx`, `CountrySelect.tsx`, `ContactBanner.tsx`, `GoogleSheetsViewerModal.tsx`, `BackToTop.tsx` | Micro segmented `EN \| VI` language pill, native/clipboard share button, dynamic VietQR payment dialog, country selector, and utility modals. |
| **Authentication UI** | `src/components/auth/AuthModal.tsx` | Login, registration, password reset, and OTP verification modal flows. |
| **Training UI** | `src/components/training/CourseDetailModal.tsx` | Deep-linkable course curriculum, coach profile, inclusions, and `"Enroll Now"` modal. |
| **Public Pages** | `src/pages/HomePage.tsx`, `CourtBookingPage.tsx`, `TrainingPage.tsx`, `PlayersPage.tsx`, `MemberRegisterPage.tsx`, `NewsPage.tsx`, `NewsDetailPage.tsx`, `InformationPage.tsx` | 8 primary public-facing views adhering to the 100% English Public UI policy and Premium Dark Athletic design system. |
| **Modular Admin Suite** | `src/pages/AdminDashboardPage.tsx` (1-line lazy re-export), `src/pages/admin/AdminDashboardPage.tsx` (114-line shell), `context/`, `layout/`, `tabs/` (10 tabs), `hooks/` (7 hooks), `components/`, `utils/scheduleEditor.ts` | 38-module decoupled administration workspace managing all club domains, schedules, applications, news pinning, users, and Google Sheets sync. |
| **Client API & Services** | `src/services/api.ts`, `src/config/api.ts` | Centralized `request<T>()` and `deduplicatedPost<T>()` wrappers, Bearer token injection, `401` session expiration handling (`dva:session-expired`), and offline fallback orchestration. |
| **i18n & Dictionaries** | `src/lib/i18n.ts`, `src/locales/{en,vi}/common.json`, `news.json` | English-first `i18next` setup with `localStorage` (`dva_lang`) persistence for static UI translations. |
| **Shared Logic & Utils** | `src/shared/schedule.ts`, `src/utils/date.ts`, `src/utils/cloudinary.ts`, `src/types/index.ts`, `src/data/mockData.ts`, `src/data/countries.ts` | Weekly schedule normalizers shared between FE & BE, local-time US English date formatter (`formatEnglishDate`), Cloudinary uploader, TypeScript contracts, and English fallback datasets. |
| **Backend & Persistence** | `server.ts`, `lib/prisma.ts`, `lib/security.ts`, `lib/mailer.ts`, `lib/schemas.ts`, `lib/validation.ts`, `prisma/schema.prisma` | Express REST API, Default-Deny RBAC, Prisma ORM v7 PostgreSQL adapter, DTO mappers, Resend bilingual mailer, VietQR builder, and non-blocking Google Sheets webhook dispatcher. |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (100% English Public Baseline)**: 100% of public pages, modals, navigation links, filter pills, form placeholders, toast messages, and fallback datasets render in English on initial load without any untranslated Vietnamese strings.
- **SC-002 (Zero Double-Booking Collisions)**: 100% of overlapping court reservation attempts or rapid double-click submissions for the same court, sub-court, date, and time slot are rejected deterministically without creating duplicate active bookings.
- **SC-003 (Non-Blocking Transaction Latency)**: 100% of court bookings, training enrollments, and membership applications return a primary confirmation response to the user without waiting for external email (Resend) or spreadsheet webhook (Google Apps Script) completion, even when third-party services experience 100% downtime.
- **SC-004 (Deep-Link & Share Accuracy)**: 100% of valid `/training?courseId=<id>` and `/news/:id` shared links open the exact target course modal or article detail view on first load, and invalid `courseId` parameters are cleaned from the URL without application errors.
- **SC-005 (News Sorting, Pinning & Timezone Integrity)**: 100% of pinned news posts appear at the top of the `"All Articles"` view (ordered by newest publication date), revert to strict chronological sorting under category/search filters, paginate at 6 articles per page, and display identical `Month DD, YYYY` dates across all user timezones.
- **SC-006 (Admin Bundle Isolation & Modularity)**: The Admin Dashboard remains decoupled into modular domain files (`src/pages/admin/`) and is lazy-loaded only when an authenticated administrator navigates to the admin route, keeping the orchestration shell under 150 lines.

## Assumptions

- PostgreSQL (hosted on Render and accessed via Prisma ORM v7) is the sole operational data store; schema updates are applied via `npm run prisma:push` without destructive migrations.
- Bank transfer QR generation targets MBBank account `0002090671521` (`HOANG QUOC DUY`) via the VietQR Quicklink standard.
- Static UI localization (`EN | VI`) scopes strictly to client-side JSON dictionaries (`src/locales/{en,vi}/`) while dynamic business records and public DTOs remain normalized in English.
- Transactional emails via Resend intentionally retain bilingual (English - Vietnamese) templates to serve both international and local players.
