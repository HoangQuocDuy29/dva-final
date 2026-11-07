# Quickstart & Verification Guide: Soft Visibility & Publish Toggle

**Feature**: Soft Visibility & Publish Toggle for Players, Training Courses & Scrimmages  
**Spec**: [`specs/004-content-visibility-toggle/spec.md`](spec.md)  
**Date**: 2026-11-07  

---

## 1. Prerequisites & Environment Setup

Ensure the PostgreSQL database connection string is properly configured in `.env`:

```bash
# Verify DATABASE_URL is present
grep DATABASE_URL .env
```

Synchronize the database schema with the new `isActive` fields:

```bash
# Safely push schema changes without migration reset
npm run prisma:push
```

---

## 2. Validation Scenarios

### Scenario 1: Toggle Athlete Visibility & Verify Public Roster

1. **Log in as Admin** via `/admin` and navigate to the **Players** tab.
2. Locate any active athlete (e.g., Captain or Junior athlete). Observe the green badge: `Active / Published`.
3. Click the **Visibility Toggle Switch** on the athlete card.
   - **Expected Result**: 
     - Badge transitions to `Hidden` (Amber/Gray).
     - Toast notification appears: *"Player [Name] visibility updated to Hidden."*
4. Open an Incognito window and navigate to the public roster at `http://localhost:5173/players`.
   - **Expected Result**: The hidden athlete is immediately absent from all squads (Senior, Junior, Youth) and does not appear in search queries.
5. In the Admin Dashboard, switch the quick filter pill to `Hidden`.
   - **Expected Result**: The hidden athlete appears in the filtered list.
6. Toggle the athlete back to active.
   - **Expected Result**: Badge reverts to `Active / Published`; the player re-appears on `http://localhost:5173/players` in their original position.

---

### Scenario 2: Test "Missing Avatar" Quick Filter

1. In the Admin Dashboard, navigate to the **Players** tab.
2. Click the **"Missing Avatar"** filter button on the search toolbar.
   - **Expected Result**: The list instantly filters to show only athlete cards where `avatarUrl` is blank, null, or empty.
3. Add a photo to one of the incomplete profiles and save.
   - **Expected Result**: The updated athlete automatically drops out of the "Missing Avatar" filter list.

---

### Scenario 3: Toggle Training / Scrimmage Package & Protect Direct Links

1. In the Admin Dashboard, navigate to the **Training & Scrimmage** tab.
2. Locate a scrimmage package (e.g. `tc-scrimmage-basic`). Notice the status badge `Active / Published`.
3. Click the **Visibility Toggle Switch** to hide the package.
   - **Expected Result**: Status changes to `Hidden`.
4. Open the public page in an unauthenticated tab: `http://localhost:5173/services/training-scrimmage`.
   - **Expected Result**: The scrimmage card is omitted from the public package list and filter tabs.
5. In the browser URL bar, attempt direct deep linking:  
   `http://localhost:5173/services/training-scrimmage?courseId=tc-scrimmage-basic`
   - **Expected Result**:
     - The enrollment modal does NOT open.
     - The invalid `?courseId=...` is stripped cleanly from the browser URL (`setSearchParams({}, { replace: true })`).
     - A non-intrusive alert/toast indicates that the selected program is currently unavailable.

---

### Scenario 4: Direct Registration Rejection Gate (API Test)

Attempt to submit a registration payload for a hidden course via `curl`:

```bash
curl -X POST http://localhost:3000/api/training/register \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "tc-scrimmage-basic",
    "fullName": "Test Trainee",
    "phone": "0912345678",
    "email": "test@example.com"
  }'
```

**Expected Response**:
```json
HTTP/1.1 400 Bad Request
{
  "success": false,
  "error": "This training course or scrimmage session is currently inactive and not accepting registrations."
}
```

---

## 3. Automated Compilation & Quality Gates

Run the strict verification suite before code integration:

```bash
# Gate 1: Type check with 0 TypeScript errors
npx tsc --noEmit

# Gate 2: Production bundle build
npm run build
```

Both commands MUST exit with code `0`.
