import { Request, Response } from 'express';
import passwordPolicyService from '../services/passwordPolicyService';
import pool from '../config/database';

export const getPasswordPolicy = async (req: Request, res: Response) => {
  try {
    const policy = await passwordPolicyService.getPolicy();

    if (!policy) {
      return res.status(404).json({ error: 'Password policy not found' });
    }

    res.json({
      message: 'Password policy retrieved successfully',
      policy: {
        id: policy.id,
        min_length: policy.min_length,
        require_uppercase: policy.require_uppercase,
        require_lowercase: policy.require_lowercase,
        require_numbers: policy.require_numbers,
        require_special_chars: policy.require_special_chars,
        password_expiry_days: policy.password_expiry_days,
        password_history_count: policy.password_history_count,
        description: policy.description,
        updated_at: policy.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching password policy:', error);
    res.status(500).json({ error: 'Failed to fetch password policy' });
  }
};

export const updatePasswordPolicy = async (req: Request, res: Response) => {
  try {
    const {
      min_length,
      require_uppercase,
      require_lowercase,
      require_numbers,
      require_special_chars,
      password_expiry_days,
      password_history_count,
      description
    } = req.body;

    // Validate input
    if (min_length !== undefined && (min_length < 6 || min_length > 128)) {
      return res.status(400).json({ error: 'Minimum length must be between 6 and 128' });
    }

    if (password_history_count !== undefined && (password_history_count < 1 || password_history_count > 10)) {
      return res.status(400).json({ error: 'Password history count must be between 1 and 10' });
    }

    if (password_expiry_days !== undefined && (password_expiry_days < 0 || password_expiry_days > 365)) {
      return res.status(400).json({ error: 'Password expiry days must be between 0 and 365 (0 = disabled)' });
    }

    // At least one character type must be required
    if (
      require_uppercase === false &&
      require_lowercase === false &&
      require_numbers === false &&
      require_special_chars === false
    ) {
      return res.status(400).json({ error: 'At least one character type must be required' });
    }

    const updatedPolicy = await passwordPolicyService.updatePolicy({
      min_length,
      require_uppercase,
      require_lowercase,
      require_numbers,
      require_special_chars,
      password_expiry_days,
      password_history_count,
      description
    });

    if (!updatedPolicy) {
      return res.status(500).json({ error: 'Failed to update password policy' });
    }

    console.log('✓ Password policy updated by admin');

    res.json({
      message: 'Password policy updated successfully',
      policy: {
        id: updatedPolicy.id,
        min_length: updatedPolicy.min_length,
        require_uppercase: updatedPolicy.require_uppercase,
        require_lowercase: updatedPolicy.require_lowercase,
        require_numbers: updatedPolicy.require_numbers,
        require_special_chars: updatedPolicy.require_special_chars,
        password_expiry_days: updatedPolicy.password_expiry_days,
        password_history_count: updatedPolicy.password_history_count,
        description: updatedPolicy.description,
        updated_at: updatedPolicy.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating password policy:', error);
    res.status(500).json({ error: 'Failed to update password policy' });
  }
};

export const getUserPasswordStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, password_changed_at, force_password_change FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const expiryInfo = await passwordPolicyService.getPasswordExpiryInfo(userId);
    const needsChange = await passwordPolicyService.userNeedsPasswordChange(userId);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        password_changed_at: user.password_changed_at,
        password_expires_days: expiryInfo?.daysUntilExpiry || -1,
        password_expired: expiryInfo?.isExpired || false,
        force_password_change: needsChange
      }
    });
  } catch (error) {
    console.error('Error getting user password status:', error);
    res.status(500).json({ error: 'Failed to get user password status' });
  }
};

export const forcePasswordChange = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const success = await passwordPolicyService.forcePasswordChange(userId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to force password change' });
    }

    console.log('✓ Forced password change for user:', userId);

    res.json({
      message: `Password change has been forced for user ${userId}. They will be required to change their password on next login.`
    });
  } catch (error) {
    console.error('Error forcing password change:', error);
    res.status(500).json({ error: 'Failed to force password change' });
  }
};

export const resetPasswordExpiry = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const success = await passwordPolicyService.resetPasswordExpiry(userId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to reset password expiry' });
    }

    const policy = await passwordPolicyService.getPolicy();
    const days = policy?.password_expiry_days || 90;

    console.log('✓ Password expiry reset for user:', userId);

    res.json({
      message: `Password expiry has been reset for user ${userId}. Password will expire in ${days} days.`
    });
  } catch (error) {
    console.error('Error resetting password expiry:', error);
    res.status(500).json({ error: 'Failed to reset password expiry' });
  }
};

export const getAllUsersPasswordStatus = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        role,
        password_changed_at, 
        force_password_change,
        is_active
       FROM users 
       ORDER BY password_changed_at DESC`
    );

    const policy = await passwordPolicyService.getPolicy();
    const passwordExpiryDays = policy?.password_expiry_days || 90;

    const now = new Date();
    const usersWithStatus = await Promise.all(
      result.rows.map(async (user) => {
        const expiryInfo = await passwordPolicyService.getPasswordExpiryInfo(user.id);
        return {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          password_changed_at: user.password_changed_at,
          days_until_expiry: expiryInfo?.daysUntilExpiry || -1,
          password_expired: expiryInfo?.isExpired || false,
          force_password_change: user.force_password_change,
          is_active: user.is_active
        };
      })
    );

    res.json({
      policy: {
        password_expiry_days: passwordExpiryDays,
        password_history_count: policy?.password_history_count || 3
      },
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Error getting users password status:', error);
    res.status(500).json({ error: 'Failed to get users password status' });
  }
};
