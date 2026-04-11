import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import pool from '../config/database';

const router = express.Router();

// Get all shift types
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, code, name, description, created_at FROM shift_types ORDER BY code'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch shift types:', error);
    res.status(500).json({ error: 'Failed to fetch shift types' });
  }
});

// Create new shift type (admin only)
router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      'INSERT INTO shift_types (code, name, description) VALUES ($1, $2, $3) RETURNING id, code, name, description, created_at',
      [code.toUpperCase(), name, description || null]
    );

    res.status(201).json({ data: result.rows[0], message: 'Shift type created successfully' });
  } catch (error: any) {
    console.error('Failed to create shift type:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Shift code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create shift type' });
    }
  }
});

// Update shift type (admin only)
router.put('/:shiftId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(
      'UPDATE shift_types SET code = $1, name = $2, description = $3 WHERE id = $4 RETURNING id, code, name, description, created_at',
      [code.toUpperCase(), name, description || null, shiftId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift type not found' });
    }

    res.json({ data: result.rows[0], message: 'Shift type updated successfully' });
  } catch (error: any) {
    console.error('Failed to update shift type:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Shift code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update shift type' });
    }
  }
});

// Delete shift type (admin only)
router.delete('/:shiftId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { shiftId } = req.params;

    // Check if shift is in use
    const scheduleCheck = await pool.query(
      'SELECT COUNT(*) as count FROM schedules WHERE shift_type_id = $1',
      [shiftId]
    );

    if (parseInt(scheduleCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete shift type - it is in use by schedules' });
    }

    const result = await pool.query(
      'DELETE FROM shift_types WHERE id = $1 RETURNING id, code, name',
      [shiftId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift type not found' });
    }

    res.json({ data: result.rows[0], message: 'Shift type deleted successfully' });
  } catch (error) {
    console.error('Failed to delete shift type:', error);
    res.status(500).json({ error: 'Failed to delete shift type' });
  }
});

export default router;
