import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import pool from '../config/database';
import emailService from '../services/emailService';
import crypto from 'crypto';

const router = express.Router();

// Get pending approvals (manager/admin)
router.get('/pending', authenticateToken, authorizeRole('manager', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.schedule_id,
        cr.reason,
        cr.status,
        cr.created_at,
        u.first_name || ' ' || u.last_name as employee_name,
        u.email as employee_email,
        st_current.code as current_shift,
        st_requested.code as requested_shift,
        st_requested.name as shift_name,
        s.scheduled_date
      FROM change_requests cr
      JOIN schedules s ON cr.schedule_id = s.id
      JOIN users u ON cr.requested_by = u.id
      JOIN shift_types st_current ON s.shift_type_id = st_current.id
      JOIN shift_types st_requested ON cr.requested_shift_type_id = st_requested.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// Approve or reject change request
router.post('/:changeRequestId', authenticateToken, authorizeRole('manager', 'admin'), async (req, res) => {
  try {
    const { changeRequestId } = req.params;
    const { status, remarks } = req.body;
    const reviewedBy = (req as any).user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update change request
    const result = await pool.query(
      `UPDATE change_requests 
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, reviewer_remarks = $3
       WHERE id = $4
       RETURNING *`,
      [status, reviewedBy, remarks || null, changeRequestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const changeRequest = result.rows[0];

    // If approved, update the schedule with the new shift
    if (status === 'approved') {
      await pool.query(
        `UPDATE schedules 
         SET shift_type_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [changeRequest.requested_shift_type_id, changeRequest.schedule_id]
      );
    }

    res.json({ 
      data: changeRequest, 
      message: `Change request ${status}` 
    });
  } catch (error) {
    console.error('Failed to process approval:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// Email-based approval (via link)
router.get('/email-approve/:changeRequestId/:token', async (req, res) => {
  try {
    const { changeRequestId, token } = req.params;

    // Verify token
    const tokenResult = await pool.query(
      `SELECT * FROM approval_tokens 
       WHERE change_request_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL`,
      [changeRequestId, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired approval link' });
    }

    // Get change request details
    const crResult = await pool.query(
      `SELECT cr.*, s.shift_type_id as current_shift_id, u.email as employee_email, u.first_name, u.last_name, 
              st.code as requested_shift, st2.code as current_shift
       FROM change_requests cr
       JOIN schedules s ON cr.schedule_id = s.id
       JOIN users u ON cr.requested_by = u.id
       JOIN shift_types st ON cr.requested_shift_type_id = st.id
       JOIN shift_types st2 ON s.shift_type_id = st2.id
       WHERE cr.id = $1`,
      [changeRequestId]
    );

    if (crResult.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const cr = crResult.rows[0];

    // Mark token as used
    await pool.query(
      `UPDATE approval_tokens SET used_at = CURRENT_TIMESTAMP 
       WHERE change_request_id = $1 AND token = $2`,
      [changeRequestId, token]
    );

    // Update change request to approved
    await pool.query(
      `UPDATE change_requests SET status = 'approved' 
       WHERE id = $1`,
      [changeRequestId]
    );

    // Update schedule with new shift
    await pool.query(
      `UPDATE schedules SET shift_type_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [cr.requested_shift_type_id, cr.schedule_id]
    );

    // Send confirmation email to employee
    await emailService.sendApprovalConfirmationEmail(
      cr.employee_email,
      `${cr.first_name} ${cr.last_name}`,
      'approved',
      cr.scheduled_date,
      cr.requested_shift
    );

    res.json({ 
      message: '✓ Approval confirmed! The employee has been notified via email.' 
    });
  } catch (error) {
    console.error('Failed to process email approval:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// Email-based rejection (via link)
router.get('/email-reject/:changeRequestId/:token', async (req, res) => {
  try {
    const { changeRequestId, token } = req.params;

    // Verify token
    const tokenResult = await pool.query(
      `SELECT * FROM approval_tokens 
       WHERE change_request_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL`,
      [changeRequestId, token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired rejection link' });
    }

    // Get change request details
    const crResult = await pool.query(
      `SELECT cr.*, u.email as employee_email, u.first_name, u.last_name, st.code as requested_shift, s.scheduled_date
       FROM change_requests cr
       JOIN schedules s ON cr.schedule_id = s.id
       JOIN users u ON cr.requested_by = u.id
       JOIN shift_types st ON cr.requested_shift_type_id = st.id
       WHERE cr.id = $1`,
      [changeRequestId]
    );

    if (crResult.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const cr = crResult.rows[0];

    // Mark token as used
    await pool.query(
      `UPDATE approval_tokens SET used_at = CURRENT_TIMESTAMP 
       WHERE change_request_id = $1 AND token = $2`,
      [changeRequestId, token]
    );

    // Update change request to rejected
    await pool.query(
      `UPDATE change_requests SET status = 'rejected' 
       WHERE id = $1`,
      [changeRequestId]
    );

    // Send confirmation email to employee
    await emailService.sendApprovalConfirmationEmail(
      cr.employee_email,
      `${cr.first_name} ${cr.last_name}`,
      'rejected',
      cr.scheduled_date,
      cr.requested_shift
    );

    res.json({ 
      message: '✓ Rejection recorded! The employee has been notified via email.' 
    });
  } catch (error) {
    console.error('Failed to process email rejection:', error);
    res.status(500).json({ error: 'Failed to process rejection' });
  }
});

export default router;
