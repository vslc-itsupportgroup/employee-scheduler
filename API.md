# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "employee",
  "department": "Engineering"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee"
  }
}
```

---

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee",
    "department": "Engineering"
  }
}
```

---

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "employee",
  "department": "Engineering"
}
```

---

## Schedule Endpoints

### Get User Schedules
```http
GET /schedules/:userId?month=1&year=2024
Authorization: Bearer <token>
```

**Parameters:**
- `userId` (required): UUID of the employee
- `month` (optional): Month number (1-12)
- `year` (optional): Year

**Response (200):**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "shift_type_id": "uuid",
    "scheduled_date": "2024-01-15",
    "status": "approved",
    "shift_code": "7-4",
    "shift_name": "Regular Shift",
    "employee_name": "John Doe",
    "created_at": "2024-01-10T10:30:00Z"
  }
]
```

---

### Create Schedule
```http
POST /schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee_id": "uuid",
  "shift_type_id": "uuid",
  "scheduled_date": "2024-01-15"
}
```

**Required Roles:** `manager`, `admin`

**Response (201):**
```json
{
  "id": "uuid",
  "message": "Schedule created"
}
```

---

### Update Schedule
```http
PUT /schedules/:scheduleId
Authorization: Bearer <token>
Content-Type: application/json

{
  "shift_type_id": "uuid"
}
```

**Required Roles:** `manager`, `admin`

**Note:** Updates to approved schedules automatically create a change request

**Response (200):**
```json
{
  "message": "Schedule updated",
  "changeRequestId": "uuid"
}
```

---

## Change Request Endpoints

### Get Change Requests
```http
GET /change-requests
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "schedule_id": "uuid",
    "requested_by": "uuid",
    "requested_shift_type_id": "uuid",
    "reason": "Family emergency",
    "status": "pending",
    "created_at": "2024-01-10T11:00:00Z",
    "employee_name": "John Doe",
    "original_schedule": {
      "date": "2024-01-15",
      "shift_code": "7-4",
      "shift_name": "Regular Shift"
    },
    "requested_shift": {
      "shift_code": "RD",
      "shift_name": "Rest Day"
    }
  }
]
```

---

### Create Change Request
```http
POST /change-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "schedule_id": "uuid",
  "requested_shift_type_id": "uuid",
  "reason": "Family emergency"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "message": "Change request created"
}
```

---

## Approval Endpoints

### Get Pending Approvals
```http
GET /approvals/pending
Authorization: Bearer <token>
```

**Required Roles:** `manager`, `admin`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "schedule_id": "uuid",
    "employee_name": "John Doe",
    "reason": "Family emergency",
    "status": "pending",
    "created_at": "2024-01-10T11:00:00Z",
    "original_schedule": {
      "date": "2024-01-15",
      "shift_code": "7-4"
    },
    "requested_shift": {
      "shift_code": "RD"
    }
  }
]
```

---

### Approve/Reject Change Request
```http
POST /approvals/:changeRequestId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "remarks": "Approved - cover arranged"
}
```

**Required Roles:** `manager`, `admin`

**Status Values:** `approved`, `rejected`

**Response (200):**
```json
{
  "message": "Change request processed",
  "status": "approved"
}
```

---

## User Endpoints

### Get Users
```http
GET /users
Authorization: Bearer <token>
```

**Required Roles:** `manager`, `admin`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee",
    "department": "Engineering"
  }
]
```

---

### Get Available Roles
```http
GET /users/roles
Authorization: Bearer <token>
```

**Required Roles:** `admin`

**Response (200):**
```json
{
  "roles": ["employee", "manager", "admin"]
}
```

---

## Audit Endpoints

### Get Audit Logs
```http
GET /audit?entity_type=schedule&entity_id=uuid&limit=100&offset=0
Authorization: Bearer <token>
```

**Required Roles:** `manager`, `admin`

**Parameters:**
- `entity_type` (optional): `schedule`, `change_request`, `approval`, `user`
- `entity_id` (optional): UUID of entity
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "action": "CREATE",
    "entity_type": "schedule",
    "entity_id": "uuid",
    "performed_by": "uuid",
    "old_values": null,
    "new_values": {
      "shift_code": "7-4",
      "scheduled_date": "2024-01-15"
    },
    "created_at": "2024-01-10T10:30:00Z"
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 409 Conflict
```json
{
  "error": "Email already registered"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

---

## Health Check

### Check API Status
```http
GET /health
```

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-10T10:30:00Z"
}
```

---

## Rate Limiting (Future Implementation)
- Coming in Phase 2
- Planned: 100 requests per minute per IP

## Pagination (Future Implementation)
- Coming in Phase 2
- Support for cursor-based pagination for large datasets
