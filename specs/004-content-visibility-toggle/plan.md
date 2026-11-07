# Implementation Plan: Soft Visibility & Publish Toggle for Players, Training Courses & Scrimmages

**Branch**: `004-content-visibility-toggle` | **Date**: 2026-11-07 | **Spec**: [`specs/004-content-visibility-toggle/spec.md`](spec.md)

**Input**: Feature specification from `specs/004-content-visibility-toggle/spec.md`

---

## 1. Summary

Implement a non-breaking soft visibility toggle (`isActive: true | false`) for club **Players**, **Training Courses**, and **Scrimmages**. This empowers administrators to hide incomplete athlete profiles or pause training/scrimmage packages without deleting underlying database records, breaking foreign key relationships, or disrupting historical reports. Public queries and direct deep links are guarded server-side and client-side, while administrators receive toggle switches, visual status badges, quick status filters (`All` | `Active` | `Hidden`), and a `Missing Avatar` auditor.

---

## 2. Technical Context

- **Language/Version**: TypeScript 5.8, Node.js v20+, React 19
- **Primary Dependencies**: Express v4 (`server.ts`), Prisma ORM v7 (`@prisma/client`, `@prisma/adapter-pg`), Vite 8, Tailwind CSS v4, Lucide React, i18next
- **Storage**: PostgreSQL (hosted on Render) accessed exclusively through Prisma ORM v7 (`lib/prisma.ts`)
- **Testing / Quality Gate**: Strict type checking via `npx tsc --noEmit` and production build bundle via `npm run build`
- **Target Platform**: Node.js Linux Container (Render) + Modern Desktop/Mobile Web Browsers (Chrome, Safari, Firefox, Edge)
- **Project Type**: Full-stack web application (Express REST API + React SPA)
- **Performance Goals**: Sub-100ms response time for toggle PATCH APIs; zero database round-trip regression on public page loads
- **Constraints**:
  - 100% English Public UI Policy across all new labels, badges, alerts, and toasts
  - Zero breaking changes to existing columns, models, foreign keys, and API contracts
  - Authorized schema migrations applied exclusively via `npm run prisma:push` (`prisma db push`)
  - Strict Default-Deny RBAC on administrative visibility endpoints (`ADMIN` or `SUPERADMIN` role required)
- **Scale/Scope**: ~100+ athletes across 3 squad levels, ~20+ training/scrimmage packages, thousands of monthly public visitors

---

## 3. Constitution Check

*GATE: All checks evaluated against `.specify/memory/constitution.md`. Must pass before implementation.*

| Principle | Check / Rule | Evaluation | Status |
| :--- | :--- | :--- | :--- |
| **I. English-First & 100% English Public UI** | All public labels, badges, toast notifications, and alerts must be 100% English. | Status badges use "Active / Published" & "Hidden"; error texts use clear athletic English. | **PASS** |
| **II. Backward-Compatible API & Schema Stability** | No columns removed or renamed. Schema pushed via `prisma db push` without `--accept-data-loss`. | `isActive Boolean @default(true)` added safely. Existing queries, relations, and contracts remain intact. | **PASS** |
| **III. PostgreSQL Single Source of Truth** | All queries and mutations run via Prisma ORM to PostgreSQL. No JSON file mutations. | Toggle operations run via `prisma.player.update` and `prisma.trainingCourse.update`. | **PASS** |
| **IV. Fire-and-Forget Isolation for 3rd Parties** | Side effects (emails, webhooks) must not block primary responses. | Registration rejection short-circuits safely without dispatching webhooks or emails. | **PASS** |
| **V. Modular Domain Architecture & Living Context Map** | Admin changes confined to domain modules; `ARCHITECTURE.md` updated within task. | Admin changes localized to `PlayersTab.tsx` and `TrainingTab.tsx`; `ARCHITECTURE.md` to be synced. | **PASS** |

---

## 4. Project Structure

### Documentation & Design Artifacts (this feature)

```text
specs/004-content-visibility-toggle/
├── spec.md              # Functional specification and quality checklist
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical decisions, schema analysis, and API design
├── data-model.md        # Phase 1: Database models, DTO mappers, and state machine
├── quickstart.md        # Phase 1: End-to-end verification and testing scenarios
└── contracts/           # Phase 1: Interface contracts
    ├── player-visibility-api.md
    └── course-visibility-api.md
```

### Source Code Changes Map

```text
prisma/
└── schema.prisma                    # Add isActive Boolean @default(true) to Player & TrainingCourse

lib/
├── schemas.ts                       # Add isActive: B to PLAYER_SCHEMA, COURSE_SCHEMA & VISIBILITY_TOGGLE_SCHEMA
└── prisma.ts                        # Map isActive in toPlayerDto and toCourseDto

server.ts                            # Update GET /api/players & GET /api/training/courses with isActive filter;
                                     # Add PATCH /api/players/:id/visibility & PATCH /api/training/courses/:id/visibility;
                                     # Guard POST /api/training/register against inactive courses

src/
├── types/index.ts                   # Add isActive?: boolean to Player & TrainingCourse interfaces
├── services/api.ts                  # Add togglePlayerVisibility & toggleCourseVisibility methods
├── pages/
│   ├── PlayersPage.tsx              # Safeguard public roster to isActive !== false
│   ├── TrainingPage.tsx             # Handle deep-links to inactive courses gracefully
│   └── admin/tabs/
│       ├── PlayersTab.tsx           # Add toggle switch, status badge, status filter (All/Active/Hidden), & Missing Avatar filter
│       └── TrainingTab.tsx          # Add toggle switch, status badge, and status filter (All/Active/Hidden)

ARCHITECTURE.md                      # Synchronize Data Models, Security/Visibility Rules & Query Map
```

---

## 5. Complexity Tracking

> **No Constitution Violations**: The design adheres strictly to the single-model `TrainingCourse` approach, utilizes existing Prisma patterns, and introduces zero schema regressions or complex architectural layers.

| Decision | Rationale | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| Single `TrainingCourse` Model for Scrimmages | Scrimmages are already modeled within `TrainingCourse` | Creating a separate `Scrimmage` table would break existing booking/registration foreign keys |
| Dedicated `PATCH .../visibility` Endpoint | Provides atomic, lightweight status mutation | Requiring full PUT requires transferring all fields (avatar, bio, schedule) risking race-condition data loss |
