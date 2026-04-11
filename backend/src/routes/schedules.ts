import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import pool from '../config/database';
import { getManagedUserIds, isUserManagedBy } from '../utils/hierarchy';

const router = express.Router();

// Get schedules by date (for manager view)
router.get('/by-date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const user = (req as any).user;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    console.log('Fetching schedules for date:', date);

    let query = `
      SELECT s.id, s.employee_id, s.shift_type_id, s.scheduled_date, s.status,
             st.code as shift_code, st.name as shift_name,
             u.first_name, u.last_name
      FROM schedules s
      JOIN shift_types st ON s.shift_type_id = st.id
      JOIN users u ON s.employee_id = u.id
      WHERE s.scheduled_date = $1
    `;

    const params: any[] = [date];

    if (user.role === 'manager') {
      const managedUserIds = await getManagedUserIds(user.id);
      if (managedUserIds.length === 0) {
        return res.json({ data: [] });
      }
      query += ' AND s.employee_id = ANY($2::uuid[])';
      params.push(managedUserIds);
    } else if (user.role === 'employee') {
      query += ' AND s.employee_id = $2';
      params.push(user.id);
    }

    query += ' ORDER BY u.first_name, u.last_name';

    const result = await pool.query(query, params);
    console.log('Found schedules:', result.rows);
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Failed to fetch schedules by date:', error);
    res.status(500).json({ error: `Failed to fetch schedules: ${error.message}` });
  }
});

// Get all schedules for a month (manager/admin only) - for consolidated view
router.get('/month/:month/:year', authenticateToken, authorizeRole('manager', 'admin'), async (req, res) => {
  try {
    const { month, year } = req.params;
    const user = (req as any).user;

    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    const startDate = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0];

    console.log(`Fetching all schedules for ${monthNum}/${yearNum} from ${startDate} to ${endDate}`);

    let query = `
      SELECT s.id, s.employee_id, s.shift_type_id, s.scheduled_date, s.status,
             st.code as shift_code, st.name as shift_name,
             u.first_name, u.last_name
      FROM schedules s
      JOIN shift_types st ON s.shift_type_id = st.id
      JOIN users u ON s.employee_id = u.id
      WHERE s.scheduled_date >= $1 AND s.scheduled_date <= $2
    `;

    const params: any[] = [startDate, endDate];

    if (user.role === 'manager') {
      const managedUserIds = await getManagedUserIds(user.id);
      if (managedUserIds.length === 0) {
        return res.json({ data: [] });
      }
      query += ' AND s.employee_id = ANY($3::uuid[])';
      params.push(managedUserIds);
    }

    query += ' ORDER BY s.scheduled_date, u.first_name, u.last_name';

    const result = await pool.query(query, params);
    console.log(`Found ${result.rows.length} schedules for the month`);
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Failed to fetch schedules for month:', error);
    res.status(500).json({ error: `Failed to fetch schedules: ${error.message}` });
  }
});

