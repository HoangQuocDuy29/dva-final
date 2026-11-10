# Data Model: Modern Dark Analytics & Modular Admin Hub

**Feature**: `005-admin-modern-analytics-hub`

> [!IMPORTANT]
> **No persistent entities are added or changed.** `prisma/schema.prisma` is untouched. Every structure below is a **client-side, derived view model** computed in memory from data already returned by existing read-only `GET` endpoints.

## Source data (unchanged, already loaded by `useAdminData`)

| Context key | Endpoint (existing) | Fields used by this feature |
| :--- | :--- | :--- |
| `bookings` | `GET /api/bookings` | `paymentStatus`, `totalPrice`, `bookingDate`, `bookingCode`, `customerName`, `courtName` |
| `trainingRegs` | `GET /api/training/registrations` | `status`, `courseId`, `createdAt` |
| `coursesList` | `GET /api/training/courses` | `id`, `price`, `isActive` |
| `players` | `GET /api/players` | `fullName`, `jerseyNumber`, `isActive`, `avatarUrl` |
| `applications`, `coachesList`, `newsList` | existing | counts only |

## Derived view models

### `RevenueBreakdown` (extends `useAdminMetrics` return value)

| Field | Type | Derivation |
| :--- | :--- | :--- |
| `courtRevenue` | `number` | `Σ bookings.totalPrice` where `paymentStatus === 'PAID'` (= existing `totalRevenue`) |
| `trainingRevenue` | `number` | `Σ coursePrice(reg.courseId)` where `reg.status === 'CONFIRMED'`; missing course → `0` |
| `storeRevenue` | `number` | constant `0` (Phase 2) |
| `totalClubRevenue` | `number` | `courtRevenue + trainingRevenue + storeRevenue` |
| `confirmedTrainingCount` | `number` | count of `CONFIRMED` registrations |

Validation: all sums guard `Number(x) || 0` → never `NaN` (EC-002).
Backward compatibility: existing `totalRevenue` key is **kept** (alias of `courtRevenue`) so no current consumer breaks.

### `MonthlyRevenuePoint` (chart series)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `monthKey` | `string` | `YYYY-MM`, last 6 months including current, local time |
| `label` | `string` | English short month, e.g. `Nov` |
| `court` | `number` | PAID bookings grouped by `bookingDate` month |
| `training` | `number` | CONFIRMED regs grouped by `createdAt` month × course price |
| `store` | `number` | `0` |

### `AdminNavItem` / `AdminNavGroup` (static registry, `constants.ts`)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | `AdminTabId` | adds `'STORE' \| 'TOURNAMENTS'` |
| `label` | `string` | English |
| `icon` | `LucideIcon` | |
| `group` | `'OVERVIEW' \| 'ATHLETICS' \| 'COMMERCE' \| 'SYSTEM'` | |
| `badge?` | `number` | pending / count badges (same sources as today) |
| `superAdminOnly?` | `boolean` | `USERS` only |
| `status?` | `'NEW' \| 'SOON'` | `STORE` → `NEW`, `TOURNAMENTS` → `SOON` |
| `keywords` | `string[]` | Quick Search matching |

### `QuickSearchResult`

`{ kind: 'MODULE' | 'PLAYER' | 'BOOKING'; id: string; title: string; subtitle?: string; target: AdminTabId }` — max 5 per kind.

### UI state (context, not persisted server-side)

| Key | Type | Persistence |
| :--- | :--- | :--- |
| `isSidebarCollapsed` | `boolean` | `localStorage['dva_admin_sidebar_collapsed']` |
| `isMobileNavOpen` | `boolean` | memory only |
