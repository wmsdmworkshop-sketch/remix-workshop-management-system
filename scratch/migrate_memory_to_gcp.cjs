const mysql = require('mysql2/promise');
const http = require('https');
const fs = require('fs');

const RAILWAY_API_URL = 'https://wms-workshop-app-production.up.railway.app/api/job-cards?include_closed=true';

const railwayDbConfig = {
    host: 'thomas.proxy.rlwy.net',
    port: 50733,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
};

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway'
};

// Helper to fetch JSON from API
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Helper to upsert rows into a target database connection
async function upsertRows(db, tableName, rows, primaryKey) {
    if (!rows || rows.length === 0) return;
    console.log(`  Writing ${rows.length} rows to \`${tableName}\`...`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (row) => {
            const sanitizedRow = {};
            for (const key of Object.keys(row)) {
                let val = row[key];
                if (typeof val === 'boolean') {
                    val = val ? 1 : 0;
                }
                sanitizedRow[key] = val;
            }

            const keys = Object.keys(sanitizedRow);
            const placeholders = keys.map(() => '?').join(', ');
            const updateClauses = keys
                .filter((k) => k !== primaryKey)
                .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
                .join(', ');

            const sql = `
                INSERT INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(', ')})
                VALUES (${placeholders})
                ON DUPLICATE KEY UPDATE ${updateClauses || `\`${primaryKey}\` = \`${primaryKey}\``}
            `;

            const values = keys.map((k) => sanitizedRow[k]);
            await db.execute(sql, values);
        }));
    }
}

// Helper to map date to MySQL format
function safeMysqlDatetime(dateVal) {
    if (!dateVal) return null;
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 19).replace('T', ' ');
    } catch {
        return null;
    }
}

// Map frontend status to database status
function mapStatusToJobStatus(status) {
    const statusLower = String(status || '').toLowerCase();
    if (statusLower === 'waiting') return 'Unassigned';
    if (statusLower === 'active') return 'In Progress';
    if (statusLower === 'completed') return 'Ready';
    if (statusLower === 'invoiced') return 'Delivered';
    if (statusLower === 'carry forward') return 'Carry Forward';
    if (statusLower === 'rework') return 'In Progress';
    if (statusLower === 'cancelled') return 'Unassigned';
    return 'Unassigned';
}

// Map service type to string
function mapSrType(srTypeId) {
    if (srTypeId === 4) return 'Quick Service';
    if (srTypeId === 3) return 'Electrical';
    if (srTypeId === 2) return '2 Service';
    return 'General Repair';
}

// Save job cards to master table
async function saveJobCardsToMaster(db, jobCards) {
    if (!jobCards || jobCards.length === 0) return;
    console.log(`  Mapping and saving ${jobCards.length} job cards to \`job_card_master\`...`);
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < jobCards.length; i += BATCH_SIZE) {
        const batch = jobCards.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (row) => {
            const masterRow = {
                job_card_id: row.job_id,
                job_card_no: row.job_card_no,
                bay_id: row.bay_id || 1,
                vehicle_reg: (row.vrn || '').substring(0, 10),
                vin: row.vin ? row.vin.substring(0, 50) : null,
                customer_name: (row.customer_name || 'Walk-in Customer').substring(0, 100),
                driver_mobile: (row.customer_mobile || '0000000000').substring(0, 15),
                service_type: mapSrType(row.sr_type_id),
                job_status: mapStatusToJobStatus(row.status),
                assigned_to: row.created_by || 22,
                etd: safeMysqlDatetime(row.etd) || safeMysqlDatetime(new Date()),
                actual_delivery: safeMysqlDatetime(row.completed_at),
                created_by: row.created_by || 22,
                live_status: row.workshop_stage || 'Waiting',
                billing_status: row.status === 'Invoiced' ? 'Paid' : 'Pending',
                estimated_amount: Number(row.labor_price || 0) + Number(row.parts_price || 0),
                last_service_date: row.last_service_date || row.completed_at || row.created_at || null,
                odometer_reading: row.odometer_reading || row.km_reading || null,
                chassis_no: row.chassis_number || row.vin || null,
                gate_out_time: safeMysqlDatetime(row.gate_out_time)
            };

            const keys = Object.keys(masterRow);
            const placeholders = keys.map(() => '?').join(', ');
            const updateClauses = keys
                .filter((k) => k !== 'job_card_id')
                .map((k) => `\`${k}\` = VALUES(\`${k}\`)`)
                .join(', ');

            const sql = `
                INSERT INTO \`job_card_master\` (${keys.map(k => `\`${k}\``).join(', ')})
                VALUES (${placeholders})
                ON DUPLICATE KEY UPDATE ${updateClauses}
            `;

            const values = keys.map((k) => masterRow[k]);
            await db.execute(sql, values);
        }));
    }
}

async function run() {
    let connRailway, connGcp;
    try {
        console.log('Step 1: Fetching active memory state from Railway App API...');
        const apiData = await fetchJson(RAILWAY_API_URL);
        const jobCards = apiData.jobCards || [];
        const jobTechnicianMaps = apiData.technicianMaps || [];
        console.log(`Fetched ${jobCards.length} job cards and ${jobTechnicianMaps.length} technician assignments from API!`);

        console.log('\nStep 2: Connecting to Railway database to pull table records...');
        connRailway = await mysql.createConnection(railwayDbConfig);
        
        const [employees] = await connRailway.query('SELECT * FROM employees');
        const [bays] = await connRailway.query('SELECT * FROM bays');
        const [srTypes] = await connRailway.query('SELECT * FROM sr_types');
        const [revenueSplits] = await connRailway.query('SELECT * FROM revenue_splits');
        const [alertConfigs] = await connRailway.query('SELECT * FROM alert_configs');
        const [jobRevenues] = await connRailway.query('SELECT * FROM job_revenues');
        const [jobRevenueSplitDetails] = await connRailway.query('SELECT * FROM job_revenue_split_details');
        const [carryForwardLogs] = await connRailway.query('SELECT * FROM carry_forward_logs');
        const [reworkLogs] = await connRailway.query('SELECT * FROM rework_logs');
        const [alertLogs] = await connRailway.query('SELECT * FROM alert_logs');
        const [dmsImportBatches] = await connRailway.query('SELECT * FROM dms_import_batches');
        const [dmsImportRows] = await connRailway.query('SELECT * FROM dms_import_rows');
        const [users] = await connRailway.query('SELECT * FROM users');
        const [userAccessMaster] = await connRailway.query('SELECT * FROM user_access_master');
        const [soldVehicles] = await connRailway.query('SELECT * FROM sold_vehicles');
        const [technicianKpiDaily] = await connRailway.query('SELECT * FROM technician_kpi_daily');
        const [reworkTracking] = await connRailway.query('SELECT * FROM rework_tracking');
        const [rolePermissions] = await connRailway.query('SELECT * FROM role_permissions');
        const [roles] = await connRailway.query('SELECT * FROM roles');

        console.log('Railway database records successfully loaded!');

        console.log('\nStep 3: Compiling cachedDB JSON...');
        const cachedDB = {
            employees,
            bays,
            srTypes,
            revenueSplits,
            alertConfigs,
            jobCards,
            jobTechnicianMaps,
            jobRevenues,
            jobRevenueSplitDetails,
            carryForwardLogs,
            reworkLogs,
            alertLogs,
            dmsImportBatches,
            dmsImportRows,
            users,
            userAccessMaster,
            soldVehicles,
            technicianKpiDaily,
            reworkTracking,
            rolePermissions,
            roles
        };

        console.log('\nStep 4: Writing updated database snapshot to local workshop_db.json...');
        fs.writeFileSync('workshop_db.json', JSON.stringify(cachedDB, null, 2), 'utf8');
        console.log('Local workshop_db.json updated!');

        console.log('\nStep 5: Connecting to GCP Cloud SQL database via pool...');
        connGcp = mysql.createPool({ ...gcpDbConfig, connectionLimit: 50 });
        console.log('Connected to GCP pool!');

        console.log('\nStep 6: Clearing target database tables on GCP to prevent key/integrity conflicts...');
        await connGcp.execute('DELETE FROM job_revenue_split_details');
        await connGcp.execute('DELETE FROM job_revenues');
        await connGcp.execute('DELETE FROM job_technician_maps');
        await connGcp.execute('DELETE FROM carry_forward_logs');
        await connGcp.execute('DELETE FROM rework_logs');
        await connGcp.execute('DELETE FROM alert_logs');
        await connGcp.execute('DELETE FROM job_card_master');
        await connGcp.execute('DELETE FROM dms_import_rows');
        await connGcp.execute('DELETE FROM dms_import_batches');
        await connGcp.execute('DELETE FROM user_access_master');
        await connGcp.execute('DELETE FROM users');
        await connGcp.execute('DELETE FROM employees');
        await connGcp.execute('DELETE FROM bays');
        await connGcp.execute('DELETE FROM sold_vehicles');
        await connGcp.execute('DELETE FROM technician_kpi_daily');
        await connGcp.execute('DELETE FROM rework_tracking');
        await connGcp.execute('DELETE FROM role_permissions');
        await connGcp.execute('DELETE FROM roles');
        console.log('GCP database clean completed.');

        console.log('\nStep 7: Writing data to GCP Cloud SQL database...');
        await upsertRows(connGcp, 'employees', employees, 'employee_id');
        await upsertRows(connGcp, 'bays', bays, 'bay_id');
        await upsertRows(connGcp, 'sr_types', srTypes, 'sr_type_id');
        await upsertRows(connGcp, 'revenue_splits', revenueSplits, 'split_id');
        await upsertRows(connGcp, 'alert_configs', alertConfigs, 'alert_config_id');
        
        // Write the complete 6506 job cards to job_card_master
        await saveJobCardsToMaster(connGcp, jobCards);

        await upsertRows(connGcp, 'job_technician_maps', jobTechnicianMaps, 'map_id');
        await upsertRows(connGcp, 'job_revenues', jobRevenues, 'revenue_id');
        await upsertRows(connGcp, 'job_revenue_split_details', jobRevenueSplitDetails, 'detail_id');
        await upsertRows(connGcp, 'carry_forward_logs', carryForwardLogs, 'cf_id');
        await upsertRows(connGcp, 'rework_logs', reworkLogs, 'rework_id');
        await upsertRows(connGcp, 'alert_logs', alertLogs, 'alert_id');
        await upsertRows(connGcp, 'dms_import_batches', dmsImportBatches, 'batch_id');
        await upsertRows(connGcp, 'dms_import_rows', dmsImportRows, 'row_id');
        await upsertRows(connGcp, 'users', users, 'user_id');
        await upsertRows(connGcp, 'user_access_master', userAccessMaster, 'user_id');
        await upsertRows(connGcp, 'sold_vehicles', soldVehicles, 'vehicle_id');
        await upsertRows(connGcp, 'technician_kpi_daily', technicianKpiDaily, 'employee_id');
        await upsertRows(connGcp, 'rework_tracking', reworkTracking, 'original_job_id');
        await upsertRows(connGcp, 'role_permissions', rolePermissions, 'permission_id');
        await upsertRows(connGcp, 'roles', roles, 'role_id');

        console.log('\n✅ MIGRATION & RECOVERY PROCESS COMPLETED SUCCESSFULLY!');
        
        // Count active on GCP
        const [[{ cnt: gcpActive }]] = await connGcp.query("SELECT COUNT(*) as cnt FROM job_card_master WHERE job_status IN ('Unassigned', 'In Progress', 'Carry Forward') AND (gate_out_time IS NULL OR gate_out_time = '')");
        console.log(`GCP Active Job Cards Count: ${gcpActive}`);

    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        if (connRailway) await connRailway.end();
        if (connGcp) await connGcp.end();
    }
}

run();
