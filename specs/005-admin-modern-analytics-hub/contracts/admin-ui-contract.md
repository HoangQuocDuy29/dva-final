# UI Contract: Admin Navigation, Routing & Placeholder Views

**Feature**: `005-admin-modern-analytics-hub`

No REST/API contract changes. This file defines the **UI/URL contract** the implementation must honor.

## 1. URL contract (`/admin?tab=<id>`)

| `tab` value | Module | Access | Status |
| :--- | :--- | :--- | :--- |
| `overview` (default) | Overview & Analytics | ADMIN, SUPERADMIN | existing (redesigned) |
| `players` | Squad Roster | ADMIN, SUPERADMIN | existing — logic untouched |
| `training` | Training & Scrimmages | ADMIN, SUPERADMIN | existing — logic untouched |
| `coaches` | Coaching Staff | ADMIN, SUPERADMIN | existing |
| `applications` | Tryout Applications | ADMIN, SUPERADMIN | existing |
| `courts` | Court Schedule & Slots | ADMIN, SUPERADMIN | existing |
| `bookings` | Court Bookings & VietQR | ADMIN, SUPERADMIN | existing — logic untouched |
| `store` | DVA Store | ADMIN, SUPERADMIN | **new** placeholder |
| `tournaments` | Tournaments | ADMIN, SUPERADMIN | **new** Coming Soon |
| `news` | News & Media | ADMIN, SUPERADMIN | existing |
| `sheets` | Google Sheets Sync | ADMIN, SUPERADMIN | existing |
| `users` | Staff & Roles | SUPERADMIN only | existing (non-SuperAdmin → `overview`) |

Unknown values → `overview`. All existing deep links remain valid.

## 2. Sidebar groups (order is contractual)

1. **Overview** — `overview`
2. **Athletics & Services** — `players`, `training`, `coaches`, `applications`, `courts`
3. **Commerce & Competition** — `bookings`, `store`, `tournaments`
4. **System** — `news`, `sheets`, `users`*

Badges: `bookings` = pending bookings, `applications` = pending applications, `training` = pending registrations; `players`/`training`/`coaches`/`news` show counts.

## 3. Tournaments view — exact copy (FR-007)

```
Feature Under Development - Hệ thống quản lý giải đấu đang được phát triển và dịch vụ sẽ sớm được triển khai.
```

Rendered verbatim. This is the **only** intentional Vietnamese string introduced by this feature (SC-005 exception). No buttons that trigger writes.

## 4. DVA Store view

Read-only placeholder: KPI cards `Store Revenue 0 đ`, `Products 0`, `Orders 0`; category tiles `Jerseys`, `Volleyballs`, `Training Gear`; disabled `Add Product` button with `Coming in Phase 2` badge. No API calls.

## 5. Preserved component contracts

`CourtsTab`, `BookingsTab`, `TrainingTab`, `PlayersTab`, `CoachesTab`, `ApplicationsTab`, `NewsTab`, `UsersTab`, `SheetsTab`, all modals and all hooks keep their **props, handlers, service calls and state** unchanged. They are only re-parented into the new layout shell.
