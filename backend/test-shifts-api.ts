async function testShiftsAPI() {
  const baseURL = 'http://localhost:5000/api';

  try {
    console.log('\n=== Testing Shifts API ===\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    const email = `testuser${Date.now()}@test.com`;
    const registerResponse = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'TestPassword123!',
        first_name: 'Test',
        last_name: 'User'
      })
    });
    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      throw new Error(`Register failed: ${JSON.stringify(registerData)}`);
    }
    console.log('✓ User registered');

    // 2. Login
    console.log('\n2. Logging in...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'TestPassword123!'
      })
    });
    const loginData = await loginResponse.json() as any;
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.token;
    console.log('✓ Logged in, token:', token.substring(0, 20) + '...');

    // 3. Get shifts with token
    console.log('\n3. Fetching shifts with authentication...');
    const shiftsResponse = await fetch(`${baseURL}/shifts`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const shiftsData = await shiftsResponse.json() as any;
    if (!shiftsResponse.ok) {
      throw new Error(`Shifts API failed: ${JSON.stringify(shiftsData)}`);
    }
    console.log('✓ Shifts fetched successfully');
    console.log(`✓ Total shifts: ${shiftsData.length}`);
    console.log('\nShifts:');
    shiftsData.forEach((shift: any) => {
      console.log(`  - ${(shift.code || 'N/A').padEnd(6)} ${shift.name || 'N/A'}`);
    });

  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testShiftsAPI();
