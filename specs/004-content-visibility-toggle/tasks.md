# Tasks: Soft Visibility & Publish Toggle for Players, Training Courses & Scrimmages

**Input**: Design documents from `specs/004-content-visibility-toggle/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Organization**: Tasks are strictly grouped by user story to enable independent implementation, testing, and delivery.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Mapped user story (`US1`, `US2`, `US3`) from `spec.md`
- Exact file paths are explicitly stated for each task

---

## Phase 1: Setup & Foundational (Blocking Prerequisites)

**Purpose**: Database schema updates, DTO mappers, and validation schemas that MUST be complete before user story features can run.

- [x] T001 Update Prisma schema in `prisma/schema.prisma` to add `isActive Boolean @default(true)` to `Player` and `TrainingCourse` models with `@@index([isActive])`
- [x] T002 Synchronize PostgreSQL database schema safely by running `npx prisma db push` without data loss and update client via `npx prisma generate`
- [x] T003 [P] Update domain TypeScript interfaces in `src/types/index.ts` to add `isActive?: boolean;` to `Player` and `TrainingCourse`
- [x] T004 [P] Update validation schemas in `lib/schemas.ts` to add `isActive: B` to `PLAYER_SCHEMA` and `COURSE_SCHEMA`, and export `VISIBILITY_TOGGLE_SCHEMA`
- [x] T005 [P] Update DTO mappers in `lib/prisma.ts` (`toPlayerDto`, `toCourseDto`) to include `isActive: p.isActive !== false` and `isActive: c.isActive !== false`

**Checkpoint**: Foundation complete and verified. Models, types, and DTO layers are ready.

---

## Phase 2: User Story 1 - Administrator Toggles Item Visibility (Priority: P1) 🎯 MVP

**Goal**: Empower club administrators to toggle visibility of any player or course/scrimmage directly from the Admin Dashboard with immediate visual feedback and persistent database updates.

**Independent Test**: Navigate to `/admin`, toggle an athlete card or training package; observe status badge transition between `Active / Published` and `Hidden`, and verify state persists across browser refresh.

### Implementation for User Story 1

- [x] T006 [US1] Implement `PATCH /api/players/:id/visibility` endpoint in `server.ts` to update player `isActive` state with `ADMIN`/`SUPERADMIN` RBAC check
- [x] T007 [US1] Implement `PATCH /api/training/courses/:id/visibility` endpoint in `server.ts` to update course/scrimmage `isActive` state with `ADMIN`/`SUPERADMIN` RBAC check
- [x] T008 [P] [US1] Add `togglePlayerVisibility(id: string, isActive: boolean)` and `toggleCourseVisibility(id: string, isActive: boolean)` API methods in `src/services/api.ts`
- [x] T009 [US1] Implement interactive toggle switch and visual status badges (`Active / Published` in emerald vs `Hidden` in amber) on athlete cards in `src/pages/admin/tabs/PlayersTab.tsx`
- [x] T010 [US1] Implement interactive toggle switch and visual status badges (`Active / Published` in emerald vs `Hidden` in amber) on course/scrimmage cards in `src/pages/admin/tabs/TrainingTab.tsx`

**Checkpoint**: User Story 1 complete (MVP). Administrators can toggle status on all entities with persistent backend updates.

---

## Phase 3: User Story 2 - Public Visitor Experiences Consistent Active Content (Priority: P2)

**Goal**: Guarantee that public visitors only see published athletes and courses, direct deep links to inactive courses are gracefully handled, and registration requests for hidden programs are rejected.

**Independent Test**: Visit `/players` and `/services/training-scrimmage` in an incognito window while an item is hidden; confirm it does not appear on cards, lists, or search results, and attempting direct registration via API returns HTTP 400.

### Implementation for User Story 2

- [x] T011 [US2] Update `GET /api/players` query handler in `server.ts` to append `{ isActive: true }` for non-staff public requests
- [x] T012 [US2] Update `GET /api/training/courses` query handler in `server.ts` to append `{ isActive: true }` for non-staff public requests
- [x] T013 [US2] Update `POST /api/training/register` in `server.ts` to validate that target course is active (`course.isActive === true`) and return HTTP 400 if inactive
- [x] T014 [P] [US2] Add defensive filtering (`p.isActive !== false`) in `src/pages/PlayersPage.tsx` to ensure public roster never displays hidden athletes
- [x] T015 [P] [US2] Update deep-link resolution in `src/pages/TrainingPage.tsx` to safely strip invalid/inactive `courseId` from URL query params and notify the user with an English advisory

**Checkpoint**: User Story 2 complete. Public screens, direct deep links, and registration endpoints are protected.

---

## Phase 4: User Story 3 - Administrator Filters Roster by Visibility and Missing Avatars (Priority: P3)

**Goal**: Provide administrators rapid auditing tools including quick status filter tabs (`All` | `Active` | `Hidden`) and a specialized `Missing Avatar` auditor on the Player roster.

**Independent Test**: Click filter tabs in `PlayersTab.tsx` and `TrainingTab.tsx` to verify cards filter accurately by status; toggle `Missing Avatar` to isolate athletes without profile photos.

### Implementation for User Story 3

- [x] T016 [US3] Add quick status filter segment control (`All` | `Active` | `Hidden`) with dynamic item count badges in `src/pages/admin/tabs/PlayersTab.tsx`
- [x] T017 [US3] Add `Missing Avatar` filter button / toggle pill in `src/pages/admin/tabs/PlayersTab.tsx` to filter athlete cards where `!p.avatarUrl || p.avatarUrl.trim() === ''`
- [x] T018 [US3] Add quick status filter segment control (`All` | `Active` | `Hidden`) with dynamic item count badges in `src/pages/admin/tabs/TrainingTab.tsx`

**Checkpoint**: User Story 3 complete. Full auditing and filtering capabilities operational for administrators.

---

## Phase 5: Polish, Cross-Cutting & Verification

**Purpose**: Documentation synchronization, quality gates, and end-to-end verification.

- [x] T019 [P] Update `ARCHITECTURE.md` (Sections 3.2, 3.5, 4.3, 5) to document `isActive` field, public vs admin query filters, and non-breaking rules
- [x] T020 Review and confirm 100% English Public UI policy compliance for all user-facing labels, badges, placeholders, and toasts
- [x] T021 Run TypeScript compiler check via `npx tsc --noEmit` and confirm 0 errors
- [x] T022 Run production bundle build via `npm run build` and confirm clean exit code 0
- [x] T023 Execute quickstart verification scenarios from `specs/004-content-visibility-toggle/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational (Phase 1)**: Can start immediately. Blocks all subsequent phases.
- **User Story 1 (Phase 2)**: Depends on Phase 1. Delivers core administrative toggle capability (MVP).
- **User Story 2 (Phase 3)**: Depends on Phase 1 & Phase 2. Secures public query layer and registration gate.
- **User Story 3 (Phase 4)**: Depends on Phase 2. Enhances admin filtering and auditing UX.
- **Polish & Verification (Phase 5)**: Depends on Phases 1–4. Validates full system integrity.

### Parallel Opportunities

- **Phase 1**: T003 (`types/index.ts`), T004 (`schemas.ts`), and T005 (`prisma.ts`) can run in parallel after T001/T002.
- **Phase 2**: T008 (`api.ts`) can run in parallel with backend endpoints T006 and T007.
- **Phase 3**: T014 (`PlayersPage.tsx`) and T015 (`TrainingPage.tsx`) can run in parallel.
- **Phase 4**: T016/T017 (`PlayersTab.tsx`) and T018 (`TrainingTab.tsx`) can run in parallel.
- **Phase 5**: T019 (`ARCHITECTURE.md`) can run in parallel with verification tasks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Schema push, types, DTO mappers).
2. Complete Phase 2 (US1: Admin toggle APIs, admin service, toggle UI in Players & Training tabs).
3. Validate US1: Admin can toggle items on/off with persistent database records.

### Incremental Delivery
1. Add Phase 3 (US2): Enforce public isolation, deep-link safety, and registration rejection.
2. Add Phase 4 (US3): Add quick filters and Missing Avatar filter.
3. Complete Phase 5: Architecture documentation sync and `tsc` / `npm run build` quality gates.
