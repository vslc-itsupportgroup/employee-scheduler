# Quick Reference Guide

## 🚀 Getting Started (5 minutes)

### Option 1: Using Docker (Easiest)
```bash
# Windows
startup.bat

# Linux/Mac
bash startup.sh

# Open http://localhost:3000
```

### Option 2: Manual Setup
```bash
# Terminal 1: Backend
cd backend && npm install && npm run dev

# Terminal 2: Frontend
cd frontend && npm install && npm run dev

# Terminal 3: Database (if not using Docker)
createdb employee_scheduling
psql employee_scheduling < backend/src/db/schema.sql
```

## 📋 User Roles & Capabilities

### 👤 Employee
- Login/register
- View own schedule
- Request shift changes
- Track request status
- Cannot modify approved schedules
- Cannot approve requests

### 👨‍💼 Manager
- All employee capabilities
- Create & assign schedules
- View team schedules
- Review pending requests
- Approve/reject changes
- Add remarks
- View audit logs

### 🛠️ Administrator
- All manager capabilities
- Manage user accounts
- Configure shift types
- System settings
- Full audit access

## 🔏 Test Accounts

After registration, you have these roles available:
- Register as `employee` - Employee access
- Register as `manager` - Manager access
- Register as `admin` - Administrator access

## 📱 Key Pages

| URL | Access | Purpose |
|-----|--------|---------|
| `/login` | Public | User login |
| `/register` | Public | Account creation |
| `/dashboard` | Protected | View schedule |
| `/approvals` | Manager+ | Review requests |

## 🔄 Typical Workflows

### Requesting a Schedule Change (as Employee)
1. Go to Dashboard
2. Click on scheduled date
3. Select new shift type
4. Add reason
5. Click "Submit Request"
6. Status changes to "Pending"
7. Manager reviews and approves/rejects

### Approving a Change (as Manager)
1. Go to Approvals tab
2. See pending requests
3. Click request to review
4. View side-by-side comparison
5. Add remarks (optional)
6. Click Approve or Reject
7. Employee is notified

### Creating a Schedule (as Manager)
1. Go to Dashboard
2. Click "Create Schedule"
3. Select employee
4. Choose shift type
5. Pick date(s)
6. Save
7. Schedule appears on calendar

## 🌐 API Quick Reference

```bash
# Get token (use in Authorization header)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Check server health
curl http://localhost:5000/api/health

# Get current user
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/auth/me

# Get my schedules
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/schedules/<userId>

# Create change request
curl -X POST http://localhost:5000/api/change-requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"schedule_id":"uuid","requested_shift_type_id":"uuid","reason":"reason"}'
```

## 🛠️ Common Commands

### Start Services
```bash
# All in one
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Backend
```bash
cd backend

# Development
npm run dev

# Production build
npm run build
npm start

# Database migrations
npm run migrate
```

### Frontend
```bash
cd frontend

# Development
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

## 📊 Shift Types

| Code | Meaning |
|------|---------|
| 7-4 | Regular Shift (7am-4pm) |
| RD | Rest Day |
| VL | Vacation Leave |
| SPL | Special Leave |
| HDD | Holiday |

## 🔐 Security

- **JWT Tokens**: Valid for 7 days by default
- **Password**: Hashed with bcrypt
- **Token Storage**: localStorage
- **CORS**: Restricted to configured origin
- **HTTPS**: Use in production

## ⚙️ Configuration Files

### Backend .env
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=employee_scheduling
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=change_me_in_production
CORS_ORIGIN=http://localhost:3000
```

### Frontend URLs
- Development: http://localhost:3000
- API: http://localhost:5000/api

## 📂 Important Directories

```
frontend/src/
├── pages/         - Page components
├── components/    - Reusable UI components
├── context/       - Auth state management
└── api/          - API client

backend/src/
├── controllers/   - Business logic
├── routes/        - API endpoints
├── models/        - Data structures
├── middleware/    - Auth & validation
├── db/           - Database schema
└── config/       - Configuration
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port 5000 (backend)
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres

# Verify credentials in .env
# Check database exists
psql -l
```

### CORS Errors
- Frontend and backend must match CORS_ORIGIN
- Default: http://localhost:3000 (frontend)
- Update CORS_ORIGIN in backend .env if different

### Clear Cache & Rebuild
```bash
# Backend
rm -rf backend/dist node_modules
cd backend && npm install

# Frontend
rm -rf frontend/dist node_modules
cd frontend && npm install
```

## 📚 Documentation Files

- **README.md** - Project overview
- **SETUP_GUIDE.md** - Detailed setup instructions
- **FEATURES.md** - Feature documentation
- **API.md** - API reference
- **PROJECT_SUMMARY.md** - Implementation status
- **postman_collection.json** - API test collection

## 🎯 Next Steps

### Day 1: Setup & Test
- Run startup script
- Create test accounts
- Test login/registration
- Explore calendar

### Day 2: Core Workflows
- Create schedules (as manager)
- Request changes (as employee)
- Approve changes (as manager)

### Day 3: Advanced Features
- View audit logs
- Test different roles
- Check data consistency

### Day 4+: Customization
- Modify shift types
- Adjust business rules
- Optimize for your organization

## 💡 Tips & Tricks

1. **JWT Token in Postman**
   - Use Tests to set token: `pm.environment.set("token", pm.response.json().token);`
   - Reference in header: `Authorization: Bearer {{token}}`

2. **Database Queries**
   ```sql
   -- Connect to database
   psql -U postgres -d employee_scheduling
   
   -- View all users
   SELECT * FROM users;
   
   -- View schedules for date range
   SELECT * FROM schedules WHERE scheduled_date BETWEEN '2024-01-01' AND '2024-01-31';
   ```

3. **Quick Role Switch**
   - Logout and create new account with different role
   - Or use separate browser profiles for different users

4. **API Testing**
   - Import postman_collection.json to Postman
   - Set {{token}} variable after login
   - Test all endpoints

## 📞 Getting Help

1. Check documentation files (README, SETUP_GUIDE, FEATURES, API)
2. Review error messages in browser console (F12)
3. Check backend logs: `docker-compose logs backend`
4. Check database connection
5. Verify .env configuration

## 🔗 Useful Links

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [JWT.io](https://jwt.io)
- [Tailwind CSS](https://tailwindcss.com)
- [Docker Docs](https://docs.docker.com)

## 📝 Notes

- Tokens expire after 7 days (configurable in .env)
- All timestamps in database are UTC
- Changes to approved schedules create automatic change requests
- Audit logs capture all changes with full history
- Database backups recommended for production

---

**Happy Scheduling! 📅**
