/**
 * CR-001 STEP 0 + STEP 1: SQL Backup + Complete Data Quality Audit (FIXED)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: '35.200.150.167',
  port: 3306,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway'
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = 'scratch/cr001_backups';
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('=== CR-001 PRE-IMPLEMENTATION ===');
  console.log(`Timestamp: ${timestamp}`);

  // ================================================================
  // STEP 0: SQL BACKUPS
  // ================================================================
  console.log('\n=== STEP 0: SQL BACKUPS ===');

  const tableQueries = {
    'employees': 'SELECT * FROM employees ORDER BY employee_id',
    'users': 'SELECT * FROM users ORDER BY user_id',
    'user_access_master': 'SELECT * FROM user_access_master ORDER BY user_id',
    'employee_master': 'SELECT * FROM employee_master ORDER BY employee_id',
    'role_module_permissions': 'SELECT * FROM role_module_permissions ORDER BY id',
    'bay_master': 'SELECT * FROM bay_master ORDER BY bay_id',
  };

  const backupData = {};
  for (const [table, query] of Object.entries(tableQueries)) {
    try {
      const [rows] = await conn.query(query);
      fs.writeFileSync(`${backupDir}/${table}_backup.json`, JSON.stringify(rows, null, 2));
      backupData[table] = rows;
      console.log(`  [BACKUP] ${table}: ${rows.length} rows`);
    } catch (err) {
      console.log(`  [SKIP] ${table}: ${err.message}`);
      backupData[table] = [];
    }
  }

  // Backup cachedDB
  try {
    const dbJson = JSON.parse(fs.readFileSync('workshop_db.json', 'utf8'));
    fs.writeFileSync(`${backupDir}/cachedDB_employees_backup.json`, JSON.stringify(dbJson.employees, null, 2));
    console.log(`  [BACKUP] cachedDB.employees: ${dbJson.employees.length} rows`);
    backupData.cachedDB_employees = dbJson.employees;
  } catch (err) {
    console.log(`  [SKIP] cachedDB: ${err.message}`);
    backupData.cachedDB_employees = [];
  }

  fs.writeFileSync(`${backupDir}/backup_manifest.json`, JSON.stringify({
    timestamp,
    tables: Object.entries(backupData).map(([t, r]) => ({ table: t, rows: r.length }))
  }, null, 2));
  console.log(`\n  All backups saved to: ${backupDir}/`);

  // ================================================================
  // STEP 1: DATA QUALITY AUDIT
  // ================================================================
  console.log('\n=== STEP 1: DATA QUALITY AUDIT ===');

  const employees = backupData.employees || [];
  const users = backupData.users || [];
  const uam = backupData.user_access_master || [];
  const empMaster = backupData.employee_master || [];

  console.log(`\nTotal employees in MySQL: ${employees.length}`);
  console.log(`Total users in MySQL: ${users.length}`);
  console.log(`Total user_access_master: ${uam.length}`);
  console.log(`Total employee_master (legacy): ${empMaster.length}`);

  // 1a. Duplicate names
  console.log('\n--- 1a. DUPLICATE EMPLOYEE NAMES ---');
  const nameMap = {};
  for (const e of employees) {
    const key = (e.full_name || '').toUpperCase().trim();
    if (!nameMap[key]) nameMap[key] = [];
    nameMap[key].push(e);
  }
  const dupNames = Object.entries(nameMap).filter(([, v]) => v.length > 1);
  for (const [name, recs] of dupNames) {
    console.log(`  DUPLICATE: "${name}" (${recs.length} records)`);
    for (const r of recs) {
      console.log(`    emp_id=${r.employee_id}, code=${r.employee_code}, role=${r.role}, mobile=${r.mobile}, active=${r.is_active}`);
    }
  }
  if (dupNames.length === 0) console.log('  None found.');

  // 1b. Duplicate employee codes
  console.log('\n--- 1b. DUPLICATE EMPLOYEE CODES ---');
  const codeMap = {};
  for (const e of employees) {
    const key = (e.employee_code || '').toUpperCase().trim();
    if (key && key !== 'NULL') {
      if (!codeMap[key]) codeMap[key] = [];
      codeMap[key].push(e);
    }
  }
  const dupCodes = Object.entries(codeMap).filter(([, v]) => v.length > 1);
  for (const [code, recs] of dupCodes) {
    console.log(`  DUPLICATE CODE: "${code}" — ${recs.map(r => `${r.full_name}(id=${r.employee_id})`).join(', ')}`);
  }
  if (dupCodes.length === 0) console.log('  None found.');

  // 1c. Duplicate mobile numbers  
  console.log('\n--- 1c. DUPLICATE MOBILE NUMBERS ---');
  const mobileMap = {};
  for (const e of employees) {
    const raw = (e.mobile || '').replace(/\D/g, '');
    const key = raw.slice(-10);
    if (key.length >= 10 && key !== '9999999999') {
      if (!mobileMap[key]) mobileMap[key] = [];
      mobileMap[key].push(e);
    }
  }
  const dupMobiles = Object.entries(mobileMap).filter(([, v]) => v.length > 1);
  for (const [mobile, recs] of dupMobiles) {
    console.log(`  DUPLICATE MOBILE: ${mobile} — ${recs.map(r => `${r.full_name}(id=${r.employee_id})`).join(', ')}`);
  }
  if (dupMobiles.length === 0) console.log('  None found.');

  // 1d. Duplicate emails
  console.log('\n--- 1d. DUPLICATE EMAILS ---');
  const emailMap = {};
  for (const e of employees) {
    const key = (e.email || '').toLowerCase().trim();
    if (key && key !== 'null' && key !== '') {
      if (!emailMap[key]) emailMap[key] = [];
      emailMap[key].push(e);
    }
  }
  const dupEmails = Object.entries(emailMap).filter(([, v]) => v.length > 1);
  for (const [email, recs] of dupEmails) {
    console.log(`  DUPLICATE EMAIL: ${email} — ${recs.map(r => `${r.full_name}(id=${r.employee_id})`).join(', ')}`);
  }
  if (dupEmails.length === 0) console.log('  None found.');

  // 1e. Duplicate usernames
  console.log('\n--- 1e. DUPLICATE USERNAMES (users table) ---');
  const unMap = {};
  for (const u of users) {
    const key = (u.username || '').toLowerCase().trim();
    if (!unMap[key]) unMap[key] = [];
    unMap[key].push(u);
  }
  const dupUn = Object.entries(unMap).filter(([, v]) => v.length > 1);
  for (const [un, recs] of dupUn) {
    console.log(`  DUPLICATE: "${un}" — ${recs.map(r => `user_id=${r.user_id}, role=${r.role}`).join(', ')}`);
  }
  if (dupUn.length === 0) console.log('  None found.');

  console.log('\n--- 1e. DUPLICATE USERNAMES (user_access_master) ---');
  const uamUnMap = {};
  for (const u of uam) {
    const key = (u.username || '').toLowerCase().trim();
    if (!uamUnMap[key]) uamUnMap[key] = [];
    uamUnMap[key].push(u);
  }
  const dupUamUn = Object.entries(uamUnMap).filter(([, v]) => v.length > 1);
  for (const [un, recs] of dupUamUn) {
    console.log(`  DUPLICATE: "${un}" — ${recs.map(r => `user_id=${r.user_id}, role=${r.user_role}`).join(', ')}`);
  }
  if (dupUamUn.length === 0) console.log('  None found.');

  // 1f. Orphaned records
  console.log('\n--- 1f. ORPHANED RECORDS ---');
  const empIds = new Set(employees.map(e => e.employee_id));
  
  let orphanUsers = 0;
  for (const u of uam) {
    if (u.employee_id && !empIds.has(u.employee_id)) {
      console.log(`  ORPHAN USER: user_id=${u.user_id}, username=${u.username}, employee_id=${u.employee_id} → NOT IN employees table`);
      orphanUsers++;
    }
  }
  if (orphanUsers === 0) console.log('  No orphan users found.');

  const linkedEmpIds = new Set(uam.map(u => u.employee_id).filter(Boolean));
  const unlinkedEmps = employees.filter(e => !linkedEmpIds.has(e.employee_id));
  console.log(`\n  Employees NOT linked to any user: ${unlinkedEmps.length}`);
  for (const e of unlinkedEmps) {
    console.log(`    emp_id=${e.employee_id}, name=${e.full_name}, code=${e.employee_code}, role=${e.role}, active=${e.is_active}`);
  }

  // 1g. Role distribution
  console.log('\n--- 1g. ROLE DISTRIBUTION (employees table) ---');
  const roleDistrib = {};
  for (const e of employees) {
    const role = e.role || '(null)';
    roleDistrib[role] = (roleDistrib[role] || 0) + 1;
  }
  const sortedRoles = Object.entries(roleDistrib).sort((a, b) => b[1] - a[1]);
  for (const [role, count] of sortedRoles) {
    console.log(`  ${count}x "${role}"`);
  }

  // 1h. User ↔ Employee link map
  console.log('\n--- 1h. USER ↔ EMPLOYEE LINK MAP ---');
  console.log('  user_id | username | user_full_name | user_role | emp_id | emp_full_name | emp_role | NAME_MATCH | ROLE_MATCH');
  console.log('  ' + '-'.repeat(120));
  for (const u of uam) {
    const emp = employees.find(e => e.employee_id === u.employee_id);
    const nameMatch = emp ? ((emp.full_name || '').toUpperCase().trim() === (u.full_name || '').toUpperCase().trim()) : false;
    const roleMatch = emp ? (emp.role === u.user_role) : false;
    console.log(`  ${u.user_id} | ${u.username} | ${u.full_name} | ${u.user_role} | ${u.employee_id} | ${emp?.full_name || 'N/A'} | ${emp?.role || 'N/A'} | ${nameMatch ? 'YES' : 'NO'} | ${roleMatch ? 'YES' : 'NO'}`);
  }

  // 1i. cachedDB vs MySQL comparison
  console.log('\n--- 1i. CACHEDDB vs MYSQL ---');
  const cachedEmps = backupData.cachedDB_employees || [];
  console.log(`  MySQL employees: ${employees.length}`);
  console.log(`  cachedDB employees: ${cachedEmps.length}`);

  const mysqlIds = new Set(employees.map(e => e.employee_id));
  const cachedOnly = cachedEmps.filter(e => !mysqlIds.has(e.employee_id));
  console.log(`  In cachedDB only (not in MySQL): ${cachedOnly.length}`);
  for (const e of cachedOnly) {
    console.log(`    emp_id=${e.employee_id}, name=${e.full_name}, role=${e.role}`);
  }

  const cachedIds = new Set(cachedEmps.map(e => e.employee_id));
  const mysqlOnly = employees.filter(e => !cachedIds.has(e.employee_id));
  console.log(`  In MySQL only (not in cachedDB): ${mysqlOnly.length}`);
  for (const e of mysqlOnly) {
    console.log(`    emp_id=${e.employee_id}, name=${e.full_name}, role=${e.role}`);
  }

  // 1j. employee_master legacy table
  console.log('\n--- 1j. EMPLOYEE_MASTER (legacy table) ---');
  console.log(`  Total rows: ${empMaster.length}`);
  for (const em of empMaster) {
    console.log(`    emp_id=${em.employee_id}, name=${em.full_name}, code=${em.employee_code}, role=${em.role}, active=${em.is_active}`);
  }

  // Save structured audit data
  const auditData = {
    timestamp,
    counts: {
      employees: employees.length,
      users: users.length,
      user_access_master: uam.length,
      employee_master: empMaster.length,
      cachedDB_employees: cachedEmps.length
    },
    duplicates: {
      names: dupNames.map(([name, recs]) => ({ name, count: recs.length, records: recs.map(r => ({ employee_id: r.employee_id, employee_code: r.employee_code, role: r.role, mobile: r.mobile, is_active: r.is_active })) })),
      codes: dupCodes.map(([code, recs]) => ({ code, records: recs.map(r => ({ employee_id: r.employee_id, full_name: r.full_name })) })),
      mobiles: dupMobiles.map(([mobile, recs]) => ({ mobile, records: recs.map(r => ({ employee_id: r.employee_id, full_name: r.full_name })) })),
      emails: dupEmails.map(([email, recs]) => ({ email, records: recs.map(r => ({ employee_id: r.employee_id, full_name: r.full_name })) })),
      usernames: dupUn.map(([un, recs]) => ({ username: un, records: recs.map(r => ({ user_id: r.user_id, role: r.role })) }))
    },
    roleDistribution: Object.fromEntries(sortedRoles),
    userEmployeeLinks: uam.map(u => {
      const emp = employees.find(e => e.employee_id === u.employee_id);
      return {
        user_id: u.user_id, username: u.username, user_full_name: u.full_name, user_role: u.user_role,
        employee_id: u.employee_id, emp_full_name: emp?.full_name || null, emp_role: emp?.role || null,
        name_match: emp ? ((emp.full_name || '').toUpperCase().trim() === (u.full_name || '').toUpperCase().trim()) : false,
        role_match: emp ? (emp.role === u.user_role) : false
      };
    }),
    unlinkedEmployees: unlinkedEmps.map(e => ({ employee_id: e.employee_id, full_name: e.full_name, employee_code: e.employee_code, role: e.role, is_active: e.is_active })),
    allEmployees: employees.map(e => ({
      employee_id: e.employee_id, full_name: e.full_name, employee_code: e.employee_code,
      role: e.role, mobile: e.mobile, email: e.email, is_active: e.is_active,
      designation: e.designation, department: e.department, employee_grade: e.employee_grade
    })),
    allUsers: uam.map(u => ({
      user_id: u.user_id, username: u.username, full_name: u.full_name, user_role: u.user_role,
      employee_id: u.employee_id, is_active: u.is_active, email: u.email, mobile_no: u.mobile_no
    }))
  };

  fs.writeFileSync('scratch/cr001_audit_data.json', JSON.stringify(auditData, null, 2));
  console.log('\nAudit data saved to scratch/cr001_audit_data.json');

  await conn.end();
  console.log('\n=== AUDIT COMPLETE ===');
}

run().catch(console.error);
