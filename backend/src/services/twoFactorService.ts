import crypto from 'crypto';
import pool from '../config/database';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

interface TOTPSetupResult {
  secret: string;
  qrcodeUrl: string;
  qrcodeDataUrl?: string;
}

interface TOTPVerifyResult {
  valid: boolean;
  window: number;
}

class TwoFactorService {
  /**
   * Generate a random secret for TOTP using speakeasy
   */
  async generateTOTPSecret(email: string): Promise<TOTPSetupResult> {
    const appName = 'Employee Scheduler';
    
    // Generate a secret using speakeasy
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      issuer: appName,
      length: 32
    });

    if (!secret.base32 || !secret.otpauth_url) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Generate QR code data URL
    let qrcodeDataUrl = '';
    try {
      qrcodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    } catch (error) {
      console.warn('Could not generate QR code image, proceeding without it');
    }

    return {
      secret: secret.base32,
      qrcodeUrl: secret.otpauth_url,
      qrcodeDataUrl
    };
  }

  /**
   * Verify a TOTP token using speakeasy with time window tolerance
   */
  verifyTOTP(secret: string, token: string): TOTPVerifyResult {
    try {
      // Token should be 6 digits
      if (!/^\d{6}$/.test(token)) {
        return { valid: false, window: 0 };
      }

      // Verify using speakeasy with ±1 window (±30 seconds tolerance)
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1  // Allow current, previous, and next time window
      });

      return {
        valid: verified,
        window: verified ? 0 : -1
      };
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return { valid: false, window: 0 };
    }
  }

  /**
   * Enable 2FA for a user after they've verified the setup
   */
  async enableTwoFAForUser(userId: string, secret: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'UPDATE users SET two_fa_enabled = true, two_fa_secret = $1 WHERE id = $2 RETURNING id',
        [secret, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error enabling 2FA for user:', error);
      return false;
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disableTwoFAForUser(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'UPDATE users SET two_fa_enabled = false, two_fa_secret = NULL WHERE id = $1 RETURNING id',
        [userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error disabling 2FA for user:', error);
      return false;
    }
  }

  /**
   * Check if a user has 2FA enabled
   */
  async isUserTwoFAEnabled(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT two_fa_enabled FROM users WHERE id = $1',
        [userId]
      );
      return result.rows.length > 0 && result.rows[0].two_fa_enabled === true;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  /**
   * Get user's 2FA secret (for verification)
   */
  async getUserTwoFASecret(userId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        'SELECT two_fa_secret FROM users WHERE id = $1',
        [userId]
      );
      return result.rows.length > 0 ? result.rows[0].two_fa_secret : null;
    } catch (error) {
      console.error('Error getting user 2FA secret:', error);
      return null;
    }
  }
}

export default new TwoFactorService();
