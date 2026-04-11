import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import pool from '../config/database';

const router = express.Router();

// ALL SPECIFIC PATHS FIRST (non-parameterized routes)

// Get all employees for admin to assign to managers
router.get('/all', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, manager_id, is_active, two_fa_enabled, color_code, password_expires_at FROM users ORDER BY first_name, last_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user roles (admin)
router.get('/roles', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    res.json({
      roles: ['employee', 'manager', 'admin']
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Bulk force password change (admin only)
router.post('/bulk/force-password-change', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    }

    // Set force_password_change flag for all selected users
    const result = await pool.query(
      `UPDATE users 
       SET force_password_change = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1) 
       RETURNING id, email, first_name, last_name`,
      [user_ids]
    );

    res.json({ 
      message: `Password change required for ${result.rows.length} user(s)`,
      updated_users: result.rows
    });
  } catch (error) {
    console.error('Failed to force password change:', error);
    res.status(500).json({ error: 'Failed to force password change' });
  }
});

// Bulk reset password expiry (admin only)
router.post('/bulk/reset-password-expiry', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids must be a non-empty array' });
    }

    // Reset password expiry date to 90 days from now
    const result = await pool.query(
      `UPDATE users 
       SET password_expires_at = CURRENT_TIMESTAMP + INTERVAL '90 days', 
           force_password_change = false, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1) 
       RETURNING id, email, first_name, last_name`,
      [user_ids]
    );

    res.json({ 
      message: `Password expiry reset for ${result.rows.length} user(s)`,
      updated_users: result.rows
    });
  } catch (error) {
    console.error('Failed to reset password expiry:', error);
    res.status(500).json({ error: 'Failed to reset password expiry' });
  }
});

// THEN PARAMETERIZED ROUTES

// Get all users (admin) or managed employees (manager)
router.get('/', authenticateToken, authorizeRole('manager', 'admin'), async (req, res) => {
  try {
    const user = (req as any).user;
    let query = 'SELECT id, email, first_name, last_name, role, department, manager_id, is_active, two_fa_enabled, color_code, password_expires_at FROM users';
    const params: any[] = [];

    // Managers can only see their assigned employees
    if (user.role === 'manager') {
      query += ' WHERE manager_id = $1 ORDER BY first_name, last_name';
      params.push(user.id);
    } else {
      // Admins see all users
      query += ' ORDER BY first_name, last_name';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.put('/:userId/role', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name, role, manager_id',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0], message: 'User role updated successfully' });
  } catch (error) {
    console.error('Failed to update user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Assign manager to employee (admin only)
router.put('/:userId/manager', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { managerId } = req.body;

    // Validate manager exists and has manager role
    if (managerId) {
      const managerCheck = await pool.query(
        'SELECT id, role FROM users WHERE id = $1',
        [managerId]
      );
      
      if (managerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Manager not found' });
      }
      
      if (managerCheck.rows[0].role !== 'manager' && managerCheck.rows[0].role !== 'admin') {
        return res.status(400).json({ error: 'User must have manager or admin role' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET manager_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name, role, manager_id',
      [managerId || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0], message: 'Manager assigned successfully' });
  } catch (error) {
    console.error('Failed to assign manager:', error);
    res.status(500).json({ error: 'Failed to assign manager' });
  }
});

// Change user password (manager or admin, or self)
router.put('/:userId/password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const currentUser = (req as any).user;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check authorization: user can change own password, or manager/admin can change their managed employees' passwords
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      if (currentUser.role === 'manager') {
        // Verify the user being modified is an employee of this manager
        const employeeCheck = await pool.query(
          'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
          [userId, currentUser.id]
        );
        if (employeeCheck.rows.length === 0) {
          return res.status(403).json({ error: 'You can only change password for your assigned employees' });
        }
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           force_password_change = false,
           password_expires_at = CURRENT_TIMESTAMP + INTERVAL '90 days',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, email, first_name, last_name`,
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Password changed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Failed to change password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete user (admin only, or manager can deactivate their employees)
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = (req as any).user;

    // Check if user to be deleted exists
    const userCheck = await pool.query(
      'SELECT id, manager_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Admin can delete any user, manager can only deactivate their employees
    if (currentUser.role === 'admin') {
      // Admin: completely delete the user
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      res.json({ message: 'User deleted successfully' });
    } else if (currentUser.role === 'manager' && userCheck.rows[0].manager_id === currentUser.id) {
      // Manager: deactivate (soft delete) their employee
      await pool.query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
      res.json({ message: 'User deactivated successfully' });
    } else {
      return res.status(403).json({ error: 'Unauthorized to delete this user' });
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
