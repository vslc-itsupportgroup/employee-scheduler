import { Request, Response } from 'express';
import pool from '../config/database';
import emailService from '../services/emailService';

export const getEmailConfig = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, smtp_server, smtp_port, smtp_username, sender_email, sender_name, test_email_subject, confirmation_email_subject, is_configured FROM email_config LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({
        configured: false,
        message: 'No email configuration found in database',
        config: null
      });
    }

    const config = result.rows[0];
    console.log('✓ Email config retrieved from database:', {
      smtp_server: config.smtp_server,
      smtp_port: config.smtp_port,
      smtp_username: config.smtp_username,
      sender_email: config.sender_email,
      sender_name: config.sender_name,
      is_configured: config.is_configured
    });

    res.json({
      configured: config.is_configured === true,
      message: config.is_configured ? 'Email configuration is active' : 'Email configuration exists but is not activated',
      config: {
        id: config.id,
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        smtp_username: config.smtp_username,
        sender_email: config.sender_email,
        sender_name: config.sender_name || 'Employee Schedule',
        test_email_subject: config.test_email_subject || 'Test Email - Employee Scheduling System',
        confirmation_email_subject: config.confirmation_email_subject || 'Email Verification - Employee Scheduling System',
        is_configured: config.is_configured
        // Note: password is intentionally omitted for security
      }
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch email configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateEmailConfig = async (req: Request, res: Response) => {
  try {
    const { smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, test_email_subject, confirmation_email_subject } = req.body;

    if (!smtp_server || !smtp_port || !smtp_username || !sender_email) {
      return res.status(400).json({ error: 'Missing required configuration fields: smtp_server, smtp_port, smtp_username, sender_email' });
    }

    // Check if config already exists
    const existingConfig = await pool.query('SELECT id FROM email_config LIMIT 1');

    if (existingConfig.rows.length > 0) {
      // Update existing config
      let result;
      // If password is provided, update it; otherwise keep existing password
      if (smtp_password) {
        result = await pool.query(
          `UPDATE email_config 
           SET smtp_server = $1, smtp_port = $2, smtp_username = $3, smtp_password = $4, 
               sender_email = $5, sender_name = $6, test_email_subject = $7, confirmation_email_subject = $8,
               is_configured = true, updated_at = NOW()
           WHERE id = $9
           RETURNING id, smtp_server, smtp_port, smtp_username, sender_email, sender_name, test_email_subject, confirmation_email_subject, is_configured`,
          [smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, test_email_subject || 'Test Email - Employee Scheduling System', confirmation_email_subject || 'Email Verification - Employee Scheduling System', existingConfig.rows[0].id]
        );
      } else {
        // Keep existing password if not provided
        result = await pool.query(
          `UPDATE email_config 
           SET smtp_server = $1, smtp_port = $2, smtp_username = $3, 
               sender_email = $4, sender_name = $5, test_email_subject = $6, confirmation_email_subject = $7,
               is_configured = true, updated_at = NOW()
           WHERE id = $8
           RETURNING id, smtp_server, smtp_port, smtp_username, sender_email, sender_name, test_email_subject, confirmation_email_subject, is_configured`,
          [smtp_server, smtp_port, smtp_username, sender_email, sender_name, test_email_subject || 'Test Email - Employee Scheduling System', confirmation_email_subject || 'Email Verification - Employee Scheduling System', existingConfig.rows[0].id]
        );
      }

      const config = result.rows[0];
      console.log('✓ Email configuration updated:', {
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        smtp_username: config.smtp_username,
        sender_email: config.sender_email,
        sender_name: config.sender_name
      });

      return res.json({
        message: 'Email configuration updated successfully',
        configured: true,
        config: {
          id: config.id,
          smtp_server: config.smtp_server,
          smtp_port: config.smtp_port,
          smtp_username: config.smtp_username,
          sender_email: config.sender_email,
          sender_name: config.sender_name || 'Employee Schedule',
          test_email_subject: config.test_email_subject,
          confirmation_email_subject: config.confirmation_email_subject,
          is_configured: config.is_configured
          // Note: password is intentionally omitted for security
        }
      });
    } else {
      // Create new config
      const result = await pool.query(
        `INSERT INTO email_config (smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, test_email_subject, confirmation_email_subject, is_configured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING id, smtp_server, smtp_port, smtp_username, sender_email, sender_name, test_email_subject, confirmation_email_subject, is_configured`,
        [smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, test_email_subject || 'Test Email - Employee Scheduling System', confirmation_email_subject || 'Email Verification - Employee Scheduling System']
      );

      const config = result.rows[0];
      console.log('✓ Email configuration created:', {
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        smtp_username: config.smtp_username,
        sender_email: config.sender_email,
        sender_name: config.sender_name
      });

      return res.status(201).json({
        message: 'Email configuration created successfully',
        configured: true,
        config: {
          id: config.id,
          smtp_server: config.smtp_server,
          smtp_port: config.smtp_port,
          smtp_username: config.smtp_username,
          sender_email: config.sender_email,
          sender_name: config.sender_name || 'Employee Schedule',
          test_email_subject: config.test_email_subject,
          confirmation_email_subject: config.confirmation_email_subject,
          is_configured: config.is_configured
          // Note: password is intentionally omitted for security
        }
      });
    }
  } catch (error) {
    console.error('Email config update error:', error);
    res.status(500).json({ 
      error: 'Failed to update email configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const testEmailConfig = async (req: Request, res: Response) => {
  try {
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({ error: 'Test email address required' });
    }

    // Fetch full config from database
    const configResult = await pool.query(
      'SELECT smtp_server, smtp_port, smtp_username, smtp_password, sender_email, sender_name, is_configured FROM email_config LIMIT 1'
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].is_configured) {
      return res.status(400).json({ error: 'Email configuration not set up' });
    }

    const config = configResult.rows[0];
    
    // Determine encryption method
    let encryptionMethod = 'None';
    if (config.smtp_port === 465) {
      encryptionMethod = 'Implicit SSL/TLS';
    } else if (config.smtp_port === 587) {
      encryptionMethod = 'STARTTLS';
    }

    console.log('\n========== EMAIL TEST START ==========');
    console.log('Configuration Details:');
    console.log({
      smtp_server: config.smtp_server,
      smtp_port: config.smtp_port,
      encryption: encryptionMethod,
      username: config.smtp_username,
      sender_email: config.sender_email,
      test_recipient: test_email
    });
    console.log('=====================================\n');

    // Force reload email service with latest config
    await emailService.loadConfig();
    
    // Step 1: Verify connection
    console.log('Step 1: Verifying SMTP connection...');
    const isConnected = await emailService.verifyConnection();
    
    if (!isConnected) {
      return res.status(500).json({ 
        error: 'SMTP Connection Failed - Check server logs for details',
        diagnostic: {
          status: 'CONNECTION_FAILED',
          config: {
            smtp_server: config.smtp_server,
            smtp_port: config.smtp_port,
            encryption: encryptionMethod,
            username: config.smtp_username
          },
          troubleshooting: [
            'Verify SMTP credentials are correct',
            'Check if password needs to be an "App Password" for Outlook',
            'Ensure firewall/network allows outgoing connections to SMTP port',
            'Check if account has 2FA enabled (requires app password)',
            'Try using a different test email address'
          ]
        }
      });
    }

    // Step 2: Send test email
    console.log('Step 2: Sending test email (connectivity check - simple content)...');
    const success = await emailService.sendTestEmail(test_email);

    if (success) {
      console.log('✓ Test email sent successfully\n');
      res.json({ 
        message: 'Test email sent successfully to ' + test_email,
        status: 'SUCCESS',
        type: 'TEST_EMAIL',
        description: 'This is a connectivity test. Production emails will have different content.',
        config: {
          smtp_server: config.smtp_server,
          smtp_port: config.smtp_port,
          encryption: encryptionMethod,
          sender_email: config.sender_email,
          username: config.smtp_username
        },
        nextSteps: 'Check your inbox/spam folder for the test email'
      });
    } else {
      console.log('❌ Failed to send test email\n');
      res.status(500).json({ 
        error: 'Failed to send test email - Check server logs for detailed error',
        status: 'SEND_FAILED',
        config: {
          smtp_server: config.smtp_server,
          smtp_port: config.smtp_port,
          encryption: encryptionMethod,
          sender_email: config.sender_email,
          username: config.smtp_username
        },
        troubleshooting: [
          'Connection successful but email send failed',
          'Check sender_email is valid and authorized',
          'Email address might be invalid',
          'Review detailed error logs in server console'
        ]
      });
    }
  } catch (error: any) {
    console.error('❌ EMAIL TEST EXCEPTION:', error);
    res.status(500).json({ 
      error: 'Failed to test email configuration',
      status: 'ERROR',
      details: error.message || error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
