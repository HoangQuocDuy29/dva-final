# API Contract: Course & Scrimmage Visibility & Registration Gate

**Feature**: Soft Visibility & Publish Toggle  
**Module**: Training & Scrimmages  
**Date**: 2026-11-07  

---

## 1. Toggle Course / Scrimmage Visibility (Admin Only)

Toggles or sets the `isActive` state for a specific training course or scrimmage session.

- **Method**: `PATCH`
- **Path**: `/api/training/courses/:id/visibility`
- **Authentication**: Required (`Authorization: Bearer <dva_token>`)
- **Authorization**: `ADMIN` or `SUPERADMIN`

### Request Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "isActive": false
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `isActive` | `boolean` | Yes | Target visibility state (`true` = published, `false` = hidden) |

### Response 200 OK

```json
{
  "id": "tc-scrimmage-basic",
  "title": "Team Scrimmage Matchplay",
  "level": "Open Scrimmage",
  "coachName": "Coach Tuan Anh",
  "coachTitle": "Lead Match Coordinator",
  "schedule": "Saturday 19:30 - 21:30",
  "duration": "2 hours matchplay",
  "price": 150000,
  "priceUnit": "/ player / session",
  "description": "Continuous structured volleyball scrimmage.",
  "maxSlots": 18,
  "enrolledSlots": 8,
  "isActive": false
}
```

### Error Responses

- **401 Unauthorized**: No or invalid Bearer token provided.
  ```json
  { "error": "Authentication required." }
  ```
- **403 Forbidden**: User is not `ADMIN` or `SUPERADMIN`.
  ```json
  { "error": "You do not have permission to perform this action." }
  ```
- **404 Not Found**: Course ID does not exist in database.
  ```json
  { "error": "Course not found" }
  ```

---

## 2. Query Courses & Scrimmages (Public vs Admin)

Retrieves training courses and scrimmage sessions.

- **Method**: `GET`
- **Path**: `/api/training/courses`
- **Authentication**: Optional for public guests; optional Bearer token for admin users.

### Filtering Logic
1. **Public Guest Request** (No token or non-staff token):
   - Server strictly enforces `where: { isActive: true }`.
2. **Staff / Admin Request** (`isStaff(req.user) === true`):
   - Returns all courses and scrimmage packages with their `isActive` property included.

---

## 3. Training & Scrimmage Registration Gate

Registers a participant for a training course or scrimmage session.

- **Method**: `POST`
- **Path**: `/api/training/register`
- **Authentication**: Public

### Request Body

```json
{
  "courseId": "tc-scrimmage-basic",
  "fullName": "Le Van B",
  "phone": "0987654321",
  "email": "trainee@example.com",
  "notes": "Looking forward to scrimmage"
}
```

### Registration Validation Behavior
- The server looks up the referenced `courseId`.
- **Active Course (`isActive === true`)**: Registration proceeds normally, creating a `TrainingRegistration` record, dispatching confirmation email (bilingual) via Resend, and syncing to Google Sheets asynchronously.
- **Hidden / Inactive Course (`isActive === false`)**: The server immediately aborts the transaction and returns:
  - **Status**: `400 Bad Request`
  - **Body**:
    ```json
    {
      "success": false,
      "error": "This training course or scrimmage session is currently inactive and not accepting registrations."
    }
    ```
