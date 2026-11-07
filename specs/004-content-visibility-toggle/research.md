# Research & Technical Decisions: Content Soft Visibility & Publish Toggle

**Feature**: Soft Visibility & Publish Toggle for Players, Training Courses & Scrimmages  
**Spec**: [`specs/004-content-visibility-toggle/spec.md`](spec.md)  
**Date**: 2026-11-07  

---

## 1. Decision: Schema Modeling for Scrimmages & Training Courses

- **Decision**: Add `isActive Boolean @default(true)` to `Player` and `TrainingCourse` models in `prisma/schema.prisma`. Both Training Courses and Scrimmage Sessions continue to be stored within the `TrainingCourse` table.
- **Rationale**:
  - The project architecture documentation (`ARCHITECTURE.md` section 3.5 & `prisma/schema.prisma` line 258) documents: `model TrainingCourse { ... }` as *"Khóa học bóng chuyền & các ca ghép đội đấu tập (Scrimmage)"*.
  - Scrimmages are distinguished within `TrainingCourse` by their level/title/tag convention (e.g., `tc-scrimmage-basic`, `level: 'Open Scrimmage'`).
  - Adding `isActive Boolean @default(true)` directly to `TrainingCourse` seamlessly handles both Training Courses and Scrimmages without creating a redundant database table.
  - Adding `isActive Boolean @default(true)` to `Player` seamlessly handles all club athlete rosters (Senior, Junior, Youth).
  - `@default(true)` guarantees 100% backward compatibility for all existing rows upon `prisma db push`.
- **Alternatives Considered**:
  - *Creating a separate `Scrimmage` table*: Rejected because it would break existing relationships (`TrainingRegistration`), duplicate code paths, require data migration from existing `TrainingCourse` records, and violate the non-breaking invariant constraint.

---

## 2. Decision: Database Migration Workflow

- **Decision**: Synchronize schema using `npx prisma db push` (or `npm run prisma:push`), following DVA Constitution Principle II.
- **Rationale**:
  - The project does not maintain a `prisma/migrations` directory (`ARCHITECTURE.md` section 3.5).
  - Running `prisma migrate dev` or passing `--accept-data-loss` on Render PostgreSQL is strictly forbidden by project rules as it causes drift resets.
  - `prisma db push` safely applies non-destructive additions (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true`).
- **Alternatives Considered**:
  - *`prisma migrate dev`*: Rejected as prohibited by Constitution Principle II.

---

## 3. Decision: Administrative Visibility Toggle API Pattern

- **Decision**: Implement dedicated `PATCH /api/players/:id/visibility` and `PATCH /api/training/courses/:id/visibility` endpoints, while also allowing `isActive` in existing `PUT /api/players/:id`, `PATCH /api/players/:id`, and `PUT /api/training/courses/:id` endpoints.
- **Rationale**:
  - A dedicated endpoint (`PATCH .../visibility`) with body `{ isActive: boolean }` allows fine-grained, atomic toggling without requiring the client to transmit the full entity payload.
  - Updating `PLAYER_SCHEMA` and `COURSE_SCHEMA` in `lib/schemas.ts` with `isActive: B` ensures full edit forms also safely respect and persist the `isActive` state.
  - Both endpoints are placed behind `attachAuth` and `apiAccessPolicy` in `server.ts`, automatically enforcing the `ADMIN` / `SUPERADMIN` access control check.
- **Alternatives Considered**:
  - *Only supporting full PUT requests*: Rejected because it requires transferring full avatar, bio, and schedule data just to flip a single boolean switch, increasing risk of accidental overwrites during race conditions.

---

## 4. Decision: Public Query Isolation & Security Layer

- **Decision**: Public queries filter on `{ isActive: true }` server-side, supplemented by defense-in-depth filtering on the client.
- **Rationale**:
  - In `server.ts`, `GET /api/players`: Check `isStaff(req.user)`. If not staff, attach `where.isActive = true`. For admin/staff, return all players (or respect `?isActive=true|false` if specified).
  - In `server.ts`, `GET /api/training/courses`: If not staff, attach `where: { isActive: true }`. For admin/staff, return all courses.
  - In `server.ts`, `POST /api/training/register`: Verify the requested `courseId`. If found but `course.isActive === false`, return HTTP 400 with message *"This training course or scrimmage session is currently inactive and not accepting registrations."*
  - In `TrainingPage.tsx`: Deep-link handling verifies against loaded courses. If a visitor arrives via `?courseId=<hiddenId>`, the course is not found in public listings, the query param is cleanly cleared, and an alert/toast advises that the program is unavailable.
  - In `PlayersPage.tsx`: Client list strictly displays `p.isActive !== false` as an additional client-side guarantee.
- **Alternatives Considered**:
  - *Client-only filtering*: Rejected because sensitive draft player details and unannounced scrimmage fee structures would leak in public API payloads. Server-side filtering is mandatory.

---

## 5. Decision: Admin Dashboard UI & Filtering UX

- **Decision**:
  - **Cards**: Add an interactive toggle switch + status badge on each card in `PlayersTab.tsx` and `TrainingTab.tsx`.
    - Active badge: `Active / Published` (Emerald styling: `bg-emerald-950/80 text-emerald-400 border border-emerald-800`).
    - Hidden badge: `Hidden` (Amber styling: `bg-amber-950/80 text-amber-400 border border-amber-800`).
  - **Quick Filters**: Add a 3-way segment control at the top of both tabs: `All` | `Active` | `Hidden`.
  - **Player Secondary Filter**: Add a `Missing Avatar` toggle pill in `PlayersTab.tsx` that filters athletes where `!p.avatarUrl || p.avatarUrl.trim() === ''`.
  - **Client API service**: Add `togglePlayerVisibility(id, isActive)` to `playerService` and `toggleCourseVisibility(id, isActive)` to `trainingService` in `src/services/api.ts`.
- **Rationale**:
  - Matches the established Dark Athletic design system (`#0B0F19`, `#111827`, `#161F30`, `#1E293B`).
  - Provides administrators instant visual feedback and 1-click status toggling with optimistic UI updates.
- **Alternatives Considered**:
  - *Hiding toggle switch inside the Edit Modal*: Rejected because quick operational auditing requires rapid toggling without opening and saving modals repeatedly.
