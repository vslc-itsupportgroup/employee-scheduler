import crypto from 'crypto';
import pool from '../config/database';
import emailService from './emailService';

export interface LoginSessionData {
  sessionId: string;
  revokeToken: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}

class LoginConfirmationService {
  /**
   * Create a login session with tracking information
   */
  async createLoginSession(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    tokenExpiresAt: Date
  ): Promise<LoginSessionData | null> {
    try {
      const revokeToken = crypto.randomBytes(32).toString('hex');
      const sessionId = crypto.randomUUID();

      const result = await pool.query(
        `INSERT INTO login_sessions (id, user_id, token, ip_address, user_agent, revoke_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, revoke_token, expires_at`,
        [sessionId, userId, token, ipAddress, userAgent, revokeToken, tokenExpiresAt]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = result.rows[0];
      return {
        sessionId: session.id,
        revokeToken: session.revoke_token,
        ipAddress,
        userAgent,
        expiresAt: session.expires_at
      };
    } catch (error) {
      console.error('Error creating login session:', error);
      return null;
    }
  }

  /**
   * Check if user has confirmation emails enabled
   */
  async isConfirmationEmailEnabled(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT confirmation_email_enabled FROM users WHERE id = $1',
        [userId]
      );
      return result.rows.length > 0 && result.rows[0].confirmation_email_enabled === true;
    } catch (error) {
      console.error('Error checking confirmation email status:', error);
      return false;
    }
  }

  /**
   * Enable confirmation emails for a user
   */
  async enableConfirmationEmail(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'UPDATE users SET confirmation_email_enabled = true WHERE id = $1 RETURNING id',
        [userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error enabling confirmation email:', error);
      return false;
    }
  }

  /**
   * Disable confirmation emails for a user
   */
  async disableConfirmationEmail(userId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'UPDATE users SET confirmation_email_enabled = false WHERE id = $1 RETURNING id',
        [userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error disabling confirmation email:', error);
      return false;
    }
  }

  /**
   * Get browser/device info from user agent
   */
  private parseBrowserInfo(userAgent: string): { browser: string; os: string } {
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Simple browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Simple OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('iPhone')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';

    return { browser, os };
  }

  /**
   * Send login confirmation email
   */
  async sendLoginConfirmationEmail(
    userEmail: string,
    userName: string,
    ipAddress: string,
    userAgent: string,
    revokeLink: string
  ): Promise<boolean> {
    try {
      const { browser, os } = this.parseBrowserInfo(userAgent);
      const loginTime = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
            .info-item { margin: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .button:hover { background: #764ba2; }
            .danger { background: #fee2e2; border-left-color: #dc2626; }
            .danger .label { color: #dc2626; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Login Confirmation</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Your account was successfully logged into. Here are the details of this login:</p>
              
              <div class="info-box">
                <div class="info-item">
                  <span class="label">Login Time:</span> ${loginTime}
                </div>
                <div class="info-item">
                  <span class="label">Device:</span> ${browser} on ${os}
                </div>
                <div class="info-item">
                  <span class="label">IP Address:</span> ${ipAddress}
                </div>
              </div>
              
              <p><strong>If this wasn't you:</strong></p>
              <p>Click the button below to immediately revoke this session and secure your account.</p>
              
              <a href="${revokeLink}" class="button" style="display: inline-block;">Revoke This Session</a>
              
              <div class="info-box danger" style="margin-top: 30px;">
                <p><strong>Security Tip:</strong> Never share your login credentials or confirmation emails with anyone. Employee Scheduler will never ask for your password via email.</p>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                This is an automated security notice. If you have any questions or concerns, please contact your administrator.
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Employee Scheduler. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Login Confirmation
        
        Hi ${userName},
        
        Your account was successfully logged into on:
        ${loginTime}
        
        Device: ${browser} on ${os}
        IP Address: ${ipAddress}
        
        If this wasn't you, click the link below to revoke this session:
        ${revokeLink}
        
        For security, never share your credentials or this email with anyone.
      `;

      return await emailService.sendEmail(
        userEmail,
        'Login Confirmation - Your Account',
        htmlContent,
        textContent
      );
    } catch (error) {
      console.error('Error sending login confirmation email:', error);
      return false;
    }
  }

  /**
   * Revoke a login session
   */
  async revokeSession(revokeToken: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE login_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP 
         WHERE revoke_token = $1 AND is_revoked = false
         RETURNING id`,
        [revokeToken]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await pool.query(
        'DELETE FROM login_sessions WHERE expires_at < CURRENT_TIMESTAMP'
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }
}

export default new LoginConfirmationService();
