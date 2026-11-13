# Feature Specification: Verified 5-Stream Cashflow Analytics (Tryout Fees & Guest Session Revenue) on Admin Dashboard

**Feature Branch**: `feat/dashboard-cashflow`  
**Base Commit**: `66f72c8` (`main`)  
**Created**: 2026-11-13  
**Status**: Approved for Implementation  

---

## 1. Executive Summary

Upgrade the DVA Volleyball Club Admin Dashboard Overview (`/admin/dashboard?tab=overview`) to track all **5 club revenue streams** with clear separation between **Verified Cashflow** (actual collected money) and **Estimated Tuition** (academy enrollments), while adding persistent Neon PostgreSQL tracking for **Guest Sessions** (`GuestSession`) and fee/approval tracking for **Tryout Applications** (`MemberApplication`).

---

## 2. Database Safety & Schema Invariant (Neon PostgreSQL)

- **Additive-Only Changes**: Only add new fields to `MemberApplication` (`entryFee Int @default(100000)`, `approvedAt DateTime?`) and a new `GuestSession` model in `prisma/schema.prisma`.
- **Forbidden**: NEVER run `prisma migrate dev`, `prisma migrate reset`, or destructive seed/reset commands.
- **Sync Commands**: `npx prisma db push` followed by `npx prisma generate`.
- **Data Preservation**: 100% of existing records (`Court`, `Booking`, `TrainingCourse`, `TrainingRegistration`, `Player`, `MemberApplication`, `Product`, `Order`, `OrderItem`) remain intact; existing `APPROVED` `MemberApplication` rows are backfilled with `approvedAt = updatedAt ?? createdAt` and `entryFee = 100000`.

---

## 3. Functional Requirements

### FR-001: Verified Cashflow vs. Estimated Tuition Separation
- Hero card **Total Revenue** (`RevenueKpiCards.tsx`) defaults to **Verified Cashflow**:
  `Court Bookings (PAID) + DVA Store (PAID | SHIPPED | COMPLETED) + Guest Sessions (PAID) + Tryout Fees (APPROVED)`.
- Displays an inline quick toggle (**"Verified Cash Only"** / **"Include Est. Tuition"**) and subtitle breakdown so bank reconciliation against MB Bank is unambiguous.
- All new Analytics labels, badges, tooltips, and table headers are standardized in English.

### FR-002: Stream 1 — Tryout / Member Registration Fees (`MemberApplication`)
- Extend `MemberApplication` with:
  - `entryFee Int @default(100000)`
  - `approvedAt DateTime?`
- On `PATCH /api/members/applications/:id/status`:
  - Approving (`APPROVED`) sets `approvedAt = existing.approvedAt ?? new Date()` and `entryFee` (defaults to `100000`, accepts optional `entryFee >= 0` such as `0` for waived/scholarship cases).
  - Add `PATCH /api/members/applications/:id/entry-fee` (or allow updating `entryFee` for `APPROVED` applications) so Admin can adjust an approved athlete's entry fee (e.g., `0` đ waiver or `100.000` đ) in `ApplicationsTab.tsx`.
- `RevenueTrendChart.tsx`: Buckets Tryout revenue by `approvedAt ?? updatedAt ?? createdAt`.
- Historical Data Protection in `ApplicationsTab.tsx`: Deleting an `APPROVED` application requires an explicit high-visibility confirmation warning explaining that removing it deducts its historical revenue from Dashboard analytics.

### FR-003: Stream 2 — Guest Sessions / Drop-in Pass (`GuestSession`)
- Add `GuestSession` model in `prisma/schema.prisma`:
  - `id` (`String @id @default(uuid())`)
  - `guestName` (`String`)
  - `guestEmail` (`String`)
  - `phone` (`String?`)
  - `position` (`String @default("OH")`)
  - `positionPrivilege` (`String @default("FIXED")`)
  - `level` (`String @default("Junior")`)
  - `sessionDate` (`String`)
  - `sessionTime` (`String`)
  - `courtAddress` (`String?`)
  - `amount` (`Int`)
  - `transferContent` (`String @unique`)
  - `paymentStatus` (`PaymentStatus @default(PENDING)`)
  - `notes` (`String? @db.Text`)
  - `paidAt` (`DateTime?`)
  - `emailSentAt` (`DateTime @default(now())`)
  - `createdAt` (`DateTime @default(now())`)
  - `updatedAt` (`DateTime @updatedAt`)
- Upgrade `generateGuestSessionTransferDescription` in `lib/mailer.ts` to append a short random alphanumeric suffix (e.g., `SCRIM NGUYEN 1511 1900 OH A7K`) so `transferContent` is unique across guests and resends.
- Upgrade `GuestSessionEmailModal.tsx` & `POST /api/admin/send-guest-session-email`:
  - Add checkbox **"Already paid in advance (Mark as PAID)"** (default unchecked -> `PENDING`; checked -> `PAID` + `paidAt = new Date()`).
  - Persist `GuestSession` into Neon PostgreSQL via `prisma.guestSession.create`.
  - Detect potential duplicate `(guestEmail, sessionDate, sessionTime)` on the same day and prompt Admin confirmation before sending duplicate email/record (or allow `forceDuplicate: true`).
- Integrate auto-reconciliation inside `POST /api/webhooks/payment` (`server.ts`):
  - Fallback lookup for `GuestSession` with `paymentStatus: 'PENDING'` matching `transferContent` and `amount >= guestSession.amount`, updating `paymentStatus = 'PAID'` and `paidAt`.
- Admin Endpoints (protected by default-deny `ADMIN`/`SUPERADMIN` policy):
  - `GET /api/admin/guest-sessions`
  - `PATCH /api/admin/guest-sessions/:id/status` (`PENDING` | `PAID` | `CANCELLED`)
  - `DELETE /api/admin/guest-sessions/:id`
- Centralized Management Table inside `OverviewTab.tsx` (no new sidebar tab):
  - **"Guest Sessions & Drop-in Pass"** section below the chart/activity grid with quick jump from the `Guest Sessions` row in `Service Revenue Share`.
  - Status filter (`ALL` | `PENDING` | `PAID` | `CANCELLED`), 1-click **Mark Paid / Cancel / Delete**, and **+ New Guest Email** trigger.

### FR-004: Balanced 8-Card KPI Grid & 5-Stream Color System
- `RevenueKpiCards.tsx` uses a balanced 2×4 grid (`lg:grid-cols-4`):
  - Row 1: `Total Revenue`, `Booking Revenue`, `Shop Revenue`, `Est. Training Tuition`
  - Row 2: `Guest Sessions`, `Tryout Fees`, `Active Athletes`, `Pending Approvals` (includes `pendingGuestSessionsCount`)
- 5-Stream Color Palette across `Service Revenue Share` & `RevenueTrendChart`:
  - Court Bookings: `#F97316` (Orange)
  - Training & Scrimmages: `#38BDF8` (Sky Blue)
  - DVA Store: `#FACC15` (Yellow)
  - Guest Sessions: `#A855F7` (Purple)
  - Tryout Fees: `#10B981` (Emerald)
