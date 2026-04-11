import pool from './src/config/database';

const shifts = [
  { code: '7-4', name: '7am - 4pm' },
  { code: 'HD', name: 'Regular Holiday' },
  { code: 'VL', name: 'Vacation Leave' },
  { code: 'SPL', name: 'Special Non-Working Holiday' },
  { code: 'RD', name: 'Rest Day' },
  { code: 'HDD', name: 'Regular Holiday - Duty' },
  { code: 'APE', name: 'Annual Physical Exam' },
  { code: 'OB', name: 'Official Business Travel' },
  { code: 'BDL', name: 'Birthday Leave' },
];

async function syncShifts() {
  try {
    console.log('\n=== Sync Shift Types ===\n');
    
    // Check existing shifts
    const existingResult = await pool.query('SELECT code, name FROM shift_types ORDER BY code');
    const existingMap = new Map(existingResult.rows.map(r => [r.code, r.name]));
    
    let updated = 0;
    let created = 0;

    for (const shift of shifts) {
      if (existingMap.has(shift.code)) {
        const currentName = existingMap.get(shift.code);
        if (currentName !== shift.name) {
          await pool.query(
            'UPDATE shift_types SET name = $1 WHERE code = $2',
            [shift.name, shift.code]
          );
          console.log(`✓ Updated: ${shift.code} - "${currentName}" → "${shift.name}"`);
          updated++;
        } else {
          console.log(`✓ Exists:  ${shift.code} - ${shift.name}`);
        }
      } else {
        await pool.query(
          'INSERT INTO shift_types (code, name) VALUES ($1, $2)',
          [shift.code, shift.name]
        );
        console.log(`✓ Created: ${shift.code} - ${shift.name}`);
        created++;
      }
    }
    
    console.log(`\n✓ Summary: ${created} created, ${updated} updated`);
    console.log('\n=== Final Shift Types ===\n');
    
    const finalResult = await pool.query('SELECT code, name FROM shift_types ORDER BY code');
    finalResult.rows.forEach(row => {
      console.log(`  ${row.code.padEnd(6)} - ${row.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncShifts();