// Get schedules for a user
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;
    const currentUser = (req as any).user;

    // Access control: admin can view any schedule; manager only for their reporting tree;
    // employee only their own schedule.
    if (currentUser.role === 'employee' && currentUser.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (currentUser.role === 'manager' && currentUser.id !== userId) {
      const canManageUser = await isUserManagedBy(currentUser.id, userId);
      if (!canManageUser) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    let query = `
      SELECT s.id, s.employee_id, s.shift_type_id, s.scheduled_date, s.status,
             st.code as shift_code, st.name as shift_name,
             u.first_name, u.last_name
      FROM schedules s
      JOIN shift_types st ON s.shift_type_id = st.id
      JOIN users u ON s.employee_id = u.id
      WHERE s.employee_id = $1
    `;
    const params: any[] = [userId];

    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
      query += ` AND s.scheduled_date >= $2 AND s.scheduled_date <= $3`;
      params.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }

    query += ` ORDER BY s.scheduled_date`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Failed to fetch schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create or overwrite schedule (manager/admin creates - auto-approved; employee requests - needs approval)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { employee_id, shift_type_id, scheduled_date } = req.body;
    const user = (req as any).user;

    // If shift_type_id is a code (e.g., "7-4"), look up the actual UUID
    let shiftTypeId = shift_type_id;
    
    if (shift_type_id && !shift_type_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's a code, not a UUID - look it up
      const shiftResult = await pool.query(
        'SELECT id FROM shift_types WHERE code = $1',
        [shift_type_id]
      );
      
      if (shiftResult.rows.length === 0) {
        return res.status(400).json({ error: `Shift type '${shift_type_id}' not found` });
      }
      
      shiftTypeId = shiftResult.rows[0].id;
    }

    // Check if user is manager/admin or the employee themselves
    if (user.role !== 'manager' && user.role !== 'admin' && user.id !== employee_id) {
      return res.status(403).json({ error: 'You can only create schedules for yourself' });
    }

    // Managers can only create schedules for users in their reporting tree.
    if (user.role === 'manager' && user.id !== employee_id) {
      const canManageUser = await isUserManagedBy(user.id, employee_id);
      if (!canManageUser) {
        return res.status(403).json({ error: 'You can only create schedules for your assigned employees' });
      }
    }

    // If manager/admin: directly update/create schedule (auto-approved)
    if (user.role === 'manager' || user.role === 'admin') {
      const result = await pool.query(
        `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
         VALUES ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)
         ON CONFLICT(employee_id, scheduled_date) DO UPDATE SET
           shift_type_id = $2,
           status = 'approved',
           created_by = $4,
           approved_by = $4,
           approval_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [employee_id, shiftTypeId, scheduled_date, user.id]
      );

      res.status(201).json({ data: result.rows[0], message: 'Schedule created/updated successfully' });
    } else {
      // If employee: create change request (needs approval)
      // First check if there's an existing schedule
      const existingSchedule = await pool.query(
        'SELECT id FROM schedules WHERE employee_id = $1 AND scheduled_date = $2',
        [employee_id, scheduled_date]
      );

      if (existingSchedule.rows.length > 0) {
        // Create change request
        const changeResult = await pool.query(
          `INSERT INTO change_requests (schedule_id, requested_by, requested_shift_type_id, reason, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING *`,
          [existingSchedule.rows[0].id, user.id, shiftTypeId, 'Employee requested schedule change']
        );
        res.status(201).json({ data: changeResult.rows[0], message: 'Change request created and awaiting approval' });
      } else {
        // No existing schedule - just create directly
        const result = await pool.query(
          `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING *`,
          [employee_id, shiftTypeId, scheduled_date, user.id]
        );
        res.status(201).json({ data: result.rows[0], message: 'Schedule created and awaiting approval' });
      }
    }
  } catch (error: any) {
    console.error('Failed to create schedule:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid employee or shift type' });
    } else {
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  }
});

// Update schedule (manager only)
router.put('/:scheduleId', authenticateToken, authorizeRole('manager', 'admin'), async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { shift_type_id, status } = req.body;
    const user = (req as any).user;

    if (user.role === 'manager') {
      const accessCheck = await pool.query(
        `SELECT s.id
         FROM schedules s
         WHERE s.id = $1
           AND EXISTS (
             WITH RECURSIVE managed_users AS (
               SELECT id, manager_id
               FROM users
               WHERE manager_id = $2

               UNION

               SELECT u.id, u.manager_id
               FROM users u
               INNER JOIN managed_users mu ON u.manager_id = mu.id
             )
             SELECT 1 FROM managed_users WHERE id = s.employee_id
           )`,
        [scheduleId, user.id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to update this schedule' });
      }
    }

    const result = await pool.query(
      `UPDATE schedules 
       SET shift_type_id = COALESCE($1, shift_type_id),
           status = COALESCE($2, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [shift_type_id, status, scheduleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Failed to update schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

export default router;
