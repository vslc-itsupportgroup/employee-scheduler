# Web-Based Employee Scheduling & Attendance Management System

A modern, calendar-driven web application for managing employee schedules with approval workflows and full audit trails.

## 📋 Project Overview

This system replaces manual Excel scheduling with a secure, role-based platform featuring:
- 📅 Calendar-based schedule display (month/week views)
- ✅ Approval-driven change workflow
- 👥 Role-based access control (Employee, Manager, Admin)
- 📝 Complete audit trail of all changes
- 🔐 Secure authentication & authorization

## 🏗️ Architecture

```
Project Root/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── controllers/    # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── models/         # Data models
│   │   ├── middleware/     # Auth & validation
│   │   ├── config/         # Configuration
│   │   └── server.ts       # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React TypeScript UI
│   ├── src/
│   │   ├── pages/          # Route pages
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth context
│   │   ├── api/            # API client
│   │   └── App.tsx         # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md

```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Backend Setup

1. **Setup Database**
   ```bash
   # Create database
   createdb employee_scheduling
   
   # Load schema
   psql employee_scheduling < backend/src/db/schema.sql
   ```

2. **Install & Configure Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

3. **Start Backend Server**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:5000

### Frontend Setup

1. **Install & Configure Frontend**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Frontend Dev Server**
   ```bash
   npm run dev
   ```
   UI runs on http://localhost:3000

## 🔑 Key Features

### Authentication
- User registration with role assignment
- Secure JWT-based login
- Password hashing with bcrypt
- Session management

### Schedule Management
- Create/view/update employee schedules
- Color-coded shift types:
  - 7–4: Regular Shift
  - RD: Rest Day
  - VL: Vacation Leave
  - SPL: Special Leave
  - HDD: Holiday
- Monthly and weekly calendar views

### Change Request Workflow
1. Employee requests shift/rest day change
2. Manager receives notification of pending requests
3. Manager reviews and approves/rejects with remarks
4. Original schedule locks until approval
5. Approved changes apply immediately
6. All changes logged with timestamp and user info

### Role-Based Access

**Employee**
- View assigned schedule
- Request shift changes with reason
- Track request status
- Cannot directly modify approved schedules

**Manager**
- Create and assign schedules
- Review pending change requests
- Approve/reject with remarks
- View employee schedules
- Access audit logs

**Admin**
- All manager capabilities
- User management
- Shift type configuration
- System-wide settings
- Full audit trail access

### Audit Trail
- Complete history of all changes
- Records: who, what, when, why
- Automatic timestamps
- Old and new values logged
- Replaces manual version tracking

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Schedules
- `GET /api/schedules/:userId` - Get user schedules
- `POST /api/schedules` - Create schedule (Manager)
- `PUT /api/schedules/:scheduleId` - Update schedule (Manager)

### Change Requests
- `GET /api/change-requests` - List change requests
- `POST /api/change-requests` - Create change request (Employee)

### Approvals
- `GET /api/approvals/pending` - Get pending approvals (Manager)
- `POST /api/approvals/:changeRequestId` - Approve/reject request

### Users
- `GET /api/users` - List users (Manager)
- `GET /api/users/roles` - Get available roles

### Audit
- `GET /api/audit` - View audit logs (Manager/Admin)

## 🔐 Security Features

- JWT token-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt (10 salt rounds)
- CORS protection
- Input validation with express-validator
- SQL injection prevention (parameterized queries)
- Helmet.js security headers
- Secure database connection pooling

## 📊 Database Schema

### Core Tables
- `users` - User accounts and roles
- `shift_types` - Available shift configurations
- `schedules` - Employee work schedules
- `change_requests` - Requested schedule changes
- `audit_logs` - Complete change history

### Relationships
```
users → schedules (creator)
users → schedules (approver)
users ← change_requests (requester)
shift_types ← schedules
shift_types ← change_requests
schedules → change_requests
```

## 🛣️ Implementation Roadmap

### Phase 1: Core Functionality ✅
- User authentication
- Schedule CRUD
- Calendar display
- Basic approval workflow

### Phase 2: Advanced Features
- Email notifications
- Bulk schedule creation
- Conflict detection
- Recurring schedules

### Phase 3: Enhancements
- Mobile app version
- Advanced reporting
- Payroll integration
- SMS notifications

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 📦 Deployment

### Production Build
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ folder with web server
```

### Docker (Optional)
```bash
docker-compose up
```

## 🤝 Contributing

1. Create feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open Pull Request

## 📜 License

MIT License - see LICENSE file for details

## 📞 Support

For issues or questions, please open an issue in the repository.

## 🎯 Success Criteria

✅ Schedule changes cannot occur without approval
✅ Managers have full visibility and control  
✅ Employees clearly see approved schedules
✅ Calendar view replaces Excel usage
✅ All schedule changes are traceable
✅ System is mobile-responsive
✅ Non-technical staff can use easily
