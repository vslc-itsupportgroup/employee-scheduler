# Project Structure - Complete Overview

## 📁 Full Directory Tree

```
Web-Based Employee Schedule/
│
├── 📄 README.md                          # Project overview & features
├── 📄 SETUP_GUIDE.md                     # Step-by-step installation
├── 📄 FEATURES.md                        # Detailed feature documentation
├── 📄 API.md                             # Complete API reference
├── 📄 PROJECT_SUMMARY.md                 # Implementation status
├── 📄 QUICK_REFERENCE.md                 # Quick start guide
├── 📄 STRUCTURE.md                       # This file
├── 📄 .gitignore                         # Git ignore rules
├── 📄 docker-compose.yml                 # Docker orchestration
├── 📄 startup.sh                         # Linux/Mac startup script
├── 📄 startup.bat                        # Windows startup script
├── 📄 postman_collection.json            # API test collection
│
├── 📁 backend/                           # Node.js/Express Backend
│   ├── 📄 package.json                   # Backend dependencies
│   ├── 📄 tsconfig.json                  # TypeScript config
│   ├── 📄 .env.example                   # Environment template
│   ├── 📄 .gitignore                     # Git ignore for backend
│   ├── 📄 Dockerfile                     # Docker image config
│   │
│   └── 📁 src/
│       ├── 📄 server.ts                  # Main Express server
│       │
│       ├── 📁 config/
│       │   └── 📄 database.ts            # PostgreSQL connection
│       │
│       ├── 📁 middleware/
│       │   └── 📄 auth.ts                # JWT authentication
│       │
│       ├── 📁 models/
│       │   ├── 📄 User.ts                # User data model
│       │   ├── 📄 Schedule.ts            # Schedule data model
│       │   ├── 📄 ChangeRequest.ts       # Change request model
│       │   └── 📄 AuditLog.ts            # Audit log model
│       │
│       ├── 📁 controllers/
│       │   └── 📄 authController.ts      # Auth business logic
│       │
│       ├── 📁 routes/
│       │   ├── 📄 auth.ts                # Auth endpoints
│       │   ├── 📄 schedules.ts           # Schedule endpoints
│       │   ├── 📄 changeRequests.ts      # Change request endpoints
│       │   ├── 📄 approvals.ts           # Approval endpoints
│       │   ├── 📄 users.ts               # User endpoints
│       │   └── 📄 audit.ts               # Audit endpoints
│       │
│       └── 📁 db/
│           └── 📄 schema.sql             # Database schema
│
├── 📁 frontend/                          # React/TypeScript Frontend
│   ├── 📄 package.json                   # Frontend dependencies
│   ├── 📄 tsconfig.json                  # TypeScript config
│   ├── 📄 tsconfig.node.json             # TypeScript Vite config
│   ├── 📄 vite.config.ts                 # Vite build config
│   ├── 📄 tailwind.config.js             # Tailwind CSS config
│   ├── 📄 postcss.config.js              # PostCSS config
│   ├── 📄 .gitignore                     # Git ignore for frontend
│   ├── 📄 Dockerfile                     # Docker image config
│   ├── 📄 nginx.conf                     # Nginx config
│   ├── 📄 index.html                     # HTML entry point
│   │
│   └── 📁 src/
│       ├── 📄 main.tsx                   # React entry point
│       ├── 📄 App.tsx                    # Main app component
│       │
│       ├── 📁 pages/
│       │   ├── 📄 LoginPage.tsx          # Login page
│       │   ├── 📄 RegisterPage.tsx       # Registration page
│       │   ├── 📄 DashboardPage.tsx      # Schedule dashboard
│       │   └── 📄 ApprovalsPage.tsx      # Approval review page
│       │
│       ├── 📁 components/
│       │   ├── 📄 Header.tsx             # Navigation header
│       │   ├── 📄 CalendarView.tsx       # Calendar display
│       │   ├── 📄 ChangeRequestForm.tsx  # Request form
│       │   └── 📄 ProtectedRoute.tsx     # Route protection
│       │
│       ├── 📁 context/
│       │   └── 📄 AuthContext.tsx        # Auth state management
│       │
│       ├── 📁 api/
│       │   └── 📄 client.ts              # API client & endpoints
│       │
│       └── 📁 styles/
│           └── 📄 index.css              # Global styles
```

