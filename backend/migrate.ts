import pool from './src/config/database';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    // Add force_password_change column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;
    `);
    console.log('✓ Added force_password_change column');
    
    // Add password_expires_at column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP;
    `);
    console.log('✓ Added password_expires_at column');
    
    // Add manager_id column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('✓ Added manager_id column');

    // Create password_policy table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_policy (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        min_length INT DEFAULT 8,
        require_uppercase BOOLEAN DEFAULT true,
        require_lowercase BOOLEAN DEFAULT true,
        require_numbers BOOLEAN DEFAULT true,
        require_special_chars BOOLEAN DEFAULT true,
        expiry_days INT DEFAULT 90,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created password_policy table');

    // Add test_email_subject column to email_config if it doesn't exist
    await pool.query(`
      ALTER TABLE email_config 
      ADD COLUMN IF NOT EXISTS test_email_subject VARCHAR(255) DEFAULT 'Test Email - Employee Scheduling System';
    `);
    console.log('✓ Added test_email_subject column');

    // Create password_reset_tokens table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reset_code VARCHAR(6) NOT NULL,
        used BOOLEAN DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created password_reset_tokens table');

    console.log('✓ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
