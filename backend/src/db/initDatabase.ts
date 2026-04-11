import pool from '../config/database';

const initializeDatabase = async () => {
  try {
    console.log('🔄 Starting database initialization...');

    // 1. Add columns to users table if they don't exist
    console.log('✓ Checking users table schema...');
    
    try {
      await pool.query('ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT false');
      console.log('  ✓ Added two_fa_enabled column');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ two_fa_enabled column already exists');
      } else {
        throw e;
      }
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN two_fa_secret VARCHAR(255)');
      console.log('  ✓ Added two_fa_secret column');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ two_fa_secret column already exists');
      } else {
        throw e;
      }
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN confirmation_email_enabled BOOLEAN DEFAULT false');
      console.log('  ✓ Added confirmation_email_enabled column');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ confirmation_email_enabled column already exists');
      } else {
        throw e;
      }
    }

    // 2. Create login_sessions table
    console.log('✓ Checking login_sessions table...');

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS login_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          revoke_token VARCHAR(255) UNIQUE,
          is_revoked BOOLEAN DEFAULT false,
          revoked_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, token)
        )
      `);
      console.log('  ✓ Created login_sessions table');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('  ℹ login_sessions table already exists');
      } else {
        throw e;
      }
    }

    // 3. Create indexes
    console.log('✓ Creating indexes...');

    const indexes = [
      { name: 'idx_users_two_fa_enabled', query: 'CREATE INDEX IF NOT EXISTS idx_users_two_fa_enabled ON users(two_fa_enabled)' },
      { name: 'idx_login_sessions_user_id', query: 'CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id)' },
      { name: 'idx_login_sessions_token', query: 'CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions(token)' },
      { name: 'idx_login_sessions_revoke_token', query: 'CREATE INDEX IF NOT EXISTS idx_login_sessions_revoke_token ON login_sessions(revoke_token)' }
    ];

    for (const index of indexes) {
      try {
        await pool.query(index.query);
        console.log(`  ✓ Created ${index.name}`);
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(`  ℹ ${index.name} already exists`);
        } else {
          console.warn(`  ⚠ Could not create ${index.name}: ${e.message}`);
        }
      }
    }

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Added 2FA columns to users table');
    console.log('   • Created login_sessions table for session tracking');
    console.log('   • Created necessary indexes for performance');
    console.log('\n🎉 Your database is ready for 2FA and login confirmation features!');

    await pool.end();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();
