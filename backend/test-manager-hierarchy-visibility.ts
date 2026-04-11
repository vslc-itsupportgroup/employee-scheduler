import { v4 as uuidv4 } from 'uuid';
import pool from './src/config/database';
import { getManagedUserIds, isUserManagedBy } from './src/utils/hierarchy';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function createUser(
  client: any,
  options: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'employee' | 'manager' | 'admin';
    managerId?: string | null;
    department?: string;
  }
): Promise<string> {
  const id = uuidv4();
  await client.query(
    `INSERT INTO users (
      id, email, password_hash, first_name, last_name, role, department,
      manager_id, email_verified, is_active, created_at, updated_at
    ) VALUES (
      $1, $2, 'test-password-hash', $3, $4, $5, $6,
      $7, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`,
    [
      id,
      options.email,
      options.firstName,
      options.lastName,
      options.role,
      options.department || null,
      options.managerId || null,
    ]
  );
  return id;
}

async function run(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const unique = Date.now();
    const testDate = '2026-04-15';

    const shiftRow = await client.query('SELECT id, code FROM shift_types ORDER BY created_at ASC LIMIT 1');
    assert(shiftRow.rows.length > 0, 'No shift types found in database');
    const shiftTypeId = shiftRow.rows[0].id as string;

    const deptManagerId = await createUser(client, {
      email: `dept.manager.${unique}@test.local`,
      firstName: 'Dept',
      lastName: 'Manager',
      role: 'manager',
      department: 'Operations',
    });

    const sectionManagerId = await createUser(client, {
      email: `section.manager.${unique}@test.local`,
      firstName: 'Section',
      lastName: 'Manager',
      role: 'manager',
      managerId: deptManagerId,
      department: 'Operations',
    });

    const sectionEmployeeId = await createUser(client, {
      email: `section.employee.${unique}@test.local`,
      firstName: 'Section',
      lastName: 'Employee',
      role: 'employee',
      managerId: sectionManagerId,
      department: 'Operations',
    });

    const unrelatedManagerId = await createUser(client, {
      email: `unrelated.manager.${unique}@test.local`,
      firstName: 'Unrelated',
      lastName: 'Manager',
      role: 'manager',
      department: 'Finance',
    });

    const unrelatedEmployeeId = await createUser(client, {
      email: `unrelated.employee.${unique}@test.local`,
      firstName: 'Unrelated',
      lastName: 'Employee',
      role: 'employee',
      managerId: unrelatedManagerId,
      department: 'Finance',
    });

    const adminId = await createUser(client, {
      email: `admin.${unique}@test.local`,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      department: 'IT',
    });

    await client.query(
      `INSERT INTO schedules (employee_id, shift_type_id, scheduled_date, created_by, status, approved_by, approval_date)
       VALUES
        ($1, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP),
        ($5, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP),
        ($6, $2, $3, $4, 'approved', $4, CURRENT_TIMESTAMP)`,
      [sectionManagerId, shiftTypeId, testDate, adminId, sectionEmployeeId, unrelatedEmployeeId]
    );

    const managedByDeptManager = await getManagedUserIds(deptManagerId, client);
    assert(managedByDeptManager.includes(sectionManagerId), 'Department manager should include section manager in managed IDs');
    assert(managedByDeptManager.includes(sectionEmployeeId), 'Department manager should include section employee in managed IDs');
    assert(!managedByDeptManager.includes(unrelatedEmployeeId), 'Department manager should not include unrelated employee in managed IDs');

    const canManageSectionManager = await isUserManagedBy(deptManagerId, sectionManagerId, client);
    const canManageSectionEmployee = await isUserManagedBy(deptManagerId, sectionEmployeeId, client);
    const canManageUnrelatedEmployee = await isUserManagedBy(deptManagerId, unrelatedEmployeeId, client);
    assert(canManageSectionManager, 'Department manager should manage section manager');
    assert(canManageSectionEmployee, 'Department manager should manage section employee');
    assert(!canManageUnrelatedEmployee, 'Department manager should not manage unrelated employee');

    const managerCalendarRows = await client.query(
      `SELECT s.employee_id
       FROM schedules s
       WHERE s.scheduled_date = $1
         AND s.employee_id = ANY($2::uuid[])
       ORDER BY s.employee_id`,
      [testDate, managedByDeptManager]
    );

    const managerVisibleEmployeeIds = managerCalendarRows.rows.map((r: any) => r.employee_id);
    assert(managerVisibleEmployeeIds.includes(sectionManagerId), 'Calendar must include section manager schedule for department manager');
    assert(managerVisibleEmployeeIds.includes(sectionEmployeeId), 'Calendar must include section employee schedule for department manager');
    assert(!managerVisibleEmployeeIds.includes(unrelatedEmployeeId), 'Calendar must exclude unrelated employee for department manager');

    const adminCalendarRows = await client.query(
      `SELECT employee_id FROM schedules WHERE scheduled_date = $1 ORDER BY employee_id`,
      [testDate]
    );
    const adminVisibleEmployeeIds = adminCalendarRows.rows.map((r: any) => r.employee_id);
    assert(adminVisibleEmployeeIds.includes(sectionManagerId), 'Admin should see section manager schedule');
    assert(adminVisibleEmployeeIds.includes(sectionEmployeeId), 'Admin should see section employee schedule');
    assert(adminVisibleEmployeeIds.includes(unrelatedEmployeeId), 'Admin should see unrelated employee schedule');

    console.log('Hierarchy visibility test passed');
    console.log('Department manager can view section manager and section employees in calendar list');
    console.log('Admin can view all applied schedules');

    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Hierarchy visibility test failed:', error);
  process.exit(1);
});