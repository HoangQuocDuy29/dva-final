# Feature Specification: Modern Dark Analytics & Modular Admin Hub

**Feature Branch**: `005-admin-modern-analytics-hub`  
**Created**: 2026-11-10  
**Status**: Draft  
**Input**: User description: "[SPEC-DRIVEN] Nâng cấp Giao diện Admin Dashboard (Dark Modern Analytics & Modular Hub) - Chế độ Giám sát Nghiêm ngặt (Strict Review Mode)"

---

## 1. Executive Summary & Purpose

Transform the DVA Volleyball Club administration workspace into a modern, high-performance **Dark Athletic Analytics & Modular Hub**. The redesigned admin portal organizes club operations into four distinct functional domains via a responsive collapsible sidebar, delivers an overview analytics dashboard with multi-source revenue tracking and visual statistical charts, integrates placeholders for future commerce and tournament modules, and strictly preserves 100% of existing core business logic (Court Booking calendar/deposits, Training course CRUD/roster/visibility toggle, Squad player management/avatar filters).

All system UI labels, navigation headers, metric badges, and feedback toasts are standardized to 100% professional athletic English.

---

## 2. Invariant Constraints & Production Database Guardrails

> [!CAUTION]
> **ZERO-TOLERANCE DATABASE PRODUCTION INVARIANT**:
> - The local workspace connects directly to the Live Production PostgreSQL instance on Neon via Connection Pooling (`ep-late-resonance-azej7c0f-pooler...`).
> - **NO MIGRATIONS**: Never run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset`.
> - **NO SEED SCRIPTS**: Never run `prisma db seed`, `npm run seed`, or any destructive data scripts.
> - **NO SCHEMA ALTERATIONS**: Do not modify a single line of `prisma/schema.prisma` in this task.
> - **READ-ONLY QUERIES**: All queries for existing data (Players, Bookings, Training Courses, Registrations, Applications) MUST execute via read-only methods (`findMany`, `findUnique`, `count`, `aggregate`).

---

## 3. User Scenarios & Testing *(mandatory)*

### User Story 1 - Modern Collapsible Sidebar & Domain Hub Navigation (Priority: P1)

As a Club Administrator or SuperAdmin,  
I want to navigate between club operational domains via a modern collapsible sidebar grouped into logical sections (Overview, Athletics & Services, Commerce & Competition, System),  
So that I have an organized, high-density, distraction-free workspace that adapts seamlessly between desktop and smaller viewports.

**Why this priority**: Navigation is the foundational spine of the admin hub. Grouping 10+ operational tabs into intuitive athletic domains eliminates visual clutter and prepares the platform for modular scalability.

**Independent Test**: Can be tested independently by logging in as ADMIN or SUPERADMIN, collapsing/expanding the sidebar, toggling between domain groups, and verifying that every domain module loads instantly without breaking router state.

**Acceptance Scenarios**:
1. **Given** an authenticated admin on desktop, **When** they view the sidebar, **Then** they see 4 grouped sections:
   - **Overview**: `Overview & Analytics`
   - **Athletics & Services**: `Squad Roster`, `Training & Scrimmages`, `Coaching Staff`, `Tryout Applications`, `Court Schedule & Slots`
   - **Commerce & Competition**: `Court Bookings & VietQR`, `DVA Store` (New), `Tournaments` (New)
   - **System**: `News & Media`, `Google Sheets Sync`, `Staff & Roles` (SuperAdmin only).
2. **Given** an admin wishing to maximize screen real estate, **When** they click the collapse toggle button, **Then** the sidebar transitions smoothly to compact mode (icon-only with hover tooltips), expanding the main canvas.
3. **Given** a mobile viewport, **When** the admin taps the menu trigger, **Then** the sidebar opens as a slide-over drawer with backdrop overlay.

---

### User Story 2 - Comprehensive Revenue Analytics & Interactive Visual Charts (Priority: P2)

As a Club Executive,  
I want to review real-time revenue breakdowns across Court Bookings, Training Tuition, and E-Commerce ($0), accompanied by interactive visual trend charts on the Overview dashboard,  
So that I can monitor financial health and program participation at a glance.

**Why this priority**: Executives need consolidated financial clarity. Currently, revenue only counts court bookings; adding training tuition and modular KPI cards delivers actionable operational intelligence.

**Independent Test**: Can be tested independently by opening the `Overview & Analytics` tab, verifying that the Total Revenue card reflects the exact sum of Court Booking revenue (`paymentStatus = 'PAID'`) + Training Tuition (`status = 'CONFIRMED'`) + DVA Store (`0 đ`), and observing the visual charts rendering real-time aggregated data.

**Acceptance Scenarios**:
1. **Given** live bookings and training registrations in Neon DB, **When** the Overview tab loads, **Then** the system displays 4 modular KPI revenue cards:
   - **Total Club Revenue**: Aggregated sum of all verified revenue streams.
   - **Court Bookings Revenue**: Total from `PAID` court sessions.
   - **Training & Academy Tuition**: Total from `CONFIRMED` student registrations.
   - **DVA Store Revenue**: Initialized at `$0` (or `0 đ`).
2. **Given** the visual analytics section, **When** viewed on the overview screen, **Then** an interactive sports analytics chart renders revenue trends and module distribution with tooltips and responsive scaling.
3. **Given** live pending reservations or tryout applications, **When** displayed on the quick action panels, **Then** admins can approve or navigate to respective tabs directly.

---

### User Story 3 - Preservation of Core Athletics & Services Logic (Priority: P1)

As a Court Operations Manager or Head Coach,  
I want Court Booking, Training & Scrimmages, and Squad Player management to retain 100% of their operational behaviors,  
So that daily booking approvals, slot locks, student enrollments, visibility toggles, and athlete roster filters continue to work without regression.

**Why this priority**: Zero disruption to live club operations. Existing CRUD and business workflows must remain 100% functional.

**Independent Test**: Can be independently verified by:
1. Approving a pending booking deposit (`PAID`) and checking status sync.
2. Toggling course visibility (`isActive`) in Training & Scrimmages.
3. Toggling player visibility (`isActive`) and applying the "Missing Avatar" filter in Squad Roster.

**Acceptance Scenarios**:
1. **Given** the Court Booking module, **When** an admin views bookings, **Then** calendar management, VietQR deposit verification, manual reservation booking modal, and slot conflict guards function identically to previous versions.
2. **Given** the Training & Scrimmages module, **When** an admin updates a student registration status or toggles course visibility (`isActive`), **Then** state persists to the server and feedback notifications fire.
3. **Given** the Players module, **When** an admin filters by `Missing Avatar` or toggles player visibility (`isActive`), **Then** list filtering and toggle states operate without error.

---

### User Story 4 - Future Expansion Hub: Tournaments & DVA Store (Priority: P3)

As an Admin exploring future club capabilities,  
I want dedicated entry points for "Tournaments" and "DVA Store" within Commerce & Competition,  
So that the platform presents a complete organizational roadmap for upcoming features.

**Why this priority**: Signals upcoming platform features to club management while providing structured layouts for upcoming phase deployments.

**Independent Test**: Click on "Tournaments" in the sidebar and verify the Coming Soon banner. Click on "DVA Store" and verify the initialized store management placeholder.

**Acceptance Scenarios**:
1. **Given** the Tournaments tab selected in the sidebar, **When** rendered, **Then** the view displays:
   - Header: "Tournaments & Leagues Hub"
   - Coming Soon Banner: *"Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai."*
   - Visual roadmap cards for Bracket Generator, Team Registration, and Live Scoreboards.
2. **Given** the DVA Store tab selected, **When** rendered, **Then** the view displays an initialized e-commerce hub with KPI cards ($0 sales, 0 products, 0 orders) and gear category placeholders (Jerseys, Volleyballs, Gear).

---

### User Story 5 - Topbar Search & Quick Admin Commands (Priority: P2)

As an Admin working on daily tasks,  
I want a Topbar equipped with a Quick Search bar, connected admin status badge, and global shortcuts,  
So that I can jump to any module or execute critical actions in seconds.

**Why this priority**: Enhances administrative ergonomics, keyboard navigation, and operational velocity.

**Independent Test**: Type a query into the Quick Search bar or press `Cmd+K` to switch active modules and search records.

**Acceptance Scenarios**:
1. **Given** any admin page, **When** the admin focuses the Quick Search bar, **Then** matching modules and quick navigation options appear with instant filtering.
2. **Given** the topbar right action cluster, **When** clicked, **Then** the "Guest Email Invitation" modal opens, "Refresh" refetches live data, and "Exit to Public Website" routes back to home.

---

## 4. Edge Cases & Resilience

- **EC-001 (Neon Serverless Cold Start / Network Lag)**: When fetching live data on slow connection, loading skeleton states prevent layout shift; retry mechanisms prevent blank screens.
- **EC-002 (Zero Training Registrations or Courses)**: If there are no confirmed courses, Training Revenue safely defaults to `0 đ` without `NaN` or unhandled exceptions.
- **EC-003 (Collapsed Sidebar on Small Screen)**: On screens below `1024px`, the collapsible desktop sidebar automatically transitions to an off-canvas mobile drawer with smooth backdrop dismissal.
- **EC-004 (Permission Boundaries)**: If an `ADMIN` attempts to open `USERS` (SuperAdmin only), the sidebar hides the tab and navigation gracefully redirects to `OVERVIEW`.

---

## 5. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a collapsible sidebar navigation with 4 distinct operational categories:
  - `Overview` (`OVERVIEW`)
  - `Athletics & Services` (`PLAYERS`, `TRAINING`, `COACHES`, `APPLICATIONS`, `COURTS`)
  - `Commerce & Competition` (`BOOKINGS`, `STORE`, `TOURNAMENTS`)
  - `System` (`NEWS`, `SHEETS`, `USERS` [SuperAdmin only]).
- **FR-002**: System MUST render real-time KPI revenue metrics on the Overview dashboard:
  - Total Club Revenue (Aggregated Court + Training + Store).
  - Court Booking Revenue (Sum of `PAID` bookings).
  - Training Tuition Revenue (Sum of `CONFIRMED` registrations).
  - DVA Store Revenue (Initialized to `0 đ` / `$0`).
- **FR-003**: System MUST provide an interactive visual sports analytics chart in the Overview dashboard illustrating revenue distribution and operational activity.
- **FR-004**: System MUST preserve 100% of existing Court Booking logic, including date selection, subcourt switching, calendar slot locking, manual booking modal, and VietQR payment verification.
- **FR-005**: System MUST preserve 100% of Training & Scrimmages logic, including course CRUD, visibility switch (`isActive`), attendee list, and status updates (`PENDING` | `CONFIRMED` | `CANCELLED`).
- **FR-006**: System MUST preserve 100% of Squad Player roster logic, including athlete CRUD, visibility switch (`isActive`), search query, and `Missing Avatar` filter.
- **FR-007**: System MUST render a dedicated "Tournaments" tab displaying the exact status message:
  *"Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai."*
- **FR-008**: System MUST render a dedicated "DVA Store" tab featuring a modular e-commerce placeholder layout ready for Phase 2 implementation.
- **FR-009**: System MUST feature a modernized Topbar with Quick Search, Admin profile indicator (Name, Email, Role badge), Refresh button, Guest Session Email trigger, and Exit link.
- **FR-010**: System MUST enforce 100% professional athletic English across all admin navigation items, headers, badges, and operational action buttons.

---

## 6. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **0 TypeScript errors** (`npx tsc --noEmit`) and **successful production build** (`npm run build:client` / `npm run build`).
- **SC-002**: **100% Real Live Data Rendering**: Admin dashboard connects to Neon PostgreSQL with 0 fallback mock data usage and 0 Prisma `P2022` errors.
- **SC-003**: **Zero-Breakage Logic Invariant**: All existing booking, player, training, coach, news, user, and sheets operations function with identical success rates.
- **SC-004**: **Sub-second Tab Switching**: Switching between modular tabs in the collapsible sidebar completes in under 100ms without full-page reloads.
- **SC-005**: **100% Professional Athletic English**: Zero untranslated Vietnamese UI labels in the admin navigation, headers, or metric badges (with the deliberate exception of the specific Vietnamese notice requested for Tournaments Coming Soon).

---

## 7. Confirmed Technical Decisions (Proposal Gate Approved)

1. **Visual Chart Implementation**:
   - **Decision**: **Native Athletic SVG & Motion Chart** built with React 19 + Framer Motion v12 (`motion: ^12.23.24`) + Tailwind CSS v4.
   - **Rationale**: Eliminates external package overhead, avoids React 19 peer-dependency issues, provides 100% build reliability with zero network dependency, and delivers smooth, dark athletic visual aesthetics with animated tooltips.
2. **Topbar Quick Search Scope**:
   - **Decision**: **Hybrid Hub Navigator**.
   - **Scope**: Combines instant module navigation (e.g., jump to "Courts", "Store", "Players", "Tournaments") with rapid entity search preview for active athletes (by name/jersey) and recent court bookings (by booking code/customer name).
3. **Collapsible Sidebar Layout**:
   - **Decision**: **Expanded by Default** (256px / `w-64`).
   - **Behavior**: Displays category section headers, module icons, readable labels, and dynamic count badges (`pendingBookingsCount`, `pendingApplicationsCount`, `playersCount`, `coursesCount`, `coachesCount`, `newsCount`). Admins can toggle to compact mode (72px / `w-18` icon-only with floating hover tooltips) or trigger the slide-over drawer on mobile devices.
4. **Database Safety**:
   - Strictly enforced. Local environment communicates with live Neon PostgreSQL in read-only mode for historical records. Zero schema alterations, zero migrations, zero seeds.
