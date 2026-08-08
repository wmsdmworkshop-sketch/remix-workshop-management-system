const jwt = require('jsonwebtoken');

async function runTests() {
  const APP_URL = 'https://wms-workshop-app-473233046183.asia-south1.run.app';
  console.log('--- STARTING LIVE VALIDATIONS ---');

  // 1. Manually Mint Admin Token
  const token = jwt.sign(
    { user_id: 999, username: 'admin', role: 'developer' },
    '9e5bac327729bd51d51a536a312ee3e22158c22a8284e327d255639483b1dc1d5a107b4793ec30e7253bac19433f0407',
    { expiresIn: '12h' }
  );
  console.log('Admin token minted successfully.');

  // 2. Fetch Users
  const usersRes = await fetch(APP_URL + '/api/users', { headers: { 'Authorization': 'Bearer ' + token }});
  const users = await usersRes.json();
  
  if (users.error) {
    console.error('Failed to fetch users:', users);
    return;
  }

  const testUser = users.find(u => u.full_name && u.full_name.toLowerCase().includes('abdul gani'));
  if (!testUser) throw new Error('Test user not found');
  console.log('Target User for tests:', testUser.username, '(ID:', testUser.user_id, '), Current Role:', testUser.role);

  // VALIDATION 2: NEGATIVE TEST
  console.log('\n--- VALIDATION 2: NEGATIVE TEST ---');
  const reqJson = {
    full_name: 'Invalid Test',
    role: 'Service Advisor',
    employee_id: "BAD_DATA", // Force an invalid type
    is_active: 1
  };
  console.log('Sending Invalid PUT Request:', JSON.stringify(reqJson));
  const badRes = await fetch(APP_URL + '/api/users/' + testUser.user_id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(reqJson)
  });
  const badStatus = badRes.status;
  const badData = await badRes.json();
  console.log('Response Status:', badStatus);
  console.log('Response Body:', badData);
  
  // Verify Cache didn't update
  const usersRes2 = await fetch(APP_URL + '/api/users', { headers: { 'Authorization': 'Bearer ' + token }});
  const users2 = await usersRes2.json();
  const testUserAfterBad = users2.find(u => u.user_id === testUser.user_id);
  console.log('Role after bad request:', testUserAfterBad.role, '(Unchanged?', testUserAfterBad.role === testUser.role, ')');

  // VALIDATION 1: ROLE CHANGE & VALIDATION 4: PASSWORD RESET
  console.log('\n--- VALIDATION 1 & 4: POSITIVE ROLE CHANGE AND PASSWORD RESET ---');
  const updateReq = {
    full_name: testUser.full_name,
    role: 'Breakdown Assistant',
    employee_id: null, // Should fall back to 0
    password: 'abdul_new_password',
    is_active: 1
  };
  console.log('Sending Valid PUT Request:', JSON.stringify(updateReq));
  const updateRes = await fetch(APP_URL + '/api/users/' + testUser.user_id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(updateReq)
  });
  const updateStatus = updateRes.status;
  const updateData = await updateRes.json();
  console.log('Response Status:', updateStatus);
  console.log('Response Body:', updateData);

  // Verify Update
  const usersRes3 = await fetch(APP_URL + '/api/users', { headers: { 'Authorization': 'Bearer ' + token }});
  const users3 = await usersRes3.json();
  const testUserAfterGood = users3.find(u => u.user_id === testUser.user_id);
  console.log('Role after good request:', testUserAfterGood.role);

  // Login as updated user (Validation 1 part 2 & Validation 4)
  console.log('\n--- VALIDATING LOGIN WITH NEW ROLE AND PASSWORD ---');
  const userLoginRes = await fetch(APP_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser.username, password: 'abdul_new_password' })
  });
  const userLoginData = await userLoginRes.json();
  console.log('User Login Status:', userLoginRes.status);
  console.log('User Login Role in Token:', userLoginData.user?.role);

  // VALIDATION 3: CREATE USER
  console.log('\n--- VALIDATION 3: CREATE USER ---');
  const newUsername = 'test_create_' + Date.now();
  const createReq = {
    full_name: 'Test Create User',
    username: newUsername,
    password: 'password123',
    role: 'Technician',
    employee_id: null
  };
  console.log('Sending POST Request:', JSON.stringify(createReq));
  const createRes = await fetch(APP_URL + '/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(createReq)
  });
  const createData = await createRes.json();
  console.log('Create Response Status:', createRes.status);
  console.log('Create Response Body:', createData);
  
  // Verify Create
  const newLoginRes = await fetch(APP_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: newUsername, password: 'password123' })
  });
  const newLoginData = await newLoginRes.json();
  console.log('New User Login Role:', newLoginData.user?.role);
}
runTests().catch(console.error);
