import pool from './src/config/database';

async function addManagerIdColumn() {
  try {
    console.log('\n=== Updating users table ===\n');

    // Check if manager_id column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='manager_id'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ manager_id column already exists');
    } else {
      console.log('Adding manager_id column...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ manager_id column added');
    }

    // Create index for manager_id
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id)
      `);
      console.log('✓ Index on manager_id created');
    } catch (e) {
      console.log('✓ Index on manager_id already exists');
    }

    console.log('\n✓ Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addManagerIdColumn();
