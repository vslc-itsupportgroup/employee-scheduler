import pool from '../config/database';

interface ConfirmationRecord {
  id: string;
  user_id: string;
  confirmation_code: string;
  attempts: number;
  max_attempts: number;
  expires_at: Date;
  confirmed_at: Date | null;
  created_at: Date;
}

class EmailConfirmationService {
  /**
   * Store a confirmation code for a user with 15-minute expiry
   */
  async storeConfirmationCode(
    userId: string,
    confirmationCode: string,
    maxAttempts: number = 5
  ): Promise<ConfirmationRecord | null> {
    try {
      // Calculate expiry: 15 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      console.log('📧 Storing confirmation code:', {
        userId,
        code: confirmationCode,
        expiresAt: expiresAt.toISOString(),
        maxAttempts
      });

      const result = await pool.query(
        `INSERT INTO email_confirmations (user_id, confirmation_code, attempts, max_attempts, expires_at)
         VALUES ($1, $2, 0, $3, $4)
         RETURNING id, user_id, confirmation_code, attempts, max_attempts, expires_at, confirmed_at, created_at`,
        [userId, confirmationCode, maxAttempts, expiresAt]
      );

      if (result.rows.length === 0) {
        console.error('Failed to store confirmation code');
        return null;
      }

      const record = result.rows[0];
      console.log('✓ Confirmation code stored successfully:', {
        recordId: record.id,
        userId: record.user_id,
        expiresAt: record.expires_at
      });

      return {
        id: record.id,
        user_id: record.user_id,
        confirmation_code: record.confirmation_code,
        attempts: record.attempts,
        max_attempts: record.max_attempts,
        expires_at: new Date(record.expires_at),
        confirmed_at: record.confirmed_at ? new Date(record.confirmed_at) : null,
        created_at: new Date(record.created_at)
      };
    } catch (error) {
      console.error('Error storing confirmation code:', error);
      return null;
    }
  }

  /**
   * Verify a confirmation code
   * Returns: { valid: boolean; message: string; isExpired: boolean; isMaxAttemptsExceeded: boolean }
   */
  async verifyConfirmationCode(
    userId: string,
    confirmationCode: string
  ): Promise<{ valid: boolean; message: string; isExpired: boolean; isMaxAttemptsExceeded: boolean }> {
    try {
      const result = await pool.query(
        `SELECT id, confirmation_code, attempts, max_attempts, expires_at, confirmed_at
         FROM email_confirmations
         WHERE user_id = $1 AND confirmed_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          valid: false,
          message: 'No pending confirmation code found',
          isExpired: false,
          isMaxAttemptsExceeded: false
        };
      }

      const record = result.rows[0];
      const now = new Date();
      const expiresAt = new Date(record.expires_at);

      // Check if code has expired
      if (now > expiresAt) {
        console.warn('⚠️ Confirmation code expired:', {
          userId,
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString()
        });

        return {
          valid: false,
          message: `Confirmation code expired. It was valid for only 15 minutes. Please request a new code.`,
          isExpired: true,
          isMaxAttemptsExceeded: false
        };
      }

      // Check if max attempts exceeded
      if (record.attempts >= record.max_attempts) {
        console.warn('⚠️ Max verification attempts exceeded:', {
          userId,
          attempts: record.attempts,
          maxAttempts: record.max_attempts
        });

        return {
          valid: false,
          message: `Maximum verification attempts (${record.max_attempts}) exceeded. Please request a new code.`,
          isExpired: false,
          isMaxAttemptsExceeded: true
        };
      }

      // Check if code matches
      if (record.confirmation_code !== confirmationCode) {
        // Increment attempts
        const newAttempts = record.attempts + 1;
        const attemptsRemaining = record.max_attempts - newAttempts;

        await pool.query(
          'UPDATE email_confirmations SET attempts = $1 WHERE id = $2',
          [newAttempts, record.id]
        );

        console.warn('❌ Wrong confirmation code:', {
          userId,
          attempt: newAttempts,
          maxAttempts: record.max_attempts,
          attemptsRemaining
        });

        return {
          valid: false,
          message: `Incorrect code. ${attemptsRemaining > 0 ? `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.` : 'No attempts remaining.'}`,
          isExpired: false,
          isMaxAttemptsExceeded: newAttempts >= record.max_attempts
        };
      }

      // Code is valid! Mark as confirmed
      await pool.query(
        'UPDATE email_confirmations SET confirmed_at = NOW() WHERE id = $1',
        [record.id]
      );

      console.log('✓ Confirmation code verified successfully:', {
        userId,
        expiresAt: expiresAt.toISOString(),
        timeRemainingMs: expiresAt.getTime() - now.getTime()
      });

      return {
        valid: true,
        message: 'Email confirmed successfully!',
        isExpired: false,
        isMaxAttemptsExceeded: false
      };
    } catch (error) {
      console.error('Error verifying confirmation code:', error);
      return {
        valid: false,
        message: 'An error occurred while verifying the code',
        isExpired: false,
        isMaxAttemptsExceeded: false
      };
    }
  }

  /**
   * Get remaining time for a confirmation code in seconds
   */
  async getCodeTimeRemaining(userId: string): Promise<number | null> {
    try {
      const result = await pool.query(
        `SELECT expires_at FROM email_confirmations
         WHERE user_id = $1 AND confirmed_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const expiresAt = new Date(result.rows[0].expires_at);
      const now = new Date();
      const remainingMs = expiresAt.getTime() - now.getTime();

      return Math.max(0, Math.floor(remainingMs / 1000));
    } catch (error) {
      console.error('Error getting code time remaining:', error);
      return null;
    }
  }

  /**
   * Mark email as verified (confirmed)
   */
  async confirmEmail(userId: string): Promise<boolean> {
    try {
      await pool.query(
        'UPDATE users SET email_verified = true WHERE id = $1',
        [userId]
      );

      console.log('✓ User email marked as verified:', userId);
      return true;
    } catch (error) {
      console.error('Error confirming email:', error);
      return false;
    }
  }

  /**
   * Cleanup expired confirmation codes
   */
  async cleanupExpiredCodes(): Promise<number> {
    try {
      const result = await pool.query(
        'DELETE FROM email_confirmations WHERE expires_at < CURRENT_TIMESTAMP AND confirmed_at IS NULL'
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Cleaned up ${result.rowCount} expired confirmation code(s)`);
      }

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
      return 0;
    }
  }
}

export default new EmailConfirmationService();
