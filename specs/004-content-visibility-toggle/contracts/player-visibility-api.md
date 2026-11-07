# API Contract: Player Visibility & Public Roster

**Feature**: Soft Visibility & Publish Toggle  
**Module**: Players  
**Date**: 2026-11-07  

---

## 1. Toggle Player Visibility (Admin Only)

Toggles or sets the `isActive` state for a specific player.

- **Method**: `PATCH`
- **Path**: `/api/players/:id/visibility`
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
  "id": "p-12345",
  "fullName": "Nguyen Van A",
  "jerseyNumber": 10,
  "level": "SENIOR",
  "position": "OH",
  "height": 185,
  "weight": 75,
  "spikeTouch": 330,
  "blockTouch": 315,
  "hometownCountry": "Hanoi",
  "country": "Vietnam",
  "countryName": "Vietnam",
  "countryCode": "VN",
  "countryFlag": "🇻🇳",
  "isCaptain": false,
  "captain": false,
  "joined": 2025,
  "joinedYear": 2025,
  "avatarUrl": "https://example.com/avatar.jpg",
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
- **404 Not Found**: Player ID does not exist in database.
  ```json
  { "error": "Player not found" }
  ```
- **400 Bad Request**: Invalid payload format (e.g. `isActive` is missing or not a boolean).
  ```json
  { "error": "Invalid payload" }
  ```

---

## 2. Query Players (Public vs Admin)

Retrieves the list of club players.

- **Method**: `GET`
- **Path**: `/api/players`
- **Authentication**: Optional for public guests; optional Bearer token for admin users.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `level` | `string` | No | Filter by level (`SENIOR`, `JUNIOR`, `YOUTH`) |
| `position` | `string` | No | Filter by position (`OH`, `OP`, `MB`, `S`, `L`) |
| `search` | `string` | No | Search query for name, hometown, or jersey number |
| `all` | `boolean` | No | (Staff only) If `true`, returns both active and hidden players |

### Filtering Logic
1. **Public Guest Request** (No token or non-staff token):
   - Server strictly enforces `where: { isActive: true }`. Hidden players are never transmitted over the wire.
2. **Staff / Admin Request** (`isStaff(req.user) === true`):
   - Returns all players (both active and hidden) with their `isActive` property included, allowing the Admin Dashboard to render status badges and filter controls.
