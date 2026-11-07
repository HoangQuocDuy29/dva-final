# Feature Specification: Soft Visibility & Publish Toggle for Players, Training Courses & Scrimmages

**Feature Branch / ID**: `004-content-visibility-toggle`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "[SPEC-DRIVEN] Triển khai tính năng Ẩn/Hiện nội dung (Soft Visibility / Publish Toggle) cho Players, Training Courses & Scrimmages"

---

## 1. Executive Summary & Value Proposition

Administrative staff members frequently need to prepare draft athlete profiles (for example, awaiting high-resolution portrait photos or verified jersey numbers), temporary training clinics, or private scrimmage sessions without publishing them immediately to public visitors. Conversely, when a player is temporarily on leave or a scrimmage package reaches capacity or is deferred, administrators need the flexibility to temporarily hide the listing without permanently deleting historical records, linked court bookings, or trainee registrations.

This feature introduces a soft visibility mechanism (`isActive: true | false`) for **Players**, **Training Courses**, and **Scrimmages**. Public-facing pages strictly filter out hidden items, direct links to inactive items are handled gracefully, and administrators have full visibility, quick-toggle controls, and dedicated status filters in the Admin Dashboard.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Toggles Item Visibility (Priority: P1)

As an Administrator or Superadmin,
I want to toggle the published/hidden status of any player, training course, or scrimmage directly from the management roster,
So that I can control public visibility instantly without deleting underlying data or breaking relations.

**Why this priority**: Core requirement delivering immediate business value—eliminates accidental data loss and allows staging of draft or inactive content.

**Independent Test**: Can be fully tested by clicking the visibility toggle switch on an athlete card or training package in the Admin Dashboard; the item's badge changes immediately between "Published" and "Hidden", and the change persists across refreshes.

**Acceptance Scenarios**:

1. **Given** an administrator is viewing the Player Roster in the Admin Dashboard,
   **When** they click the visibility switch on a published athlete card,
   **Then** the athlete's status badge switches from `Active / Published` (Green) to `Hidden` (Amber/Gray), and a success notification confirms the update.
2. **Given** an administrator is viewing the Training & Scrimmage management tab,
   **When** they toggle an inactive training package back to active,
   **Then** the package's status badge switches immediately to `Active / Published`, and the item is queued for public visibility.
3. **Given** an unauthenticated visitor or non-staff user attempts to send a status toggle mutation,
   **When** the request reaches the server,
   **Then** the system rejects the operation with an authorization error.

---

### User Story 2 - Public Visitor Experiences Consistent Active Content (Priority: P2)

As a public club visitor or prospective trainee,
I want to browse only actively published athletes, verified rosters, and currently available training/scrimmage programs,
So that I never encounter draft profiles or attempt to register for discontinued courses.

**Why this priority**: Guarantees public integrity and international-grade user experience, preventing visitor confusion and invalid bookings.

**Independent Test**: Can be fully tested by visiting `/players` and `/services/training-scrimmage` while one or more items are hidden; verified that hidden items do not render on cards, grids, or detail modals.

**Acceptance Scenarios**:

1. **Given** an athlete has their visibility set to hidden (`isActive = false`),
   **When** a public guest accesses the `/players` roster page,
   **Then** the hidden athlete does not appear in any level tab (Senior, Junior, Youth) or search results.
2. **Given** a training course or scrimmage package has its visibility set to hidden,
   **When** a public guest accesses `/services/training-scrimmage`,
   **Then** the package card does not render in the catalog, level filter, or carousel.
3. **Given** a public visitor accesses a direct shared link containing the ID of a hidden course (`?courseId=<hidden-id>`),
   **When** the page loads,
   **Then** the system does not open the registration modal, clears the query parameter cleanly, and presents a user-friendly notice stating that the selected program is currently unavailable.
4. **Given** a visitor attempts to post a registration payload referencing a hidden course ID,
   **When** the submission is processed,
   **Then** the system rejects the registration with a descriptive error message and does not create an unfulfillable booking.

---

### User Story 3 - Administrator Filters Roster by Visibility and Missing Avatars (Priority: P3)

As an Administrator managing club athletes and courses,
I want quick filter tabs (`All`, `Active`, `Hidden`) and a secondary filter (`Missing Avatar`),
So that I can rapidly audit incomplete athlete profiles and batch-update visibility status.

**Why this priority**: Operational efficiency for club managers handling dozens of player profiles and multi-level training programs.

**Independent Test**: Can be fully tested by clicking the filter tabs on the Admin Player and Training tabs, observing the filtered card count update instantly.

**Acceptance Scenarios**:

1. **Given** the Admin Player Roster containing active and hidden athletes,
   **When** the administrator clicks the `Hidden` filter pill,
   **Then** only athletes with `isActive = false` are displayed, with an accurate counter ("Showing X of Y hidden athletes").
2. **Given** the administrator needs to identify athlete profiles lacking profile photos,
   **When** they activate the `Missing Avatar` filter toggle,
   **Then** the list filters to display only athletes who do not have an avatar photo URL, allowing rapid profile completion.
3. **Given** the Admin Training & Scrimmage management tab,
   **When** the administrator selects `Active`,
   **Then** only published courses and active scrimmages are visible in the management grid.

