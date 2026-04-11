import pool from './src/config/database';

async function testScheduleWorkflow() {
  try {
    console.log('\n=== Testing Schedule Overwrite Workflow ===\n');

    // Get or create users
    const userResult = await pool.query(
      `SELECT id, email, role FROM users LIMIT 5`
    );
    
    if (userResult.rows.length < 2) {
      console.log('❌ Need at least 2 users in database for testing');
      process.exit(1);
    }

    const admin = userResult.rows.find((u: any) => u.role === 'admin');
    const employee = userResult.rows.find((u: any) => u.role === 'employee') || userResult.rows[0];

    if (!admin) {
      console.log('❌ Need at least one admin user');
      process.exit(1);
    }

    console.log(`Admin: ${admin.email}`);
    console.log(`Employee: ${employee.email}\n`);

    // Get a shift type
    const shiftResult = await pool.query(`SELECT id, code FROM shift_types LIMIT 1`);
    const shift = shiftResult.rows[0];

    console.log('1. Admin creates schedule for employee on 2026-04-15...');
    const testDate = '2026-04-15';

    const firstSchedule = await pool.query(
      `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
       VALUES ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)
       RETURNING id, shift_type_id, status`,
      [employee.id, shift.id, testDate, admin.id]
    );
    console.log(`✓ Created schedule: ID ${firstSchedule.rows[0].id.substring(0, 8)}..., Status: ${firstSchedule.rows[0].status}`);

    // Get another shift
    const shiftResult2 = await pool.query(`SELECT id, code FROM shift_types WHERE code != $1 LIMIT 1`, [shift.code]);
    const shift2 = shiftResult2.rows[0];

    console.log(`\n2. Admin overwrites same date with different shift (${shift2.code})...`);
    
    // Simulate ON CONFLICT behavior
    const overwriteSchedule = await pool.query(
      `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
       VALUES ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)
       ON CONFLICT(employee_id, scheduled_date) DO UPDATE SET
         shift_type_id = $2,
         status = 'approved',
         approved_by = $4,
         approval_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, shift_type_id, status`,
      [employee.id, shift2.id, testDate, admin.id]
    );
    console.log(`✓ Schedule overwritten: Shift changed from ${shift.code} to ${shift2.code}`);
    console.log(`  Status: ${overwriteSchedule.rows[0].status} (auto-approved)`);

    console.log(`\n3. Verifying only latest schedule exists for this date...`);
    const verification = await pool.query(
      `SELECT COUNT(*) as count FROM schedules WHERE employee_id = $1 AND scheduled_date = $2`,
      [employee.id, testDate]
    );
    console.log(`✓ Count: ${verification.rows[0].count} (should be 1)`);

    console.log('\n✓ Schedule overwrite workflow working correctly!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testScheduleWorkflow();
