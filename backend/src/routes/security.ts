import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import pool from '../config/database';
import twoFactorService from '../services/twoFactorService';
import loginConfirmationService from '../services/loginConfirmationService';
import emailService from '../services/emailService';

const router = express.Router();

// Get user's 2FA status
router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    const result = await pool.query(
      'SELECT two_fa_enabled, confirmation_email_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      twoFAEnabled: user.two_fa_enabled,
      confirmationEmailEnabled: user.confirmation_email_enabled
    });
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
});

// Generate 2FA setup QR code
router.post('/2fa/setup/generate', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // Get user email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;
    const setupData = await twoFactorService.generateTOTPSecret(userEmail);

    // Return the secret and QR code URL
    // Client will need to display the QR code and verify the setup
    res.json({
      secret: setupData.secret,
      qrcodeUrl: setupData.qrcodeUrl,
      qrcodeDataUrl: setupData.qrcodeDataUrl,
      message: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)'
    });
  } catch (error) {
    console.error('Error generating 2FA setup:', error);
    res.status(500).json({ error: 'Failed to generate 2FA setup' });
  }
});

// Verify and enable 2FA
router.post('/2fa/setup/verify', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ error: 'Secret and token are required' });
    }

    // Verify the TOTP token
    const verification = twoFactorService.verifyTOTP(secret, token);

    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid authenticator code' });
    }

    // Enable 2FA for the user
    const enabled = await twoFactorService.enableTwoFAForUser(userId, secret);

    if (!enabled) {
      return res.status(500).json({ error: 'Failed to enable 2FA' });
    }

    res.json({
      message: 'Two-factor authentication has been enabled successfully',
      twoFAEnabled: true
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const disabled = await twoFactorService.disableTwoFAForUser(userId);

    if (!disabled) {
      return res.status(500).json({ error: 'Failed to disable 2FA' });
    }

    res.json({
      message: 'Two-factor authentication has been disabled',
      twoFAEnabled: false
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Toggle confirmation email setting
router.post('/confirmation-email/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({ error: 'enabled parameter is required' });
    }

    // If trying to enable, check if email service is configured
    if (enabled) {
      const emailConfigured = await emailService.isConfigured();
      if (!emailConfigured) {
        return res.status(400).json({ 
          error: 'Email service is not configured. Please contact your administrator to set up email configuration first.',
          emailConfigured: false
        });
      }
    }

    let result;
    if (enabled) {
      result = await loginConfirmationService.enableConfirmationEmail(userId);
    } else {
      result = await loginConfirmationService.disableConfirmationEmail(userId);
    }

    if (!result) {
      return res.status(500).json({ error: 'Failed to update confirmation email setting' });
    }

    res.json({
      message: `Login confirmation emails have been ${enabled ? 'enabled' : 'disabled'}`,
      confirmationEmailEnabled: enabled
    });
  } catch (error) {
    console.error('Error toggling confirmation email:', error);
    res.status(500).json({ error: 'Failed to toggle confirmation email setting' });
  }
});

// Revoke a specific login session
router.post('/sessions/revoke', async (req, res) => {
  try {
    const { revokeToken } = req.body;

    if (!revokeToken) {
      return res.status(400).json({ error: 'Revoke token is required' });
    }

    const revoked = await loginConfirmationService.revokeSession(revokeToken);

    if (!revoked) {
      return res.status(400).json({ error: 'Invalid or already revoked token' });
    }

    res.json({
      message: 'Session has been revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// ===== ADMIN ENDPOINTS =====

// Get confirmation email policy
router.get('/admin/confirmation-email/policy', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Get policy from environment or use default (disabled by default)
    const isEnabled = process.env.CONFIRMATION_EMAILS_ENABLED === 'true';
    
    res.json({
      confirmationEmailPolicy: {
        isEnabled,
        description: 'Login confirmation emails can be individually enabled by users in their security settings'
      }
    });
  } catch (error) {
    console.error('Error fetching confirmation email policy:', error);
    res.status(500).json({ error: 'Failed to fetch confirmation email policy' });
  }
});

// Enable confirmation emails for all users (admin sets default)
router.post('/admin/confirmation-email/enable', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Check if email service is configured before enabling
    const emailConfigured = await emailService.isConfigured();
    if (!emailConfigured) {
      return res.status(400).json({ 
        error: 'Email service is not configured. Please configure email settings first.',
        emailConfigured: false
      });
    }

    // Enable confirmation emails for all users
    const result = await pool.query(
      'UPDATE users SET confirmation_email_enabled = true'
    );

    res.json({
      message: `Login confirmation emails enabled for ${result.rowCount} users`,
      affectedUsers: result.rowCount
    });
  } catch (error) {
    console.error('Error enabling confirmation emails:', error);
    res.status(500).json({ error: 'Failed to enable confirmation emails' });
  }
});

// Disable confirmation emails for all users (admin resets default)
router.post('/admin/confirmation-email/disable', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Disable confirmation emails for all users
    const result = await pool.query(
      'UPDATE users SET confirmation_email_enabled = false'
    );

    res.json({
      message: `Login confirmation emails disabled for ${result.rowCount} users`,
      affectedUsers: result.rowCount
    });
  } catch (error) {
    console.error('Error disabling confirmation emails:', error);
    res.status(500).json({ error: 'Failed to disable confirmation emails' });
  }
});