---

### Edge Cases

- **Direct Deep-Link Access to Hidden Content**: When an external user opens a previously bookmarked or shared URL (`/services/training-scrimmage?courseId=<hiddenId>`), the system MUST NOT display the course details modal or allow step-through to payment/VietQR. It must clear the query parameter safely.
- **Race Condition on Toggle**: If two administrators toggle the same entity simultaneously, the latest request must commit idempotently without corrupting other entity attributes.
- **Default Value on Legacy Records**: All existing player and course records without explicit visibility settings MUST automatically default to `isActive = true` upon schema synchronization, ensuring zero service disruption.
- **Missing Avatar Detection**: An athlete is considered to have a missing avatar if `avatarUrl` is `null`, undefined, an empty string, or whitespace-only.
- **Foreign Key Safety**: Hiding a training course that already has existing registrations (`TrainingRegistration`) or a player linked to a user account MUST NOT trigger cascade deletions or break relational integrity.

---

## 3. Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store an `isActive` boolean property on all `Player` records, defaulting to `true`.
- **FR-002**: The system MUST store an `isActive` boolean property on all `TrainingCourse` records (covering both Training Courses and Scrimmages), defaulting to `true`.
- **FR-003**: Public queries retrieving players MUST automatically restrict results to records where `isActive` is `true`.
- **FR-004**: Public queries retrieving training courses and scrimmages MUST automatically restrict results to records where `isActive` is `true`.
- **FR-005**: Public pages MUST gracefully handle direct access to hidden entity identifiers without throwing unhandled exceptions or rendering empty modal shells.
- **FR-006**: The training registration endpoint MUST validate that the target course or scrimmage is active (`isActive === true`) before accepting new registrations.
- **FR-007**: The system MUST provide dedicated administrative API endpoints or handlers to toggle the `isActive` status for a specific player by ID.
- **FR-008**: The system MUST provide dedicated administrative API endpoints or handlers to toggle the `isActive` status for a specific training course or scrimmage by ID.
- **FR-009**: All visibility toggle operations MUST be restricted exclusively to authenticated users with `ADMIN` or `SUPERADMIN` roles.
- **FR-010**: The Admin Dashboard Player tab MUST provide an interactive toggle control directly on each athlete card/row.
- **FR-011**: The Admin Dashboard Training tab MUST provide an interactive toggle control directly on each course/scrimmage card.
- **FR-012**: Admin list cards MUST display clear visual status badges:
  - `Active / Published`: Emerald / Green styling.
  - `Hidden`: Gray / Amber styling.
- **FR-013**: The Admin Dashboard Player tab MUST include quick status filter tabs (`All`, `Active`, `Hidden`).
- **FR-014**: The Admin Dashboard Player tab MUST include a secondary filter toggle for `Missing Avatar` to quickly surface athletes without profile pictures.
- **FR-015**: The Admin Dashboard Training tab MUST include quick status filter tabs (`All`, `Active`, `Hidden`).
- **FR-016**: All public-facing labels, badges, alert texts, and notifications MUST be in 100% English in strict compliance with the DVA Constitution.
- **FR-017**: Existing database relations, foreign keys, and existing schema columns MUST remain completely intact without renaming or removal.

---

### Key Entities

- **Player**: Represents a DVA volleyball club athlete.
  - Attributes: `id`, `fullName`, `jerseyNumber`, `level`, `position`, `height`, `weight`, `spikeTouch`, `blockTouch`, `avatarUrl`, `isCaptain`, `isActive` (boolean, default true).
- **TrainingCourse**: Represents both structured training masterclasses and weekly open/position scrimmage sessions.
  - Attributes: `id`, `title`, `level`, `tag`, `price`, `priceUnit`, `schedule`, `duration`, `coachName`, `coachTitle`, `description`, `benefits`, `curriculum`, `maxSlots`, `enrolledSlots`, `imageUrl`, `isActive` (boolean, default true).

---

## 4. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Immediate Public Reflection)**: When an admin toggles an athlete or course to hidden, the change is reflected on public pages within 1 request, with 0ms delay and 0 database data loss.
- **SC-002 (Registration Protection)**: 100% of direct enrollment or registration attempts against hidden/inactive courses are intercepted and rejected with a clear user advisory.
- **SC-003 (Audit Speed)**: Administrators can isolate all athlete profiles lacking avatars or all hidden courses in under 2 seconds (1 click).
- **SC-004 (Zero Downtime / Zero Data Loss)**: Database schema synchronization completes without losing any existing member, player, or course records.
- **SC-005 (Compilation & Quality Gate)**: TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors and production build (`npm run build`) succeeds cleanly.

---

## 5. Assumptions

- **Shared Domain Model**: Scrimmages and Training Courses share the `TrainingCourse` model in PostgreSQL, differentiated by title/tags/level convention as established in earlier milestones.
- **Default Active Status**: Setting `default(true)` ensures existing records remain published and visible unless explicitly hidden by an administrator.
- **Authentication Context**: Administrators interact with the Admin Dashboard with an active session carrying a valid Bearer token (`dva_token`), verified server-side against the PostgreSQL users table.
- **Bilingual Email Policy**: Transactional emails continue to use the established bilingual format; public UI remains strictly 100% English.
