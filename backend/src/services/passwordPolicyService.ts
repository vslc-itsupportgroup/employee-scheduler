import pool from '../config/database';
import bcrypt from 'bcryptjs';

interface PasswordPolicy {
  id: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  password_expiry_days: number;
  password_history_count: number;
  description: string;
  created_at: Date;
  updated_at: Date;
}

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

class PasswordPolicyService {
  /**
   * Get current password policy
   */
  async getPolicy(): Promise<PasswordPolicy | null> {
    try {
      const result = await pool.query('SELECT * FROM password_policy LIMIT 1');
      
      if (result.rows.length === 0) {
        // Create default policy if none exists
        return await this.createDefaultPolicy();
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching password policy:', error);
      return null;
    }
  }

  /**
   * Create default password policy
   */
  async createDefaultPolicy(): Promise<PasswordPolicy> {
    try {
      const result = await pool.query(
        `INSERT INTO password_policy 
         (min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars, 
          password_expiry_days, password_history_count, description)
         VALUES (8, true, true, true, true, 90, 3, 'Default password policy for all users')
         RETURNING *`,
      );

      console.log('✓ Default password policy created');
      return result.rows[0];
    } catch (error) {
      console.error('Error creating default policy:', error);
      throw error;
    }
  }

  /**
   * Update password policy
   */
  async updatePolicy(policy: Partial<PasswordPolicy>): Promise<PasswordPolicy | null> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (policy.min_length !== undefined) {
        updates.push(`min_length = $${paramIndex++}`);
        values.push(policy.min_length);
      }
      if (policy.require_uppercase !== undefined) {
        updates.push(`require_uppercase = $${paramIndex++}`);
        values.push(policy.require_uppercase);
      }
      if (policy.require_lowercase !== undefined) {
        updates.push(`require_lowercase = $${paramIndex++}`);
        values.push(policy.require_lowercase);
      }
      if (policy.require_numbers !== undefined) {
        updates.push(`require_numbers = $${paramIndex++}`);
        values.push(policy.require_numbers);
      }
      if (policy.require_special_chars !== undefined) {
        updates.push(`require_special_chars = $${paramIndex++}`);
        values.push(policy.require_special_chars);
      }
      if (policy.password_expiry_days !== undefined) {
        updates.push(`password_expiry_days = $${paramIndex++}`);
        values.push(policy.password_expiry_days);
      }
      if (policy.password_history_count !== undefined) {
        updates.push(`password_history_count = $${paramIndex++}`);
        values.push(policy.password_history_count);
      }
      if (policy.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(policy.description);
      }

      updates.push(`updated_at = NOW()`);

      const query = `UPDATE password_policy SET ${updates.join(', ')} RETURNING *`;
      const result = await pool.query(query, values);

      console.log('✓ Password policy updated');
      return result.rows[0];
    } catch (error) {
      console.error('Error updating password policy:', error);
      return null;
    }
  }

  /**
   * Validate password against policy
   */
  async validatePassword(password: string, userId?: string): Promise<PasswordValidationResult> {
    const errors: string[] = [];
    const policy = await this.getPolicy();

    if (!policy) {
      return {
        valid: false,
        errors: ['Password policy not configured'],
        strength: 'weak'
      };
    }

    // Check minimum length
    if (password.length < policy.min_length) {
      errors.push(`Password must be at least ${policy.min_length} characters long`);
    }

    // Check uppercase requirement
    if (policy.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter (A-Z)');
    }

    // Check lowercase requirement
    if (policy.require_lowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter (a-z)');
    }

    // Check numbers requirement
    if (policy.require_numbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number (0-9)');
    }

    // Check special characters requirement
    if (policy.require_special_chars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&* etc.)');
    }

    // Check for common/weak patterns
    const weakPatterns = [
      /^(password|123456|qwerty|abc123|111111|000000|12345678|1234567890)/i,
      /^(admin|user|test|demo|guest)/i,
      /(.)\1{3,}/, // 4+ repeated characters
    ];

    if (weakPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password is too common or easy to guess. Use a more complex password.');
    }

    // Check password history if userId provided
    if (userId) {
      const isSimilarToPrevious = await this.isPasswordSimilarToPrevious(userId, password);
      if (isSimilarToPrevious) {
        errors.push(`Cannot reuse recent passwords. Please choose a different password.`);
      }
    }

    // Determine password strength
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    if (errors.length === 0) {
      const strengthScore = this.calculatePasswordStrength(password);
      if (strengthScore >= 4) {
        strength = 'strong';
      } else if (strengthScore >= 3) {
        strength = 'good';
      } else if (strengthScore >= 2) {
        strength = 'fair';
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Calculate password strength score
   */
  private calculatePasswordStrength(password: string): number {
    let score = 0;

    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // Mixed case
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

    return score;
  }

  /**
   * Check if password is similar to previous passwords
   */
  async isPasswordSimilarToPrevious(userId: string, newPassword: string): Promise<boolean> {
    try {
      const policy = await this.getPolicy();
      if (!policy) return false;

      const result = await pool.query(
        `SELECT password_hash FROM password_history 
         WHERE user_id = $1 
         ORDER BY changed_at DESC 
         LIMIT $2`,
        [userId, policy.password_history_count]
      );

      // Check if new password matches any recent passwords
      for (const record of result.rows) {
        const matches = await bcrypt.compare(newPassword, record.password_hash);
        if (matches) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking password history:', error);
      return false;
    }
  }

  /**
   * Store password in history
   */
  async storePasswordHistory(userId: string, passwordHash: string): Promise<boolean> {
    try {
      const policy = await this.getPolicy();
      if (!policy) return false;

      // Insert new password
      await pool.query(
        'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
        [userId, passwordHash]
      );

      // Delete old passwords beyond the policy history count
      await pool.query(
        `DELETE FROM password_history 
         WHERE user_id = $1 AND id NOT IN (
           SELECT id FROM password_history 
           WHERE user_id = $1 
           ORDER BY changed_at DESC 
           LIMIT $2
         )`,
        [userId, policy.password_history_count]
      );

      console.log('✓ Password stored in history for user:', userId);
      return true;
    } catch (error) {
      console.error('Error storing password history:', error);
      return false;
    }
  }

  /**
   * Check if user's password has expired
   */
  async isPasswordExpired(userId: string): Promise<boolean> {
    try {
      const policy = await this.getPolicy();
      if (!policy || policy.password_expiry_days === 0) {
        return false; // Password expiry disabled
      }

      const result = await pool.query(
        'SELECT password_changed_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) return false;

      const passwordChangedAt = new Date(result.rows[0].password_changed_at);
      const expiryDate = new Date(passwordChangedAt);
      expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);

      return new Date() > expiryDate;
    } catch (error) {
      console.error('Error checking password expiry:', error);
      return false;
    }
  }

  /**
   * Get password expiry info for user
   */
  async getPasswordExpiryInfo(userId: string): Promise<{ daysUntilExpiry: number; isExpired: boolean } | null> {
    try {
      const policy = await this.getPolicy();
      if (!policy || policy.password_expiry_days === 0) {
        return { daysUntilExpiry: -1, isExpired: false }; // Expiry disabled
      }

      const result = await pool.query(
        'SELECT password_changed_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) return null;

      const passwordChangedAt = new Date(result.rows[0].password_changed_at);
      const expiryDate = new Date(passwordChangedAt);
      expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);

      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        isExpired: now > expiryDate
      };
    } catch (error) {
      console.error('Error getting password expiry info:', error);
      return null;
    }
  }

  /**
   * Reset password expiry for user (admin force reset)
   */
  async resetPasswordExpiry(userId: string): Promise<boolean> {
    try {
      const policy = await this.getPolicy();
      if (!policy) return false;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + policy.password_expiry_days);

      await pool.query(
        `UPDATE users 
         SET password_changed_at = NOW(), 
             password_expires_at = $1,
             force_password_change = false,
             updated_at = NOW()
         WHERE id = $2`,
        [expiryDate, userId]
      );

      console.log('✓ Password expiry reset for user:', userId);
      return true;
    } catch (error) {
      console.error('Error resetting password expiry:', error);
      return false;
    }
  }

  /**
   * Force password change for user
   */
  async forcePasswordChange(userId: string): Promise<boolean> {
    try {
      await pool.query(
        'UPDATE users SET force_password_change = true WHERE id = $1',
        [userId]
      );

      console.log('✓ Forced password change for user:', userId);
      return true;
    } catch (error) {
      console.error('Error forcing password change:', error);
      return false;
    }
  }

  /**
   * Check if user needs to change password
   */
  async userNeedsPasswordChange(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT force_password_change FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) return false;

      return result.rows[0].force_password_change === true;
    } catch (error) {
      console.error('Error checking password change requirement:', error);
      return false;
    }
  }
}

export default new PasswordPolicyService();
