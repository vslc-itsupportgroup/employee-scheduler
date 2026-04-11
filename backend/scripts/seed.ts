import pool from '../src/config/database';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');

    // 1. Get or create shift types
    const shifts = ['7-4', 'RD', 'VL', 'SPL', 'HDD'];
    const shiftIds: { [key: string]: string } = {};

    for (const shift of shifts) {
      const result = await pool.query(
        'SELECT id FROM shift_types WHERE code = $1',
        [shift]
      );
      if (result.rows.length > 0) {
        shiftIds[shift] = result.rows[0].id;
      }
    }

    console.log('✓ Shift types loaded');

    // 2. Create test employees
    const testEmployees = [
      { email: 'group1_emp1@test.com', first_name: 'John', last_name: 'Smith', group: 'Group 1', role: 'employee' },
      { email: 'group1_emp2@test.com', first_name: 'Alice', last_name: 'Johnson', group: 'Group 1', role: 'employee' },
      { email: 'group1_emp3@test.com', first_name: 'Bob', last_name: 'Williams', group: 'Group 1', role: 'employee' },
      { email: 'group2_emp1@test.com', first_name: 'Carol', last_name: 'Davis', group: 'Group 2', role: 'employee' },
      { email: 'group2_emp2@test.com', first_name: 'David', last_name: 'Miller', group: 'Group 2', role: 'employee' },
      { email: 'group2_emp3@test.com', first_name: 'Emma', last_name: 'Wilson', group: 'Group 2', role: 'employee' },
    ];

    const employeeIds: string[] = [];
    const password = await bcrypt.hash('password123', 10);

    for (const emp of testEmployees) {
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [emp.email]
      );

      if (checkResult.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, department, email_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true, true)
           RETURNING id`,
          [emp.email, password, emp.first_name, emp.last_name, emp.role, emp.group]
        );
        employeeIds.push(insertResult.rows[0].id);
      } else {
        employeeIds.push(checkResult.rows[0].id);
      }
    }

    console.log(`✓ Created/verified ${employeeIds.length} test employees`);

    // 3. Create schedules for April 2026
    const currentYear = 2026;
    const currentMonth = 4; // April

    // Group 1: Apr 14-28 with 7-4 shifts
    const group1Pattern = [
      { day: 14, shift: '7-4' },
      { day: 15, shift: '7-4' },
      { day: 16, shift: '7-4' },
      { day: 17, shift: 'RD' },
      { day: 18, shift: 'RD' },
      { day: 19, shift: '7-4' },
      { day: 20, shift: '7-4' },
      { day: 21, shift: '7-4' },
      { day: 22, shift: '7-4' },
      { day: 23, shift: 'RD' },
      { day: 24, shift: 'RD' },
      { day: 25, shift: '7-4' },
      { day: 26, shift: '7-4' },
      { day: 27, shift: 'RD' },
      { day: 28, shift: 'VL' },
    ];

    // Group 2: Different pattern
    const group2Pattern = [
      { day: 14, shift: 'RD' },
      { day: 15, shift: 'RD' },
      { day: 16, shift: '7-4' },
      { day: 17, shift: '7-4' },
      { day: 18, shift: '7-4' },
      { day: 19, shift: 'RD' },
      { day: 20, shift: 'RD' },
      { day: 21, shift: '7-4' },
      { day: 22, shift: '7-4' },
      { day: 23, shift: '7-4' },
      { day: 24, shift: 'RD' },
      { day: 25, shift: 'RD' },
      { day: 26, shift: '7-4' },
      { day: 27, shift: 'VL' },
      { day: 28, shift: '7-4' },
    ];

    let scheduleCount = 0;

    // Insert Group 1 schedules
    for (let i = 0; i < 3; i++) {
      for (const { day, shift } of group1Pattern) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        try {
          await pool.query(
            `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
             VALUES ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)
             ON CONFLICT(employee_id, scheduled_date) DO UPDATE SET
               shift_type_id = $2,
               updated_at = CURRENT_TIMESTAMP`,
            [employeeIds[i], shiftIds[shift], date, employeeIds[0]]
          );
          scheduleCount++;
        } catch (err) {
          console.log(`⚠️  Schedule insertion note for ${date}: ${(err as any).message}`);
        }
      }
    }

    // Insert Group 2 schedules
    for (let i = 0; i < 3; i++) {
      for (const { day, shift } of group2Pattern) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        try {
          await pool.query(
            `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
             VALUES ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)
             ON CONFLICT(employee_id, scheduled_date) DO UPDATE SET
               shift_type_id = $2,
               updated_at = CURRENT_TIMESTAMP`,
            [employeeIds[3 + i], shiftIds[shift], date, employeeIds[0]]
          );
          scheduleCount++;
        } catch (err) {
          console.log(`⚠️  Schedule insertion note for ${date}: ${(err as any).message}`);
        }
      }
    }

    console.log(`✓ Created ${scheduleCount} test schedule entries`);

    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('==================');
    console.log('\n🔵 Group 1 (Apr 14-28):');
    testEmployees.slice(0, 3).forEach(emp => {
      console.log(`  • ${emp.first_name} ${emp.last_name} (${emp.email})`);
    });
    console.log('\n🟢 Group 2 (Apr 14-28):');
    testEmployees.slice(3).forEach(emp => {
      console.log(`  • ${emp.first_name} ${emp.last_name} (${emp.email})`);
    });
    console.log('\n🔑 Password for all test users: password123');
    console.log('\n📅 Schedules populated for April 14-28, 2026:');
    console.log('  • Group 1: Mostly 7-4 shifts with rest days');
    console.log('  • Group 2: Alternating pattern with one leave request');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
