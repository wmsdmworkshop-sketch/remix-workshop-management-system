/**
 * CR-001: SQL CSV Export and Snapshot Stats Generator (detailed output)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'thomas.proxy.rlwy.net',
  port: 50733,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway'
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);

  const [users] = await conn.query('SELECT * FROM users ORDER BY user_id');
  const [employees] = await conn.query('SELECT * FROM employees ORDER BY employee_id');
  let employeeMaster = [];
  try {
    const [empMaster] = await conn.query('SELECT * FROM employee_master ORDER BY employee_id');
    employeeMaster = empMaster;
  } catch (err) {}

  const stats = {};

  // --- Table: users ---
  stats.users = {
    total: users.length,
    active: users.filter(u => u.is_active === 1 || u.is_active === true).length,
    inactive: users.filter(u => u.is_active === 0 || u.is_active === false).length,
    duplicates: {
      usernames: [],
      emails: []
    }
  };

  const usernameCounts = {};
  users.forEach(u => {
    const un = (u.username || '').toLowerCase().trim();
    usernameCounts[un] = (usernameCounts[un] || 0) + 1;
  });
  stats.users.duplicates.usernames = Object.entries(usernameCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const emailCountsUsers = {};
  users.forEach(u => {
    const email = (u.email || u.username || '').toLowerCase().trim();
    if (email && email.includes('@')) {
      emailCountsUsers[email] = (emailCountsUsers[email] || 0) + 1;
    }
  });
  stats.users.duplicates.emails = Object.entries(emailCountsUsers).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  // --- Table: employees ---
  stats.employees = {
    total: employees.length,
    duplicates: {
      employee_ids: [],
      names: [],
      mobiles: [],
      emails: [],
      roles: []
    }
  };

  const empIdCounts = {};
  employees.forEach(e => {
    empIdCounts[e.employee_id] = (empIdCounts[e.employee_id] || 0) + 1;
  });
  stats.employees.duplicates.employee_ids = Object.entries(empIdCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const nameCounts = {};
  employees.forEach(e => {
    const name = (e.full_name || '').toUpperCase().trim();
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  stats.employees.duplicates.names = Object.entries(nameCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const mobileCounts = {};
  employees.forEach(e => {
    const mob = (e.mobile || '').replace(/\D/g, '').slice(-10);
    if (mob && mob.length >= 10 && mob !== '9999999999') {
      mobileCounts[mob] = (mobileCounts[mob] || 0) + 1;
    }
  });
  stats.employees.duplicates.mobiles = Object.entries(mobileCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const emailCountsEmps = {};
  employees.forEach(e => {
    const email = (e.email || '').toLowerCase().trim();
    if (email && email !== 'null' && email !== '') {
      emailCountsEmps[email] = (emailCountsEmps[email] || 0) + 1;
    }
  });
  stats.employees.duplicates.emails = Object.entries(emailCountsEmps).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const roleCounts = {};
  employees.forEach(e => {
    const role = (e.role || '').trim();
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });
  stats.employees.duplicates.roles = Object.entries(roleCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  // --- Table: employee_master ---
  stats.employee_master = {
    total: employeeMaster.length,
    duplicates: {
      employee_ids: [],
      names: [],
      mobiles: [],
      emails: []
    }
  };

  const emIdCounts = {};
  employeeMaster.forEach(em => {
    emIdCounts[em.employee_id] = (emIdCounts[em.employee_id] || 0) + 1;
  });
  stats.employee_master.duplicates.employee_ids = Object.entries(emIdCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const emNameCounts = {};
  employeeMaster.forEach(em => {
    const name = (em.full_name || '').toUpperCase().trim();
    emNameCounts[name] = (emNameCounts[name] || 0) + 1;
  });
  stats.employee_master.duplicates.names = Object.entries(emNameCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const emMobileCounts = {};
  employeeMaster.forEach(em => {
    const mob = (em.mobile || '').replace(/\D/g, '').slice(-10);
    if (mob && mob.length >= 10 && mob !== '9999999999') {
      emMobileCounts[mob] = (emMobileCounts[mob] || 0) + 1;
    }
  });
  stats.employee_master.duplicates.mobiles = Object.entries(emMobileCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  const emEmailCounts = {};
  employeeMaster.forEach(em => {
    const email = (em.email || '').toLowerCase().trim();
    if (email && email !== 'null' && email !== '') {
      emEmailCounts[email] = (emEmailCounts[email] || 0) + 1;
    }
  });
  stats.employee_master.duplicates.emails = Object.entries(emEmailCounts).filter(([k, v]) => v > 1).map(x => ({ val: x[0], count: x[1] }));

  // --- Relationship Analysis ---
  // users -> employees
  const userEmpMap = new Map();
  users.forEach(u => {
    if (u.employee_id) {
      if (!userEmpMap.has(u.employee_id)) userEmpMap.set(u.employee_id, []);
      userEmpMap.get(u.employee_id).push(u);
    }
  });

  const unmatchedUsers = users.filter(u => u.employee_id !== 0 && u.employee_id !== null && !employees.some(e => e.employee_id === u.employee_id));
  const multipleUsersPerEmp = [];
  for (const [empId, us] of userEmpMap.entries()) {
    if (us.length > 1) {
      multipleUsersPerEmp.push({ empId, us: us.map(u => u.username) });
    }
  }

  // employees -> employee_master (mapping by employee_id or full_name)
  const unmatchedEmployees = [];
  const multipleEmpMasterMappings = [];
  employees.forEach(e => {
    const matchedMaster = employeeMaster.filter(em => em.employee_id === e.employee_id || (em.full_name || '').toUpperCase().trim() === (e.full_name || '').toUpperCase().trim());
    if (matchedMaster.length === 0) {
      unmatchedEmployees.push({ employee_id: e.employee_id, full_name: e.full_name });
    } else if (matchedMaster.length > 1) {
      multipleEmpMasterMappings.push({ employee_id: e.employee_id, full_name: e.full_name, matched: matchedMaster.map(m => m.employee_id) });
    }
  });

  stats.relationships = {
    users_to_employees: {
      unmatched: unmatchedUsers.map(u => ({ user_id: u.user_id, username: u.username, employee_id: u.employee_id })),
      multiple: multipleUsersPerEmp,
      missing_mappings: users.filter(u => u.employee_id === 0 || u.employee_id === null).map(u => ({ user_id: u.user_id, username: u.username }))
    },
    employees_to_employee_master: {
      unmatched: unmatchedEmployees,
      multiple: multipleEmpMasterMappings,
      missing_mappings: [] // Not applicable here as employee_master is just lookup
    }
  };

  fs.writeFileSync('scratch/cr001_snapshot_stats.json', JSON.stringify(stats, null, 2));
  console.log('Saved detailed stats to scratch/cr001_snapshot_stats.json');

  await conn.end();
}

run().catch(console.error);
