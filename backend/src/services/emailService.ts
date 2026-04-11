import nodemailer from 'nodemailer';
import pool from '../config/database';
import emailConfirmationService from './emailConfirmationService';

interface EmailConfig {
  smtp_server: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  sender_email: string;
  sender_name?: string;
  test_email_subject?: string;
  confirmation_email_subject?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  async loadConfig(): Promise<EmailConfig | null> {
    try {
      const result = await pool.query(
        'SELECT smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, test_email_subject, confirmation_email_subject FROM email_config WHERE is_configured = true LIMIT 1'
      );

      if (result.rows.length > 0) {
        this.config = result.rows[0];
        this.initializeTransporter();
        console.log('✓ Email config loaded successfully');
        return this.config;
      }
      console.warn('⚠ No email config found in database');
      return null;
    } catch (error) {
      console.error('Failed to load email config:', error);
      return null;
    }
  }

  // Verify the transporter connection
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('Transporter not initialized, loading config...');
        await this.loadConfig();
      }

      if (!this.transporter) {
        console.error('❌ Cannot verify: transporter is null');
        return false;
      }

      console.log('🔍 Verifying email connection...');
      await this.transporter.verify();
      console.log('✓ Email connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email connection verification failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  private initializeTransporter() {
    if (!this.config) return;

    try {
      // Configure based on port:
      // Port 465: Implicit SSL/TLS (secure: true)
      // Port 587: STARTTLS (secure: false, requireTLS: true)
      const transportConfig: any = {
        host: this.config.smtp_server,
        port: this.config.smtp_port,
        auth: {
          user: this.config.smtp_username,
          pass: this.config.smtp_password,
        },
      };

      // Port 465 = Implicit SSL
      if (this.config.smtp_port === 465) {
        transportConfig.secure = true;
      } 
      // Port 587 = STARTTLS
      else if (this.config.smtp_port === 587) {
        transportConfig.secure = false;
        transportConfig.requireTLS = true;
        transportConfig.tls = {
          rejectUnauthorized: false // Allow self-signed certificates (for testing/corporate networks)
        };
      }
      // Other ports - use secure if not 25 (plain SMTP)
      else if (this.config.smtp_port !== 25) {
        transportConfig.secure = true;
      }

      this.transporter = nodemailer.createTransport(transportConfig);
      
      console.log('✓ Email transporter initialized:', {
        host: this.config.smtp_server,
        port: this.config.smtp_port,
        secure: transportConfig.secure,
        requireTLS: transportConfig.requireTLS || 'N/A',
        auth_user: this.config.smtp_username
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  // Generate random confirmation code
  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('No transporter, loading config...');
        await this.loadConfig();
      }

      if (!this.transporter || !this.config) {
        console.error('❌ Email service not configured - no transporter or config');
        return false;
      }

      const mailOptions = {
        from: `${this.config.sender_name || 'Employee Schedule'} <${this.config.sender_email}>`,
        to: recipientEmail,
        subject: this.config.test_email_subject || 'Test Email - Employee Scheduling System',
        html: `
          <h2>Test Email - Connection Successful</h2>
          <p>This is a test email to verify SMTP connectivity.</p>
          <p><strong>Status:</strong> ✓ Connection is working!</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Employee Scheduling System<br>
            Sent at: ${new Date().toLocaleString()}
          </p>
        `,
      };

      console.log('📧 Sending test email to:', recipientEmail);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✓ Test email sent successfully:', {
        recipient: recipientEmail,
        messageId: info.messageId,
        response: info.response
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to send test email:', {
        recipient: recipientEmail,
        error: error instanceof Error ? error.message : error,
        code: (error as any)?.code,
        command: (error as any)?.command,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  async sendConfirmationEmail(email: string, userName: string, userId?: string): Promise<{ success: boolean; code?: string }> {
    try {
      if (!this.transporter) {
        console.log('No transporter, loading config...');
        await this.loadConfig();
      }

      if (!this.transporter || !this.config) {
        console.error('❌ Email service not configured - no transporter or config');
        return { success: false };
      }

      // Generate random confirmation code
      const confirmationCode = this.generateConfirmationCode();

      const mailOptions = {
        from: `${this.config.sender_name || 'Employee Schedule'} <${this.config.sender_email}>`,
        to: email,
        subject: this.config.confirmation_email_subject || 'Email Verification - Employee Scheduling System',
        html: `
          <h2>Email Verification</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for registering with our Employee Scheduling System.</p>
          <p>Please use the following confirmation code to verify your email address:</p>
          <h3 style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; font-family: monospace; font-size: 24px; letter-spacing: 2px;">
            ${confirmationCode}
          </h3>
          <p><strong>⏱️ This code will expire in 15 minutes.</strong></p>
          <p>If you did not register for this account, please ignore this email.</p>
          <p>Best regards,<br>Employee Scheduling Team</p>
        `,
      };

      console.log('📧 Sending verification email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        confirmationCode: confirmationCode,
        userId: userId || 'N/A'
      });

      const info = await this.transporter.sendMail(mailOptions);
      
      // Store confirmation code in database with 15-minute expiry if userId provided
      if (userId) {
        await emailConfirmationService.storeConfirmationCode(userId, confirmationCode, 5);
      }

      console.log('✓ Verification email sent successfully:', {
        recipient: email,
        messageId: info.messageId,
        confirmationCode: confirmationCode,
        expiryMinutes: 15,
        response: info.response
      });
      return { success: true, code: confirmationCode };
    } catch (error) {
      console.error('❌ Failed to send verification email:', {
        recipient: email,
        error: error instanceof Error ? error.message : error,
        code: (error as any)?.code,
        command: (error as any)?.command,
        stack: error instanceof Error ? error.stack : undefined
      });
      return { success: false };
    }
  }

  async isConfigured(): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT is_configured FROM email_config WHERE is_configured = true LIMIT 1'
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Failed to check email config:', error);
      return false;
    }
  }

  async sendApprovalRequestEmail(
    approverEmail: string,
    approverName: string,
    employeeName: string,
    changeRequestId: string,
    approvalToken: string,
    scheduledDate: string,
    currentShift: string,
    requestedShift: string,
    reason: string,
    appUrl: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.loadConfig();
      }

      if (!this.transporter || !this.config) {
        console.error('Email service not configured');
        return false;
      }

      const approvalLink = `${appUrl}/api/approvals/email-approve/${changeRequestId}/${approvalToken}`;
      const rejectLink = `${appUrl}/api/approvals/email-reject/${changeRequestId}/${approvalToken}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
              .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
              .request-details { background-color: #f0f4ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
              .detail-row:last-child { border-bottom: none; }
              .label { font-weight: 600; color: #555; }
              .value { color: #333; }
              .shift-change { background-color: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; }
              .button-container { display: flex; gap: 10px; margin: 30px 0; justify-content: space-between; }
              .btn { display: inline-block; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
              .btn-approve { background-color: #10b981; color: white; }
              .btn-approve:hover { background-color: #059669; }
              .btn-reject { background-color: #ef4444; color: white; }
              .btn-reject:hover { background-color: #dc2626; }
              .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 Schedule Change Approval Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${approverName}</strong>,</p>
                
                <p><strong>${employeeName}</strong> has requested a schedule change that requires your approval.</p>
                
                <div class="request-details">
                  <div class="detail-row">
                    <span class="label">Employee:</span>
                    <span class="value">${employeeName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Scheduled Date:</span>
                    <span class="value">${new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div class="shift-change">
                    <strong>Shift Change:</strong>
                    <div style="margin-top: 8px;">
                      <span style="background-color: #dbeafe; padding: 4px 8px; border-radius: 4px; margin-right: 10px;">
                        ${currentShift}
                      </span>
                      <span style="color: #666;">&rarr;</span>
                      <span style="background-color: #dcfce7; padding: 4px 8px; border-radius: 4px; margin-left: 10px;">
                        ${requestedShift}
                      </span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="label">Reason:</span>
                    <span class="value">${reason || 'No reason provided'}</span>
                  </div>
                </div>

                <p>Please review the request and take action:</p>
                
                <div class="button-container">
                  <a href="${approvalLink}" class="btn btn-approve">✓ Approve Request</a>
                  <a href="${rejectLink}" class="btn btn-reject">✗ Reject Request</a>
                </div>

                <div class="footer">
                  <p>© 2026 Employee Scheduling System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `${this.config.sender_name || 'Employee Schedule'} <${this.config.sender_email}>`,
        to: approverEmail,
        subject: `Schedule Change Approval: ${employeeName} - ${requestedShift}`,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✓ Approval request email sent to', approverEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send approval email:', {
        recipient: approverEmail,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  async sendApprovalConfirmationEmail(
    employeeEmail: string,
    employeeName: string,
    status: 'approved' | 'rejected',
    scheduledDate: string,
    shiftCode: string,
    remarks?: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.loadConfig();
      }

      if (!this.transporter || !this.config) {
        console.error('Email service not configured');
        return false;
      }

      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const statusColor = status === 'approved' ? '#10b981' : '#ef4444';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
              .header { background-color: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
              .status-badge { background-color: ${statusColor}; color: white; padding: 10px 15px; border-radius: 4px; display: inline-block; font-weight: 600; margin: 15px 0; }
              .details { background-color: #f0f4ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
              .footer { font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${status === 'approved' ? '✓' : '✗'} Schedule Change ${statusText}</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${employeeName}</strong>,</p>
                
                <p>Your schedule change request has been <strong>${statusText.toLowerCase()}</strong>.</p>
                
                <div class="status-badge">${statusText}</div>
                
                <div class="details">
                  <strong>Request Details:</strong>
                  <p>
                    <strong>Shift:</strong> ${shiftCode}<br>
                    <strong>Date:</strong> ${new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
                </div>

                ${status === 'approved' ? '<p>Your schedule has been updated. You can view your updated schedule in the system.</p>' : '<p>If you have any questions, please contact your manager.</p>'}

                <div class="footer">
                  <p>© 2026 Employee Scheduling System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `${this.config.sender_name || 'Employee Schedule'} <${this.config.sender_email}>`,
        to: employeeEmail,
        subject: `Schedule Change Request ${statusText}`,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✓ Confirmation email sent to', employeeEmail);
      return true;
    } catch (error) {
      console.error('❌ Failed to send confirmation email:', {
        recipient: employeeEmail,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.loadConfig();
      }

      if (!this.transporter || !this.config) {
        console.warn('Email service not configured, skipping email send');
        return false;
      }

      const mailOptions = {
        from: `"${this.config.sender_name || 'Employee Scheduler'}" <${this.config.sender_email}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✓ Email sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', {
        recipient: recipientEmail,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  async sendPasswordResetEmail(recipientEmail: string, resetCode: string): Promise<boolean> {
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Use the code below to proceed:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0;">
        ${resetCode}
      </div>
      <p>This code will expire in 15 minutes.</p>
      <p>If you didn't request a password reset, please ignore this email and contact our support team.</p>
      <p>Never share this code with anyone.</p>
    `;

    return this.sendEmail(
      recipientEmail,
      'Password Reset Code - Employee Scheduling System',
      htmlContent
    );
  }
}

export default new EmailService();
