import pool from '../src/config/database';
import { assignUserColor } from '../src/services/colorService';

async function assignColorsToExistingUsers() {
  try {
    console.log('🎨 Assigning colors to existing users...');
    
    // Get all users without colors
    const result = await pool.query(
      'SELECT id, email FROM users WHERE color_code IS NULL OR color_code = \'\''
    );

    const users = result.rows;
    console.log(`Found ${users.length} users without colors`);

    let updated = 0;
    for (const user of users) {
      const color = assignUserColor(user.email);
      await pool.query(
        'UPDATE users SET color_code = $1 WHERE id = $2',
        [color, user.id]
      );
      updated++;
      console.log(`  ✓ Assigned ${color} to ${user.email}`);
    }

    console.log(`✅ Color assignment completed! Updated ${updated} users`);
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to assign colors:', error);
    process.exit(1);
  }
}

assignColorsToExistingUsers();
