const mysql = require('mysql2/promise');

const BASE = 'http://localhost:3001';
const DB_CONFIG = {
  host: '35.200.150.167',
  port: 3306,
  user: 'root',
  password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
  database: 'railway',
  connectionLimit: 2,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

const pool = mysql.createPool(DB_CONFIG);

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function queryDB(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function run() {
  console.log('=== STARTING LIVE UAT EXECUTION (V3 - POOL) ===');

  // Login
  console.log('Logging in as admin...');
  const loginRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('Login successful.');

  const results = [];
  let jobId = null;
  let jobCardNo = null;

  const steps = [
    {
      name: 'Gate Entry',
      execute: async () => {
        const body = {
          vrn: 'KA51MC1234',
          customer_name: 'John Doe',
          customer_mobile: '9876543210',
          vehicle_make: 'Toyota',
          vehicle_model: 'Corolla',
          vehicle_year: 2020,
          km_reading: 25000,
          sr_type_id: 2, // Periodic Maintenance
          job_description: 'Periodic maintenance service, check front brakes',
          priority: 'Medium',
          etd: new Date(Date.now() + 4 * 3600000).toISOString(), // +4 hours
          created_by: 14 // admin employee id
        };
        const res = await api('POST', '/api/job-cards', body, token);
        if (res.ok) {
          jobId = res.data.job_id;
          jobCardNo = res.data.job_card_no;
        }
        return res;
      },
      dbCheck: async () => {
        if (!jobId) return { job_card: [], history: [] };
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const history = await queryDB('SELECT * FROM tbl_workflow_history WHERE job_id = ? ORDER BY sequence_number', [jobId]);
        return { job, history };
      }
    },
    {
      name: 'Job Card Creation',
      execute: async () => {
        const body = {
          job_description: 'Periodic maintenance service, replace front brake pads',
          remarks: 'Customer reported squeaking noise from front wheels.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Inspection',
      execute: async () => {
        const body = {
          remarks: 'Inspection: 5-point safety checklist completed. Front pads worn out, rear pads okay. All fluids topped up.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Estimate',
      execute: async () => {
        const body = {
          parts_price: 3500,
          labor_price: 1500,
          parts_status: 'Pending Estimate'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Customer Approval',
      execute: async () => {
        const body = {
          status: 'Approved',
          approved_by: 'John Doe',
          notes: 'Customer approved spares & labor quotes.'
        };
        return await api('POST', `/api/job-cards/${jobId}/estimate-approval`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const history = await queryDB('SELECT * FROM tbl_workflow_history WHERE job_id = ? ORDER BY sequence_number', [jobId]);
        return { job, history };
      }
    },
    {
      name: 'Bay Allocation',
      execute: async () => {
        const body = {
          bay_id: 3,
          bay_no: 'Bay 3 - General'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const bay = await queryDB('SELECT * FROM bays WHERE bay_id = 3');
        return { job, bay };
      }
    },
    {
      name: 'Technician Assignment',
      execute: async () => {
        const body = {
          technicians: [
            { employee_id: 3, role: 'Lead Technician' } // Altaf Hussain
          ]
        };
        return await api('POST', `/api/job-cards/${jobId}/assign`, body, token);
      },
      dbCheck: async () => {
        const maps = await queryDB('SELECT * FROM job_technician_maps WHERE job_id = ?', [jobId]);
        return { maps };
      }
    },
    {
      name: 'Estimate Split Calculation',
      execute: async () => {
        const body = {
          parts_amount: 3500,
          labour_amount: 1500,
          split_id: 1 // Single Tech
        };
        return await api('POST', `/api/job-cards/${jobId}/revenue`, body, token);
      },
      dbCheck: async () => {
        const revs = await queryDB('SELECT * FROM job_revenues WHERE job_id = ?', [jobId]);
        const splits = await queryDB('SELECT * FROM job_revenue_split_details WHERE revenue_id IN (SELECT revenue_id FROM job_revenues WHERE job_id = ?)', [jobId]);
        return { revenues: revs, splits };
      }
    },
    {
      name: 'Labour Start',
      execute: async () => {
        const body = {
          started_by: 'Altaf Hussain'
        };
        return await api('POST', `/api/job-cards/${jobId}/start-repair`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const bay = await queryDB('SELECT * FROM bays WHERE bay_id = 3');
        const history = await queryDB('SELECT * FROM tbl_workflow_history WHERE job_id = ? ORDER BY sequence_number', [jobId]);
        return { job, bay, history };
      }
    },
    {
      name: 'Parts Allocation - Pending',
      execute: async () => {
        const body = {
          status: 'WIP_Spares_Pending',
          parts_status: 'Requested'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Parts Allocation - Issued',
      execute: async () => {
        const body = {
          status: 'Active',
          parts_status: 'Issued',
          remarks: 'Parts issued: Front Brake Pads Toyota Corolla. Job resumed in WIP.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Repair Complete',
      execute: async () => {
        const body = {
          status: 'Completed',
          progress_pct: 100,
          remarks: 'Brake pads replaced, calipers lubricated, road test prep done.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const bay = await queryDB('SELECT * FROM bays WHERE bay_id = 3');
        return { job, bay };
      }
    },
    {
      name: 'QC',
      execute: async () => {
        const body = {
          qc_status: 'passed',
          checked_by: 'QC Inspector',
          checklist: [
            { item: 'Front brakes replacement test', status: 'Pass' },
            { item: 'Brake fluid level check', status: 'Pass' },
            { item: 'Road test drive', status: 'Pass' },
            { item: 'Interior cleanup check', status: 'Pass' }
          ]
        };
        return await api('POST', `/api/job-cards/${jobId}/qc-check`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const history = await queryDB('SELECT * FROM tbl_workflow_history WHERE job_id = ? ORDER BY sequence_number', [jobId]);
        const alerts = await queryDB('SELECT * FROM alert_logs WHERE entity_id = ?', [jobId]);
        return { job, history, alerts };
      }
    },
    {
      name: 'Manager Approval',
      execute: async () => {
        const body = {
          approved_by: 'Service Manager',
          notes: 'QC passed and checklist verified. Ready for billing.'
        };
        return await api('POST', `/api/job-cards/${jobId}/manager-approve`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const alerts = await queryDB('SELECT * FROM alert_logs WHERE entity_id = ?', [jobId]);
        return { job, alerts };
      }
    },
    {
      name: 'Billing',
      execute: async () => {
        const body = {
          invoice_no: 'IDEVAN2026100001'
        };
        return await api('POST', `/api/job-cards/${jobId}/bill`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        const history = await queryDB('SELECT * FROM tbl_workflow_history WHERE job_id = ? ORDER BY sequence_number', [jobId]);
        const alerts = await queryDB('SELECT * FROM alert_logs WHERE entity_id = ?', [jobId]);
        return { job, history, alerts };
      }
    },
    {
      name: 'Cashier Settlement - Pre-Invoice',
      execute: async () => {
        const body = {
          sent_to: 'John Doe',
          sent_via: 'SMS',
          invoice_no: 'IDEVAN2026100001'
        };
        return await api('POST', `/api/job-cards/${jobId}/pre-invoice`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Cashier Settlement - Payment Update',
      execute: async () => {
        const body = {
          status: 'Invoiced',
          payment_method: 'Cash',
          payment_reference: 'TXN-987654',
          remarks: 'Bill paid in full. Cashier cleared.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Gate Pass',
      execute: async () => {
        const body = {
          remarks: 'Gate Pass issued. Security cleared exit.'
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    },
    {
      name: 'Vehicle Exit',
      execute: async () => {
        const body = {
          status: 'Invoiced',
          remarks: 'Vehicle cleared Gate-Out. Security guard marked gate out.',
          gate_out_time: new Date().toISOString()
        };
        return await api('PUT', `/api/job-cards/${jobId}`, body, token);
      },
      dbCheck: async () => {
        const job = await queryDB('SELECT * FROM job_card_master WHERE job_card_id = ?', [jobId]);
        return { job };
      }
    }
  ];

  for (let idx = 0; idx < steps.length; idx++) {
    const step = steps[idx];
    console.log(`\n--- STEP ${idx + 1}: ${step.name} ---`);
    
    // Capture DB State Before
    const dbBefore = await step.dbCheck();
    const timestampBefore = new Date().toISOString();

    // Execute API Call
    const apiRes = await step.execute();
    const timestampAfter = new Date().toISOString();

    // Wait a brief moment for async db sync if any
    await new Promise(r => setTimeout(r, 500));

    // Capture DB State After
    const dbAfter = await step.dbCheck();

    const stepResult = {
      stepIndex: idx + 1,
      stepName: step.name,
      timestampBefore,
      timestampAfter,
      apiCall: {
        method: apiRes.ok ? 'SUCCESS' : 'FAILED',
        status: apiRes.status,
        data: apiRes.data
      },
      dbBefore,
      dbAfter
    };

    results.push(stepResult);

    if (!apiRes.ok) {
      console.error(`Step ${step.name} FAILED! Status: ${apiRes.status}`);
      console.error('Response:', apiRes.data);
      console.error('Halting execution.');
      
      // Save failure results so we have evidence
      require('fs').writeFileSync('scratch/uat_raw_results.json', JSON.stringify({ success: false, failedStep: step.name, results }, null, 2));
      await pool.end();
      process.exit(1);
    }
    
    console.log(`Step ${step.name} completed successfully.`);
  }

  console.log('\n=== ALL UAT STEPS COMPLETED SUCCESSFULY ===');
  require('fs').writeFileSync('scratch/uat_raw_results.json', JSON.stringify({ success: true, results }, null, 2));
  
  await pool.end();
  console.log('Database connection pool ended.');
}

run().catch(e => {
  console.error('Run failed with error:', e);
  process.exit(1);
});
