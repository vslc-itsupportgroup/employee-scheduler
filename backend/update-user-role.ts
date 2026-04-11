import pool from './src/config/database';

async function updateUserRole() {
  try {
    // Find Ken Pags
    const findResult = await pool.query(
      "SELECT id, first_name, last_name, email, role FROM users WHERE (LOWER(first_name) || ' ' || LOWER(last_name)) LIKE LOWER('%ken%pag%') OR (LOWER(first_name) || ' ' || LOWER(last_name)) LIKE LOWER('%pag%ken%')"
    );

    if (findResult.rows.length === 0) {
      console.log('No user found with name Ken Pags');
      process.exit(1);
    }

    console.log('\nFound user(s):');
    findResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - Current role: ${user.role}`);
    });

    // Update the first match to admin
    const user = findResult.rows[0];
    const updateResult = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, first_name, last_name, role',
      ['admin', user.id]
    );

    console.log(`\n✅ Successfully updated ${user.first_name} ${user.last_name} to admin role`);
    console.log(`New role: ${updateResult.rows[0].role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateUserRole();
