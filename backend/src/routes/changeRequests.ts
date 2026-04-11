import express from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../config/database';
import crypto from 'crypto';
import emailService from '../services/emailService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper function to get approver email (first admin user or manager)
async function getApproverEmail() {
  try {
    // Try to get the first admin user
    const result = await pool.query(
      `SELECT email, first_name, last_name FROM users WHERE role = $1 ORDER BY created_at LIMIT 1`,
      ['admin']
    );
    
    if (result.rows.length > 0) {
      return {
        email: result.rows[0].email,
        name: `${result.rows[0].first_name} ${result.rows[0].last_name}`.trim()
      };
    }
    
    // Fallback to first manager
    const managerResult = await pool.query(
      `SELECT email, first_name, last_name FROM users WHERE role = $1 ORDER BY created_at LIMIT 1`,
      ['manager']
    );
    
    if (managerResult.rows.length > 0) {
      return {
        email: managerResult.rows[0].email,
        name: `${managerResult.rows[0].first_name} ${managerResult.rows[0].last_name}`.trim()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting approver email:', error);
    return null;
  }
}

// Get pending change requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.schedule_id,
        cr.reason,
        cr.status,
        cr.created_at,
        u.first_name || ' ' || u.last_name as requested_by_name,
        st.code as requested_shift_code,
        st.name as requested_shift_name
      FROM change_requests cr
      JOIN users u ON cr.requested_by = u.id
      JOIN shift_types st ON cr.requested_shift_type_id = st.id
      WHERE cr.requested_by = $1
      ORDER BY cr.created_at DESC
    `, [(req as any).user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch change requests:', error);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
});

// Create change request (employee)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { schedule_id, requested_shift_type_id, reason } = req.body;
    const requested_by = (req as any).user.id;

    // If requested_shift_type_id is a code, look it up
    let shiftTypeId = requested_shift_type_id;
    
    if (requested_shift_type_id && !requested_shift_type_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const shiftResult = await pool.query(
        'SELECT id FROM shift_types WHERE code = $1',
        [requested_shift_type_id]
      );
      
      if (shiftResult.rows.length === 0) {
        return res.status(400).json({ error: `Shift type '${requested_shift_type_id}' not found` });
      }
      
      shiftTypeId = shiftResult.rows[0].id;
    }

    // Create the change request
    const crResult = await pool.query(
      `INSERT INTO change_requests (schedule_id, requested_by, requested_shift_type_id, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [schedule_id, requested_by, shiftTypeId, reason]
    );

    const changeRequest = crResult.rows[0];

    // Get full request details for email
    const detailsResult = await pool.query(
      `SELECT 
        cr.id,
        cr.created_at,
        u.first_name || ' ' || u.last_name as employee_name,
        u.email as employee_email,
        s.scheduled_date,
        st_current.code as current_shift,
        st_requested.code as requested_shift,
        st_requested.name as requested_shift_name,
        cr.reason
       FROM change_requests cr
       JOIN schedules s ON cr.schedule_id = s.id
       JOIN users u ON cr.requested_by = u.id
       JOIN shift_types st_current ON s.shift_type_id = st_current.id
       JOIN shift_types st_requested ON cr.requested_shift_type_id = st_requested.id
       WHERE cr.id = $1`,
      [changeRequest.id]
    );

    if (detailsResult.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to retrieve change request details' });
    }

    const details = detailsResult.rows[0];

    // Generate approval token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Save token in database
    try {
      await pool.query(
        `INSERT INTO approval_tokens (id, change_request_id, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [tokenId, changeRequest.id, token, expiresAt]
      );

      // Get approver info and send email
      const approver = await getApproverEmail();
      
      if (approver && approver.email) {
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        
        try {
          await emailService.sendApprovalRequestEmail(
            approver.email,
            approver.name,
            details.employee_name,
            changeRequest.id,
            token,
            details.scheduled_date,
            details.current_shift,
            details.requested_shift,
            details.reason || 'No reason provided',
            appUrl
          );
          
          console.log(`Approval request email sent to ${approver.email} for change request ${changeRequest.id}`);
        } catch (emailError) {
          // Log email error but don't fail the request
          console.error('Failed to send approval email:', emailError);
        }
      } else {
        console.warn('No approver found to send approval request email');
      }
    } catch (tokenError) {
      console.error('Failed to create approval token:', tokenError);
      // Continue anyway - request was created successfully
    }

    res.status(201).json({ data: changeRequest, message: 'Change request created and approval email sent' });
  } catch (error) {
    console.error('Failed to create change request:', error);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

export default router;