## 🏗️ Architecture Layers

### Presentation Layer (Frontend)
```
frontend/src/
├── pages/          - Page-level components (routing)
├── components/     - Reusable UI components
├── context/        - State management (Auth)
├── api/           - API integration
└── styles/        - Styling
```

### Business Logic Layer (Backend)
```
backend/src/
├── controllers/    - Business logic & validation
├── middleware/     - Cross-cutting concerns (auth, validation)
├── models/        - Data structure definitions
└── routes/        - API endpoint definitions
```

### Data Layer (Database)
```
backend/src/db/
└── schema.sql     - Database schema & structure
```

## 🔄 Data Flow

```
User Input (Frontend)
        ↓
React Component
        ↓
API Client (axios)
        ↓
Express Route Handler
        ↓
Controller (Business Logic)
        ↓
Database Query
        ↓
PostgreSQL Database
        ↓
[Response Back Through Chain]
        ↓
UI Update (React State)
```

## 📊 Database Schema Relationships

```
users (1) ←→ (many) schedules
  ├─ id (PK)
  ├─ email (UNIQUE)
  ├─ role (employee/manager/admin)
  └─ is_active

shift_types (1) ←→ (many) schedules
  ├─ id (PK)
  ├─ code (UNIQUE)
  └─ name

schedules
  ├─ id (PK)
  ├─ employee_id (FK → users)
  ├─ shift_type_id (FK → shift_types)
  ├─ scheduled_date
  └─ status (approved/pending/rejected)

change_requests
  ├─ id (PK)
  ├─ schedule_id (FK → schedules)
  ├─ requested_by (FK → users)
  ├─ requested_shift_type_id (FK → shift_types)
  └─ status (pending/approved/rejected)

audit_logs
  ├─ id (PK)
  ├─ entity_type (schedule/change_request/approval)
  ├─ entity_id (UUID)
  ├─ performed_by (FK → users)
  └─ action (CREATE/UPDATE/APPROVE/REJECT)
```

## 🔐 Authentication Flow

```
1. User submits login form
   ↓
2. Frontend sends credentials to /api/auth/login
   ↓
3. Backend validates with database
   ↓
4. If valid, generate JWT token
   ↓
5. Return token to frontend
   ↓
6. Frontend stores token in localStorage
   ↓
7. Frontend includes token in Authorization header for all requests
   ↓
8. Backend middleware verifies token on protected routes
```

## 🔄 Change Request Workflow

```
Employee clicks "Request Change"
         ↓
Submit ChangeRequest form
         ↓
Backend validates & creates change_request record (status: pending)
         ↓
Original schedule locked from editing
         ↓
Manager views Approvals tab
         ↓
Manager reviews request (side-by-side comparison)
         ↓
Manager approves OR rejects
         ↓
If approved:
  - Update schedule with new shift
  - Update change_request status: approved
  - Log to audit_logs
  - Employee notified
  
If rejected:
  - Keep original schedule
  - Update change_request status: rejected
  - Add remarks from manager
  - Log to audit_logs
  - Employee notified
```

## 📡 API Endpoint Structure

```
/api
├── /auth
│   ├── POST   /register          - Create account
│   ├── POST   /login             - Login & get token
│   └── GET    /me                - Get current user
│
├── /schedules
│   ├── GET    /:userId           - List user schedules
│   ├── POST   /                  - Create schedule
│   └── PUT    /:id               - Update schedule
│
├── /change-requests
│   ├── GET    /                  - List requests
│   └── POST   /                  - Create request
│
├── /approvals
│   ├── GET    /pending           - Get pending approvals
│   └── POST   /:id               - Approve/reject
│
├── /users
│   ├── GET    /                  - List users
│   └── GET    /roles             - Get roles
│
└── /audit
    └── GET    /                  - View audit logs
```

## 🔌 Component Hierarchy

