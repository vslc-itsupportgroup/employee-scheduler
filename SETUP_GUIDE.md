# Complete Setup Guide

## Prerequisites
- **Node.js** v16+ ([Download](https://nodejs.org))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/download))
- **npm** (comes with Node.js)

## Step 1: Database Setup

### Windows (Using PostgreSQL installer)

1. Ensure PostgreSQL is installed and running
2. Open PowerShell or Command Prompt as Administrator
3. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
4. Create database:
   ```sql
   CREATE DATABASE employee_scheduling;
   ```
5. Exit psql:
   ```sql
   \q
   ```

### Load Schema
```bash
psql -U postgres -d employee_scheduling -f "backend/src/db/schema.sql"
```

Verify the schema was loaded:
```bash
psql -U postgres -d employee_scheduling -c "\dt"
```

You should see tables: users, shift_types, schedules, change_requests, audit_logs

## Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

### .env Configuration
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=employee_scheduling
DB_USER=postgres
DB_PASSWORD=<your_postgres_password>
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
```

### Start Backend
```bash
npm run dev
```

Expected output:
```
Server running on port 5000
```

## Step 3: Frontend Setup

In a **new terminal/PowerShell**:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Expected output:
```
VITE v... dev server running at:
http://localhost:3000/
```

## Step 4: Test the Application

1. Open browser to **http://localhost:3000**
2. Click "Register here" to create an account
3. Fill in user details and submit

### Test Users to Create

Create these users for testing different roles:

**Employee**
- Email: emp@example.com
- Password: password123
- Role: employee

**Manager**
- Email: mgr@example.com
- Password: password123
- Role: manager

**Admin**
- Email: admin@example.com
- Password: password123
- Role: admin

## Step 5: Verify Installation

### Backend Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status":"OK","timestamp":"2024-01-10T..."}
```

### Test Login
1. Go to http://localhost:3000/login
2. Use credentials from the user you created
3. You should be redirected to dashboard

## Troubleshooting

### Port Already in Use
```bash
# Backend (port 5000)
# Windows: Find and kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process

# Frontend (port 3000)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Ensure PostgreSQL is running
- Check DB credentials in .env
- Verify database exists: `psql -U postgres -l`

### CORS Errors
- Check CORS_ORIGIN in backend .env
- Should match frontend URL (http://localhost:3000)

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -r node_modules package-lock.json
npm install
```

## Next Steps

1. **Create schedules**: Login as Manager, create schedules for employees
2. **Request changes**: Login as Employee, request shift changes
3. **Approve requests**: Login as Manager, review and approve/reject
4. **View history**: Check audit logs for all changes

## Development Commands

### Backend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Run built version
npm run migrate  # Run database migrations
```

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run type-check  # Type check
```

## Production Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Host dist/ folder on web server
```

## Environment Variables Checklist

### Backend .env
- [ ] DB_HOST (localhost for local dev)
- [ ] DB_PASSWORD (your PostgreSQL password)
- [ ] JWT_SECRET (change to random string in production)
- [ ] CORS_ORIGIN (matches frontend URL)

### Frontend Configuration
- [ ] Backend API URL in `frontend/src/api/client.ts`
- [ ] Proxy configured in vite.config.ts

## Security Notes

1. **Never commit .env file** to version control
2. Change default JWT_SECRET in production
3. Use HTTPS in production
4. Keep dependencies updated: `npm update`
5. Review and update CORS_ORIGIN for production domain

## Support & Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [JWT Introduction](https://jwt.io/introduction)
