import pool from '../src/config/database';

async function updateEmailConfig() {
  try {
    console.log('🔄 Fixing email_config table schema...');
    
    const queries = [
      `ALTER TABLE email_config ADD COLUMN IF NOT EXISTS test_email_subject VARCHAR(255) DEFAULT 'Test Email - Employee Scheduling System'`,
      `ALTER TABLE email_config ADD COLUMN IF NOT EXISTS confirmation_email_subject VARCHAR(255) DEFAULT 'Email Verification - Employee Scheduling System'`
    ];
    
    for (const query of queries) {
      try {
        await pool.query(query);
        console.log('✓ Updated email_config schema');
      } catch (e: any) {
        console.log('ℹ Email config already up to date');
      }
    }
    
    console.log('✅ Email config schema is complete');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateEmailConfig();