// Get list of users with confirmation emails enabled
router.get('/admin/confirmation-email/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, confirmation_email_enabled, role 
       FROM users 
       WHERE confirmation_email_enabled = true
       ORDER BY first_name, last_name`
    );

    res.json({
      users: result.rows,
      totalWithConfirmationEmails: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching confirmation email users:', error);
    res.status(500).json({ error: 'Failed to fetch confirmation email users' });
  }
});

// Get 2FA statistics (admin overview)
router.get('/admin/2fa/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const twoFAResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE two_fa_enabled = true'
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM users'
    );

    const twoFACount = parseInt(twoFAResult.rows[0].count);
    const totalCount = parseInt(totalResult.rows[0].count);
    const percentage = totalCount > 0 ? ((twoFACount / totalCount) * 100).toFixed(2) : 0;

    res.json({
      twoFAStats: {
        usersWithTwoFA: twoFACount,
        totalUsers: totalCount,
        percentageWithTwoFA: percentage
      }
    });
  } catch (error) {
    console.error('Error fetching 2FA stats:', error);
    res.status(500).json({ error: 'Failed to fetch 2FA statistics' });
  }
});

// Get all users with their 2FA status (admin)
router.get('/admin/2fa/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, two_fa_enabled, role 
       FROM users 
       ORDER BY first_name, last_name`
    );

    res.json({
      users: result.rows,
      totalUsers: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching 2FA users:', error);
    res.status(500).json({ error: 'Failed to fetch 2FA user list' });
  }
});

// Admin: Enable 2FA for a specific user
router.post('/admin/2fa/enable', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify the user exists
    const userResult = await pool.query(
      'SELECT id, email, two_fa_enabled FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].two_fa_enabled) {
      return res.status(400).json({ error: 'User already has 2FA enabled' });
    }

    // Generate a secret for the user
    const userEmail = userResult.rows[0].email;
    const setupData = await twoFactorService.generateTOTPSecret(userEmail);

    // Enable 2FA and store the secret
    await pool.query(
      'UPDATE users SET two_fa_enabled = true, two_fa_secret = $1 WHERE id = $2',
      [setupData.secret, user_id]
    );

    res.json({
      message: `2FA enabled for user`,
      user_id,
      secret: setupData.secret,
      qr_code: setupData.qrcodeDataUrl
    });
  } catch (error) {
    console.error('Error enabling 2FA for user:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// Admin: Disable 2FA for a specific user
router.post('/admin/2fa/disable', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify the user exists
    const userResult = await pool.query(
      'SELECT id, two_fa_enabled FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userResult.rows[0].two_fa_enabled) {
      return res.status(400).json({ error: 'User does not have 2FA enabled' });
    }

    // Disable 2FA
    await pool.query(
      'UPDATE users SET two_fa_enabled = false, two_fa_secret = NULL WHERE id = $1',
      [user_id]
    );

    res.json({
      message: `2FA disabled for user`,
      user_id
    });
  } catch (error) {
    console.error('Error disabling 2FA for user:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Registration flow: Generate 2FA setup QR code (no auth required)
router.post('/2fa/register/generate', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Verify the user exists and doesn't already have 2FA enabled
    const userResult = await pool.query(
      'SELECT email, two_fa_enabled FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].two_fa_enabled) {
      return res.status(400).json({ error: 'User already has 2FA enabled' });
    }

    const userEmail = userResult.rows[0].email;
    const setupData = await twoFactorService.generateTOTPSecret(userEmail);

    // Return the secret and QR code
    res.json({
      secret: setupData.secret,
      qr_code: setupData.qrcodeDataUrl,
      message: 'Scan this QR code with your authenticator app'
    });
  } catch (error) {
    console.error('Error generating 2FA setup:', error);
    res.status(500).json({ error: 'Failed to generate 2FA setup' });
  }
});

// Registration flow: Verify and enable 2FA (no auth required)
router.post('/2fa/register/verify', async (req, res) => {
  try {
    const { user_id, token } = req.body;

    if (!user_id || !token) {
      return res.status(400).json({ error: 'user_id and token are required' });
    }

    // Verify the user exists
    const userResult = await pool.query(
      'SELECT email, two_fa_enabled, role FROM users WHERE id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResult.rows[0].two_fa_enabled) {
      return res.status(400).json({ error: 'User already has 2FA enabled' });
    }

    // Generate secret for verification (same email produces same secret)
    const userEmail = userResult.rows[0].email;
    const secretData = await twoFactorService.generateTOTPSecret(userEmail);
    const isValid = twoFactorService.verifyTOTP(secretData.secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Enable 2FA and store the secret
    await pool.query(
      'UPDATE users SET two_fa_enabled = true, two_fa_secret = $1 WHERE id = $2',
      [secretData.secret, user_id]
    );

    // Generate JWT token for auto-login
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign(
      { id: user_id, email: userEmail, role: userResult.rows[0].role },
      (process.env.JWT_SECRET || 'secret') as string,
      { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any }
    );

    res.json({
      message: '2FA has been enabled successfully',
      token: jwtToken,
      user_id
    });
  } catch (error) {
    console.error('Error verifying 2FA setup:', error);
    res.status(500).json({ error: 'Failed to verify 2FA setup' });
  }
});

export default router;
