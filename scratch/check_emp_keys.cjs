/**
 * Check keys in /api/employees response
 */

const BASE = 'http://localhost:3001';

async function run() {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@DWIP2026' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const empRes = await fetch(`${BASE}/api/employees`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const emps = await empRes.json();
  console.log(`Total employees: ${emps.length}`);
  if (emps.length > 0) {
    console.log('Sample employee keys:', Object.keys(emps[0]));
    console.log('Sample employee record:', emps[0]);
    
    // Let's search for Mustafa and Shashikumar
    const mustafas = emps.filter(e => String(e.full_name).toUpperCase().includes('MUSTAFA'));
    console.log('Mustafas:', mustafas);
    const shashis = emps.filter(e => String(e.full_name).toUpperCase().includes('SHASHI'));
    console.log('Shashis:', shashis);
  }
}

run().catch(console.error);
