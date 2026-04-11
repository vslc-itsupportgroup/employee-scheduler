# Detailed Feature Documentation

## 1. Authentication & User Management

### Registration
- Users can register with email, password, name, and department
- Password is hashed using bcrypt (10 rounds)
- Email validation included
- Default role: employee

### Login
- Email and password authentication
- JWT token generated on successful login
- Token stored in localStorage
- Auto-logout on token expiration

### Account Protection
- Password hashing (never stored plain text)
- CORS protection
- Helmet.js security headers
- Input validation on all forms

## 2. Calendar-Based Schedule Display

### Month View
- Display all days in calendar grid format
- Color-coded shifts for quick visual reference
- Clickable dates for shift details
- Navigation between months

### Week View
- Focused view for current week
- Daily shift details
- Time slot visualization
- Quick navigation to adjacent weeks

### Shift Color Coding
| Code | Color | Meaning |
|------|-------|---------|
| 7–4 | Blue | Regular Shift |
| RD | Green | Rest Day |
| VL | Yellow | Vacation Leave |
| SPL | Purple | Special Leave |
| HDD | Red | Holiday |

### Interactive Features
- Click on date to view shift details
- Hover for quick preview
- Drag-to-select for bulk operations (Manager)
- Real-time updates

## 3. Schedule Management

### Create Schedules (Manager/Admin)
- Select employee from dropdown
- Choose shift type
- Set date(s) for the shift
- Bulk upload CSV support (coming)
- Default status: "approved"

### View Schedules
- Employees see only their schedule
- Managers see all employee schedules
- Admins see system-wide schedules
- Filter by department, date range

### Update Schedules
- Only approved schedules can be edited
- Requires manager authorization
- Creates automatic change request
- Resets approval status
- Maintains audit trail

## 4. Change Request Workflow

### Employee Perspective
```
1. View schedule on calendar
2. Click date to request change
3. Select desired shift from dropdown
4. Provide reason (required)
5. Click "Submit Request"
6. Request status: PENDING
```

### Request Statuses
- **Pending**: Awaiting manager review
- **Approved**: Change has been accepted, schedule updated
- **Rejected**: Change declined, original schedule retained

### Key Rules
- Employees cannot directly modify approved schedules
- All changes must be requested (even if manager)
- Editing approved schedule = new change request
- Cannot request same shift already assigned

## 5. Approval Workflow (Manager/Admin)

### Access Approval Dashboard
- For Managers: "Approvals" tab in navigation
- Shows only pending requests for their team
- Sorted by request date (newest first)

### Review Request
Modal displays:
- Employee name and department
- Current shift assignment
- Requested shift
- Change reason
- Request date/time

### Approve Request
- Click "Approve" button
- (Optional) Add remarks
- Change applies immediately
- Notification to employee
- Schedule updated in calendar

### Reject Request
- Click "Reject" button
- (Recommended) Add reason in remarks
- Original schedule unchanged
- Employee notified
- Request marked as rejected

### Remarks
- Text field for manager feedback
- Visible to employee in request history
- Logged in audit trail
- Helps communication

## 6. Approval-Driven Approval Logic

### Business Rules

1. **No Direct Edits to Approved Schedules**
   - Approved schedules are locked
   - Managers must create change requests
   - Ensures audit trail

2. **Auto-Request on Edit**
   - Editing approved schedule = creates change request
   - Previous value: current shift
   - New value: new shift
   - Status: PENDING

3. **Locked Until Approval**
   - Once change requested, original schedule locked
   - Manager must review before change applies
   - Employee sees "Change Pending" indicator

4. **Immediate Application**
   - Approved change applies instantly
   - Calendar updated in real-time
   - Employee notified

5. **Rejection Retains Original**
   - Rejected requests keep original schedule
   - Reason displayed to employee
   - Employee can request again

## 7. Audit Trail & History

### Logged Information
- **Who**: User ID and name
- **What**: Entity type (schedule, change_request)
- **When**: Timestamp (UTC)
- **Changes**: Old values → New values
- **Details**: Action type, remarks

### Audit Log Entries
```
Action: CREATE
Entity: schedule
Employee: John Smith
From: (new)
To: 7-4 on 2024-01-15
By: Manager Admin
Time: 2024-01-10 10:30:00

Action: CHANGE_REQUEST
Entity: schedule
Employee: John Smith
From: 7-4 on 2024-01-15
To: RD (Vacation)
Reason: Family emergency
Requested By: John Smith
Time: 2024-01-10 11:00:00

Action: APPROVED
Entity: change_request
From: 7-4
To: RD
Approved By: Jane Manager
Time: 2024-01-10 14:30:00
Remarks: Approved
```

### View Audit Logs
- Managers access via "History" tab
- Filter by employee, date range, action type
- Export to CSV (coming)
- Read-only view

## 8. Role-Based Access Control

### Employee
- View own schedule
- Create change requests
- View request status
- Cannot approve
- No access to other employees' data

### Manager
- Create and assign schedules
- View team member schedules
- Review pending change requests
- Approve/reject requests
- View audit logs for team
- Cannot delete users or manage global settings

### Admin
- All manager capabilities
- Create/edit user accounts
- Manage shift types
- Configure departments
- View system-wide audit logs
- System settings

## 9. Notifications (Future Enhancement)

### Email Notifications
- Confirmation when request submitted
- Approval/rejection notification
- Manager reminder for pending requests

### In-App Notifications
- Badge on approvals tab
- Toast messages for actions
- Notification center

## 10. Data Validation

### Input Validation
- Email format validation
- Required field checking
- Date range validation
- Shift type validation

### Business Rules Validation
- Prevent duplicate schedules for same employee/date
- Prevent approval of already approved requests
- Prevent self-approval of requests
- Prevent changing past dates

## 11. Mobile Responsiveness

### Responsive Design
- Mobile-first approach
- Touch-friendly buttons
- Readable on small screens
- Optimized for tablets
- Full functionality on mobile

### Mobile Features
- Hamburger menu navigation
- Simplified calendar view
- Large touch targets
- Minimal scrolling

## 12. Performance Optimizations

- Token-based pagination for large datasets
- Database query optimization with indexes
- Frontend component lazy loading
- API response caching
- Database connection pooling

## 13. Security Measures

- Password hashing (bcrypt)
- JWT token authentication
- CORS protection
- SQL injection prevention
- XSS protection (React escaping)
- Rate limiting (coming)
- HTTPS enforcement in production

## 14. Future Enhancements

### Phase 2
- [ ] Email notifications
- [ ] Bulk schedule CSV import
- [ ] Recurring schedules
- [ ] Conflict detection
- [ ] Time-off requests
- [ ] Shift trading

### Phase 3
- [ ] Mobile app (React Native)
- [ ] Advanced reporting & analytics
- [ ] Payroll export
- [ ] Attendance tracking
- [ ] SMS notifications
- [ ] Holiday calendar sync
- [ ] API for third-party integration

## 15. Troubleshooting

### Common Issues

**"Schedule not updating after approval"**
- Refresh page (Ctrl+R)
- Check browser console for errors
- Verify backend server is running

**"Cannot see change requests"**
- Confirm user role is manager/admin
- Check that pending requests exist
- Clear browser cache

**"Login fails"**
- Verify database is running
- Check backend server logs
- Confirm .env credentials are correct

**"Approval button doesn't work"**
- Check network tab for API errors
- Verify user has manager role
- Check backend server logs