```
App
├── AuthProvider (Context)
│   └── Routes
│       ├── LoginPage
│       ├── RegisterPage
│       └── ProtectedRoute
│           ├── Header
│           ├── DashboardPage
│           │   └── CalendarView
│           ├── ApprovalsPage
│           │   └── [Modal for approval]
│           └── [Other protected pages]
```

## 📦 Dependencies

### Backend (Node.js)
```json
{
  "express": "4.18.2",           // Web framework
  "pg": "8.11.3",                // PostgreSQL driver
  "bcryptjs": "2.4.3",           // Password hashing
  "jsonwebtoken": "9.1.2",       // JWT tokens
  "typescript": "5.3.3",         // Type safety
  "cors": "2.8.5",               // CORS support
  "helmet": "7.1.0"              // Security headers
}
```

### Frontend (React)
```json
{
  "react": "18.2.0",             // UI framework
  "react-dom": "18.2.0",         // DOM rendering
  "react-router-dom": "6.20.0",  // Routing
  "axios": "1.6.2",              // HTTP client
  "tailwindcss": "3.4.1",        // CSS utility framework
  "typescript": "5.3.3"          // Type safety
}
```

## 🚀 Build & Runtime

### Development
- Frontend: Vite dev server with HMR
- Backend: ts-node for TypeScript execution
- Database: Docker or local PostgreSQL

### Production
- Frontend: Vite build → static files → Nginx
- Backend: TypeScript compiled to JavaScript → Node.js
- Database: PostgreSQL in Docker or managed service

## 📋 Key Files & Their Purposes

| File | Purpose | Language |
|------|---------|----------|
| server.ts | Main Express app & middleware setup | TypeScript |
| authController.ts | Login/register logic & JWT generation | TypeScript |
| auth.ts (middleware) | Token verification & role checks | TypeScript |
| schema.sql | Database tables & relationships | SQL |
| App.tsx | Main React component & routing | TypeScript |
| AuthContext.tsx | Global auth state management | TypeScript |
| client.ts | API endpoints & axios instance | TypeScript |
| CalendarView.tsx | Calendar UI component | TypeScript |
| vite.config.ts | Vite build & dev config | TypeScript |
| docker-compose.yml | Multi-container orchestration | YAML |

## 🔐 Security Architecture

```
Frontend
  ↓
Axios Interceptor (adds JWT token)
  ↓
Express CORS Middleware (validates origin)
  ↓
Express Body Parser (validates JSON)
  ↓
Route Handler
  ↓
Auth Middleware (verifies JWT token)
  ↓
Authorization Check (verifies role)
  ↓
Input Validation (express-validator)
  ↓
Database Operation (parameterized queries)
  ↓
Response
```

## 🧪 Testing Strategy

### Unit Testing (Recommended additions)
- Controller functions
- Model functions
- Utility functions

### Integration Testing
- API endpoints
- Database operations
- Auth flow

### E2E Testing
- Complete user workflows
- Multi-role scenarios
- Approval workflows

### Manual Testing
- Use Postman collection
- Test all user roles
- Verify approval flows

## 📈 Scalability Considerations

### Current Limitations
- Single server deployment
- In-memory auth (no session persistence)
- No caching layer
- No database replication

### Future Improvements
- Horizontal scaling with load balancer
- Redis for caching & sessions
- Database read replicas
- CDN for static assets
- Microservices architecture
- API gateway

## 🎯 Code Organization Principles

1. **Separation of Concerns**
   - Controllers handle business logic
   - Routes define endpoints
   - Middleware handles cross-cutting concerns

2. **DRY (Don't Repeat Yourself)**
   - Reusable components in frontend
   - API client centralization
   - Shared models & types

3. **Type Safety**
   - TypeScript throughout
   - Interface definitions
   - Strict mode enabled

4. **Security First**
   - Authentication on protected routes
   - Authorization by role
   - Input validation
   - Parameterized queries

5. **Maintainability**
   - Clear file structure
   - Meaningful naming
   - Comments for complex logic
   - Documentation files

---

This structure enables easy scaling, maintenance, and addition of new features while maintaining security and separation of concerns.
