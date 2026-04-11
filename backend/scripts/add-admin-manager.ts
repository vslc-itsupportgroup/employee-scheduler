import pool from '../src/config/database';
import bcrypt from 'bcryptjs';

async function addAdminManager() {
  try {
    console.log('👤 Adding admin and manager users...');

    const adminUser = {
      email: 'admin@test.com',
      password: 'Admin123!@#',
      first_name: 'System',
      last_name: 'Admin',
      role: 'admin',
      department: 'Administration'
    };

    const managerUsers = [
      {
        email: 'manager1@test.com',
        password: 'Manager123!@#',
        first_name: 'James',
        last_name: 'Manager',
        role: 'manager',
        department: 'Group 1'
      },
      {
        email: 'manager2@test.com',
        password: 'Manager123!@#',
        first_name: 'Sarah',
        last_name: 'Supervisor',
        role: 'manager',
        department: 'Group 2'
      }
    ];

    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 10);
    
    // Add admin user
    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, department, email_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true, true)
         RETURNING id, email`,
        [adminUser.email, hashedAdminPassword, adminUser.first_name, adminUser.last_name, adminUser.role, adminUser.department]
      );
      console.log(`✓ Added admin user: ${result.rows[0].email}`);
    } catch (error: any) {
      if (error.message.includes('unique')) {
        console.log(`ℹ Admin user already exists: ${adminUser.email}`);
      } else {
        throw error;
      }
    }

    // Add manager users
    for (const manager of managerUsers) {
      const hashedPassword = await bcrypt.hash(manager.password, 10);
      try {
        const result = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, department, email_verified, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true, true)
           RETURNING id, email`,
          [manager.email, hashedPassword, manager.first_name, manager.last_name, manager.role, manager.department]
        );
        console.log(`✓ Added manager user: ${result.rows[0].email}`);
      } catch (error: any) {
        if (error.message.includes('unique')) {
          console.log(`ℹ Manager user already exists: ${manager.email}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ Admin and manager users added successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('===================');
    console.log(`Admin: ${adminUser.email} / ${adminUser.password}`);
    managerUsers.forEach(m => {
      console.log(`Manager: ${m.email} / ${m.password}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to add users:', error);
    process.exit(1);
  }
}

addAdminManager();
