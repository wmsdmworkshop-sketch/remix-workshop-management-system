const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkActive() {
    const railwayConfig = {
        host: 'thomas.proxy.rlwy.net',
        port: 50733,
        user: 'root',
        password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
        database: 'railway'
    };

    const gcpConfig = {
        host: '35.200.150.167',
        port: 3306,
        user: 'root',
        password: 'WmsSecureMySQL2026!',
        database: 'railway'
    };

    let connRailway, connGcp;
    try {
        console.log('Connecting to databases...');
        connRailway = await mysql.createConnection(railwayConfig);
        connGcp = await mysql.createConnection(gcpConfig);

        // Define active status filters matching server.ts & App.tsx
        // server.ts closedStatuses = ['billed', 'out of workshop', 'invoiced', 'completed']
        // App.tsx filters: !gate_out_time && !['Closed', 'Cancelled'].includes(status)
        
        // Let's count in database (job_card_master table)
        // job_status can be: 'Open', 'In Progress', 'Waiting Parts', 'Ready', 'Delivered', 'Carry Forward', 'Assigned', 'Unassigned', 'In Queue'
        // Let's get actual rows of job_card_master
        const [rRows] = await connRailway.query('SELECT job_card_no, job_status, billing_status, live_status, gate_out_time FROM job_card_master');
        const [gRows] = await connGcp.query('SELECT job_card_no, job_status, billing_status, live_status, gate_out_time FROM job_card_master');

        const getActiveCount = (rows) => {
            return rows.filter(row => {
                // Map status
                let mappedStatus = 'Waiting';
                const statusLower = String(row.job_status || '').toLowerCase();
                if (statusLower === 'in progress' || statusLower === 'assigned') {
                    mappedStatus = 'Active';
                } else if (statusLower === 'ready') {
                    mappedStatus = 'Completed';
                } else if (statusLower === 'delivered') {
                    mappedStatus = 'Invoiced';
                } else if (statusLower === 'carry forward') {
                    mappedStatus = 'Carry Forward';
                } else if (statusLower === 'rework') {
                    mappedStatus = 'Rework';
                } else if (statusLower === 'cancelled') {
                    mappedStatus = 'Cancelled';
                } else {
                    mappedStatus = 'Waiting';
                }

                const closedStatuses = ['billed', 'out of workshop', 'invoiced', 'completed'];
                if (closedStatuses.includes(mappedStatus.toLowerCase())) return false;
                if (row.gate_out_time) return false;
                return true;
            }).length;
        };

        console.log('\nActive Job Cards mapped from job_card_master table:');
        console.log('  Railway Active Count:', getActiveCount(rRows));
        console.log('  GCP Active Count:', getActiveCount(gRows));
        console.log('  Total Rows in job_card_master (Railway):', rRows.length);
        console.log('  Total Rows in job_card_master (GCP):', gRows.length);

        // Also let's check local workshop_db.json
        if (fs.existsSync('workshop_db.json')) {
            const localData = JSON.parse(fs.readFileSync('workshop_db.json', 'utf8'));
            const localJobs = localData.jobCards || [];
            const closedStatuses = ['billed', 'out of workshop', 'invoiced', 'completed'];
            const activeLocalJobs = localJobs.filter(job => {
                const s = String(job.status || '').toLowerCase();
                if (closedStatuses.includes(s)) return false;
                if (job.gate_out_time) return false;
                return true;
            });
            console.log('\nActive Job Cards in local workshop_db.json:');
            console.log('  Local Active Count:', activeLocalJobs.length);
            console.log('  Total Job Cards in JSON:', localJobs.length);
        }

    } catch (e) {
        console.error('Error during active check:', e);
    } finally {
        if (connRailway) await connRailway.end();
        if (connGcp) await connGcp.end();
    }
}

checkActive();
