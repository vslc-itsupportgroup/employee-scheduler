# Test Data Seed Guide

## Overview
This script populates your database with test schedule data for simulation and testing.

## What Gets Created

### 👥 Test Users (6 employees)

**Group 1** (3 employees)
- John Smith (group1_emp1@test.com)
- Alice Johnson (group1_emp2@test.com)
- Bob Williams (group1_emp3@test.com)

**Group 2** (3 employees)
- Carol Davis (group2_emp1@test.com)
- David Miller (group2_emp2@test.com)
- Emma Wilson (group2_emp3@test.com)

**Password for all:** `password123`

### 📅 Schedules (April 14-28, 2026)

**Group 1 Pattern:**
- Days 14-16, 19-22, 25-26: **7-4** (standard shifts)
- Days 17-18, 23-24, 27: **RD** (rest days)
- Day 28: **VL** (vacation leave)

**Group 2 Pattern:**
- Days 14-15, 19-20, 24-25: **RD** (rest days)
- Days 16-18, 21-23, 26: **7-4** (standard shifts)
- Day 27: **VL** (vacation leave)
- Day 28: **7-4**

## How to Run

### Step 1: Ensure Backend is Ready
```bash
cd backend
npm install
```

### Step 2: Initialize Database (if not done)
```bash
npm run db:init
```

### Step 3: Run the Seed Script
```bash
npm run seed
```

You should see output like:
```
🌱 Starting database seed...
✓ Shift types loaded
✓ Created/verified 6 test employees
✓ Created 90 test schedule entries

✅ Database seed completed successfully!

📋 Test Users Created:
==================
🔵 Group 1 (Apr 14-28):
  • John Smith (group1_emp1@test.com)
  • Alice Johnson (group1_emp2@test.com)
  • Bob Williams (group1_emp3@test.com)
...
```

## Testing the Calendar

### Run the Application
1. Start backend: `npm run dev` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Open http://localhost:5173

### Login as Manager
- Email: admin@test.com
- Password: password (or your admin password)

### Test the Calendar Features

**View Calendar:**
- Navigate to Dashboard
- You'll see April 2026 with all test schedule data populated
- Click any date to open the employee schedule dialog

**Modify Schedules:**
- Click a date → Dialog shows employees for that day
- Try "Change" or "Mark as Leave" buttons
- As manager, changes apply immediately
- As employee, changes create approval requests

**Test Different Shifts:**
- You'll see 7-4 (Blue), RD (Green), VL (Yellow) shifts
- Each has distinct color coding for easy identification

## Notes

- All schedules are pre-approved (status = 'approved')
- Test users are created in testing departments
- Schedules cover exactly 15 days (Apr 14-28, 2026)
- Running the seed again won't create duplicates (uses ON CONFLICT)
- All test accounts use `password123` for easy testing

## Reset Data

To clear all test data and start fresh:
```sql
DELETE FROM schedules WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%test.com');
DELETE FROM users WHERE email LIKE '%test.com';
```

Then run `npm run seed` again.
