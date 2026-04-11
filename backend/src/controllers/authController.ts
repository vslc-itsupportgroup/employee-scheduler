import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import emailService from '../services/emailService';
import emailConfirmationService from '../services/emailConfirmationService';
import twoFactorService from '../services/twoFactorService';
import loginConfirmationService from '../services/loginConfirmationService';
import passwordPolicyService from '../services/passwordPolicyService';
import { assignUserColor } from '../services/colorService';

// Generate 6-digit confirmation code
function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, role = 'employee', department } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate password against policy
    const passwordValidation = await passwordPolicyService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const userColor = assignUserColor(email); // Assign consistent color based on email

    // Calculate password expiry
    const policy = await passwordPolicyService.getPolicy();
    const passwordExpiresAt = new Date();
    if (policy && policy.password_expiry_days > 0) {
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + policy.password_expiry_days);
    }

    // Create user with email_verified = true (email confirmation disabled)
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, email_verified, is_active, password_changed_at, password_expires_at, color_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW(), $8, $9, NOW(), NOW())`,
      [id, email, password_hash, first_name, last_name, role, department, policy && policy.password_expiry_days > 0 ? passwordExpiresAt : null, userColor]
    );

    // Store password in history
    await passwordPolicyService.storePasswordHistory(id, password_hash);

    // Check if email service is configured
    const emailConfigured = await emailService.isConfigured();
    
    // Require 2FA setup if email is not configured, unless user is admin
    const requires2FASetup = !emailConfigured && role !== 'admin';

    // Return user - no email verification required
    res.status(201).json({
      message: 'User registered successfully. Password meets security requirements.',
      user_id: id,
      email,
      first_name,
      last_name,
      role,
      password_strength: passwordValidation.strength,
      requires_2fa_setup: requires2FASetup
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { user_id, confirmation_code } = req.body;

    if (!user_id || !confirmation_code) {
      return res.status(400).json({ error: 'Missing user_id or confirmation_code' });
    }

    // Verify the confirmation code with 15-minute expiry check
    const verification = await emailConfirmationService.verifyConfirmationCode(user_id, confirmation_code);

    if (!verification.valid) {
      console.warn('❌ Email verification failed:', {
        userId: user_id,
        reason: verification.message,
        isExpired: verification.isExpired,
        isMaxAttemptsExceeded: verification.isMaxAttemptsExceeded
      });

      const statusCode = verification.isExpired || verification.isMaxAttemptsExceeded ? 410 : 400;
      return res.status(statusCode).json({
        error: verification.message,
        status: 'failure',
        isExpired: verification.isExpired,
        isMaxAttemptsExceeded: verification.isMaxAttemptsExceeded
      });
    }

    // Mark user's email as verified in the users table
    await emailConfirmationService.confirmEmail(user_id);

    console.log('✓ Email verified successfully:', user_id);
    
    return res.json({
      message: 'Email verified successfully! You can now log in with your credentials.',
      status: 'success'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, totpToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // First check if user exists (without checking is_active)
    const userCheckResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userCheckResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userCheckResult.rows[0];

    // Check if user account is disabled
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled. Please contact administrator to re-enable your account.',
        account_disabled: true,
        email: user.email
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified',
        requires_verification: true,
        user_id: user.id,
        email: user.email
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is forced to change password
    if (user.force_password_change) {
      return res.status(403).json({
        error: 'Password change required',
        requires_password_change: true,
        user_id: user.id,
        email: user.email,
        message: 'Your password must be changed before you can access the system'
      });
    }

    // Check if 2FA is enabled
    if (user.two_fa_enabled) {
      if (!totpToken) {
        return res.status(403).json({ 
          error: 'Two-factor authentication required',
          requires_2fa: true,
          user_id: user.id,
          message: 'Please provide your authenticator code'
        });
      }

      // Verify TOTP token
      const secret = user.two_fa_secret;
      if (!secret) {
        return res.status(500).json({ error: '2FA configuration error' });
      }

      const verification = twoFactorService.verifyTOTP(secret, totpToken);
      if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid authenticator code' });
      }
    }

    // Generate JWT token
    const signOptions: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRATION || '7d') as any
    };
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      (process.env.JWT_SECRET || 'secret') as string,
      signOptions
    );

    // Create login session to track the login
    const ipAddress = (req.ip || req.connection.remoteAddress || '').toString();
    const userAgent = req.get('user-agent') || '';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = await loginConfirmationService.createLoginSession(
      user.id,
      jwtToken,
      ipAddress,
      userAgent,
      expiresAt
    );

    // REQUIRED: Send confirmation email for every login (security requirement)
    // Email service must be configured for the system to function properly
    const emailConfigured = await emailService.isConfigured();
    
    if (!emailConfigured) {
      console.warn('Login attempted but email service is not configured. This should be set up for security.');
    }
    
    let confirmationEmailSent = false;
    if (session && emailConfigured) {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      const revokeLink = `${appUrl}/api/security/sessions/revoke?token=${session.revokeToken}`;
      
      try {
        await loginConfirmationService.sendLoginConfirmationEmail(
          user.email,
          `${user.first_name} ${user.last_name}`,
          ipAddress,
          userAgent,
          revokeLink
        );
        confirmationEmailSent = true;
      } catch (error) {
        console.error('Failed to send login confirmation email:', error);
      }
    }

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department
      },
      confirmationEmailSent
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { user_id, current_password, new_password } = req.body;

    if (!user_id || !current_password || !new_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password against policy
    const passwordValidation = await passwordPolicyService.validatePassword(new_password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'New password does not meet security requirements',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password and clear force_password_change flag
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, force_password_change = false, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, user_id]
    );

    // Store in password history
    await passwordPolicyService.storePasswordHistory(user_id, newPasswordHash);

    // Generate JWT token
    const signOptions: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRATION || '7d') as any
    };
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      (process.env.JWT_SECRET || 'secret') as string,
      signOptions
    );

    res.json({
      message: 'Password changed successfully',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Failed to change password:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Return success anyway for security (don't reveal if email exists)
      return res.json({ message: 'If email exists, reset code will be sent' });
    }

    const userId = result.rows[0].id;

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store reset token with 15-minute expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, reset_code, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, resetCode, expiresAt]
    );

    // Send email with reset code (if email service is configured)
    const emailConfigured = await emailService.isConfigured();
    if (emailConfigured) {
      try {
        await emailService.sendPasswordResetEmail(email, resetCode);
      } catch (error) {
        console.error('Failed to send password reset email:', error);
      }
    } else {
      console.warn('Email service not configured. Password reset code:', resetCode);
    }

    res.json({ message: 'Password reset code sent to email' });
  } catch (error) {
    console.error('Failed to request password reset:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
};

export const verifyPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Check reset token
    const tokenResult = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE user_id = $1 AND reset_code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset code' });
    }

    res.json({ message: 'Reset code verified successfully' });
  } catch (error) {
    console.error('Failed to verify password reset code:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, new_password } = req.body;

    if (!email || !code || !new_password) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Check and mark reset token as used
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens 
       WHERE user_id = $1 AND reset_code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset code' });
    }

    const tokenId = tokenResult.rows[0].id;

    // Validate new password against policy
    const passwordValidation = await passwordPolicyService.validatePassword(new_password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'New password does not meet security requirements',
        details: passwordValidation.errors,
        strength: passwordValidation.strength
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Update password
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [tokenId]
    );

    // Store in password history
    await passwordPolicyService.storePasswordHistory(userId, newPasswordHash);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// Demo login for testing without database
export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { role = 'admin' } = req.body;

    if (!['employee', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const userId = 'demo-' + Math.random().toString(36).substr(2, 9);
    const email = `demo-${role}@example.com`;

    const signOptions: SignOptions = { 
      expiresIn: (process.env.JWT_EXPIRATION || '7d') as any
    };
    const token = jwt.sign(
      { id: userId, email, role },
      (process.env.JWT_SECRET || 'secret') as string,
      signOptions
    );

    res.json({
      token,
      user: {
        id: userId,
        email,
        first_name: `Demo`,
        last_name: role.charAt(0).toUpperCase() + role.slice(1),
        role,
        department: 'Demo Department'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Demo login failed' });
  }
};
