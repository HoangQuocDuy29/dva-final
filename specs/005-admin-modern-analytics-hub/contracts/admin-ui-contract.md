# UI Contract: Admin Navigation, Routing & Placeholder Views

**Feature**: `005-admin-modern-analytics-hub` *(Updated 2026-11-19 for RBAC, Store Phase 2, Tournaments Spec 008 & Tryout Workflow)*

## 1. URL contract (`/admin/dashboard?tab=<id>`)

| `tab` value | Module | Access | Status |
| :--- | :--- | :--- | :--- |
| `overview` (default) | Overview & Analytics | `ADMIN` (non-financial ops), `SUPERADMIN` (full 6-stream analytics) | Implemented |
| `players` | Squad Roster | `SUPERADMIN` only (hidden & redirected for `ADMIN`) | Implemented |
| `training` | Training & Scrimmages | `SUPERADMIN` only | Implemented |
| `coaches` | Coaching Staff | `SUPERADMIN` only | Implemented |
| `applications` | Tryout Applications | `ADMIN` (evaluate / schedule / no-reject / PII stripped), `SUPERADMIN` (full + inline `Level` select + fees/reject/delete) | Implemented & Hardened |
| `courts` | Court Schedule & Slots | `SUPERADMIN` only | Implemented |
| `bookings` | Court Bookings & VietQR | `SUPERADMIN` only | Implemented |
| `store` | DVA Store | `SUPERADMIN` only | **Full Module** (Phase 2 Orders & Products) |
| `tournaments` | Tournaments | `ADMIN` (read-only), `SUPERADMIN` (full CRUD & courtside live) | **Full Module** (Spec 008) |
| `news` | News & Media | `ADMIN` (create/edit, delete blocked), `SUPERADMIN` (full) | Implemented |
| `sheets` | Google Sheets Sync | `SUPERADMIN` only | Implemented |
| `users` | Staff & Roles | `SUPERADMIN` only | Implemented |

Unknown or unauthorized `tab` values → `overview`. In `AdminDashboardPage.tsx`, `!isAdmin` renders the access guard **before** mounting `<AdminDashboardProvider key={currentUser.id}>` so switching accounts never leaves stale requests or `401` console errors.

## 2. Sidebar groups (order is contractual; filtered by role)

1. **Overview** — `overview`
2. **Athletics & Services** — `players`*, `training`*, `coaches`*, `applications`, `courts`*
3. **Commerce & Competition** — `bookings`*, `store`*, `tournaments`
4. **System** — `news`, `sheets`*, `users`*

(*`SUPERADMIN` only; `ADMIN` sees only `ADMIN_ALLOWED_TABS`: `overview`, `tournaments`, `news`, `applications`.)

Badges: `bookings` = pending bookings, `applications` = pending applications, `training` = pending registrations, `tournaments` = pending team fees (`SUPERADMIN`), `store` = pending orders (`SUPERADMIN`); `players`/`training`/`coaches`/`news`/`tournaments` show counts.

## 3. Tournaments view — historical note (FR-007 superseded by Spec 008)

```
Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai.
```

*(Historical note: Originally rendered verbatim as an SC-005 exception; superseded by Spec 008 (`specs/008-tournaments-module/`), where `TournamentsTab.tsx` now implements the full Tournaments & Leagues management workspace.)*

## 4. DVA Store view — historical note (superseded by DVA Store Phase 2)

*(Historical note: Initially specified as a read-only placeholder; now implemented as full Orders Management + Products Catalog + Cloudinary upload + 2-stage Resend shipping emails + `DonHang_Shop` Sheets Upsert.)*

## 5. Preserved component contracts & Lazy-Load Data Contract

`useAdminData.ts` loads only `/api/admin/overview-summary` (+ `/api/admin/tournaments/finance-summary` for `SUPERADMIN`) on mount and lazy-loads permitted tab datasets on tab selection, guarded by `if (!isAdmin || !authService.hasToken()) return;`. Inside `ApplicationsTab.tsx`, `ADMIN` users cannot see row `Reject` buttons or the `REJECTED` conclusion in `EvaluationScorecardModal.tsx`, whereas `SUPERADMIN` gets inline `SENIOR`/`JUNIOR`/`YOUTH` editing (`PATCH /api/admin/tryouts/:id`) synced to open modals.
