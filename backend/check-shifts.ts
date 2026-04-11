import pool from './src/config/database';

const shifts = [
  { code: '7-4', name: '7am - 4pm' },
  { code: 'VL', name: 'Vacation Leave' },
  { code: 'HD', name: 'Regular Holiday' },
  { code: 'SPL', name: 'Special Non-Working Holiday' },
  { code: 'RD', name: 'Rest Day' },
  { code: 'HDD', name: 'Regular Holiday - Duty' },
  { code: 'APE', name: 'Annual Physical Exam' },
  { code: 'OB', name: 'Official Business Travel' },
  { code: 'BDL', name: 'Birthday Leave' },
];

async function checkAndInsertShifts() {
  try {
    // Check existing shifts
    const result = await pool.query('SELECT code, name FROM shift_types ORDER BY code');
    console.log('\n=== Current Shift Types ===');
    
    if (result.rows.length === 0) {
      console.log('No shifts found. Creating default shifts...\n');
      
      // Insert all shifts
      for (const shift of shifts) {
        await pool.query(
          'INSERT INTO shift_types (code, name) VALUES ($1, $2)',
          [shift.code, shift.name]
        );
        console.log(`✓ Created: ${shift.code} - ${shift.name}`);
      }
      
      console.log('\n✓ All shifts created successfully!');
    } else {
      console.log(`Found ${result.rows.length} existing shifts:\n`);
      result.rows.forEach(row => {
        console.log(`  ${row.code.padEnd(6)} - ${row.name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndInsertShifts();
