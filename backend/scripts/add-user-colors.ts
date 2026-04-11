import pool from '../src/config/database';

async function addColorCodeColumn() {
  try {
    console.log('🎨 Adding color_code column to users table...');
    
    // Add color_code column if it doesn't exist
    try {
      await pool.query(
        `ALTER TABLE users ADD COLUMN color_code VARCHAR(50) DEFAULT NULL`
      );
      console.log('✓ Added color_code column');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('ℹ color_code column already exists');
      } else {
        throw e;
      }
    }

    console.log('✅ Color migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to add color_code column:', error);
    process.exit(1);
  }
}

addColorCodeColumn();
