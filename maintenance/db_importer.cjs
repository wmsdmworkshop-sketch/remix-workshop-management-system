const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const connectionConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
    database: 'railway'
};

const jobs = [
    {
        name: 'vehicle_master',
        file: 'C:/Users/arhaa/Downloads/data old/VehicleMaster_clean.csv',
        columns: [
            'chassis_no', 'booking_ref_no', 'registration_no', 'engine_no', 'product_vc',
            'product_line', 'owner_account_name', 'owner_account_site', 'tm_invoice_date',
            'original_sale_date', 'status', 'next_service_date', 'next_service_type',
            'physical_status', 'selling_dealer', 'total_loss_vehicle', 'warranty_expiry_date',
            'warranty_expiry_hours', 'warranty_expiry_km', 'contact_authorization', 'chassis_color',
            'date_of_registration', 'date_of_commissioning', 'rc_attached', 'hsn_code',
            'gst_invoice_no', 'commercial_invoice_no'
        ]
    },
    {
        name: 'service_history',
        file: 'C:/Users/arhaa/Downloads/data old/ServiceHistory_clean.csv',
        columns: [
            'sh_no', 'chassis_no', 'registration_no', 'account', 'sr_no', 'service_datetime',
            'other_service_center', 'serviced_at_other', 'job_card_open_date', 'odometer_reading',
            'sr_type', 'summary', 'survey_customer', 'revisit', 'service_request', 'contact_full_name'
        ]
    },
    {
        name: 'invoices',
        file: 'C:/Users/arhaa/Downloads/data old/Invoice_clean.csv',
        columns: [
            'sr_assigned_to', 'invoice_no', 'invoice_date', 'account', 'invoice_type',
            'invoice_format', 'invoice_status', 'final_labour_invoice_amount',
            'final_spares_invoice_amount', 'final_consolidated_amt', 'order_no', 'sr_no',
            'chassis_no', 'registration_no', 'cancellation_reason'
        ]
    }
];

function parseCSVLineRobust(line) {
    const fields = [];
    let current = "";
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (line[i + 1] === '"') {
                current += '"';
                i++; // skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            fields.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields.map(v => {
        const trimmed = v.trim();
        return trimmed === "" ? null : trimmed;
    });
}

async function runImport(connection, job) {
    console.log(`\nStarting import for ${job.name}...`);
    
    const content = fs.readFileSync(job.file, 'utf-8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    
    if (lines.length <= 1) {
        console.log(`No data rows in ${job.file}`);
        return;
    }

    console.log(`Read ${lines.length - 1} raw lines from file.`);

    const batchSize = 1000;
    let batchValues = [];

    const colNamesStr = job.columns.map(c => `\`${c}\``).join(', ');
    const insertSql = `INSERT IGNORE INTO \`${job.name}\` (${colNamesStr}) VALUES ?`;

    let insertedCount = 0;
    let ignoredCount = 0;

    for (let i = 1; i < lines.length; i++) {
        let l = lines[i].trim();
        if (l.startsWith('\ufeff')) {
            l = l.slice(1);
        }
        if (l.startsWith('"') && l.endsWith('"')) {
            l = l.slice(1, -1);
        }
        l = l.replace(/""/g, '"');

        const cells = parseCSVLineRobust(l);
        if (cells.length === 0) continue;

        // Map and clean fields
        const rowData = [];
        for (let c = 0; c < job.columns.length; c++) {
            let val = cells[c];
            if (val === "" || val === undefined || val === null) {
                val = null;
            }

            // Clean decimal fields in invoices table
            if (job.name === 'invoices' && (c === 7 || c === 8 || c === 9)) {
                if (val) {
                    val = val.replace(/[^0-9.]/g, '');
                    val = parseFloat(val) || 0.0;
                } else {
                    val = 0.0;
                }
            }
            rowData.push(val);
        }
        batchValues.push(rowData);

        if (batchValues.length >= batchSize || i === lines.length - 1) {
            try {
                const [result] = await connection.query(insertSql, [batchValues]);
                insertedCount += result.affectedRows;
                ignoredCount += (batchValues.length - result.affectedRows);
            } catch (err) {
                console.error(`Batch insert failed at line ${i}:`, err.message);
                throw err;
            }
            batchValues = [];
        }
    }
    
    console.log(`Import complete for ${job.name}. Rows inserted/affected: ${insertedCount}, Rows ignored/duplicate: ${ignoredCount}`);
}

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection(connectionConfig);
        console.log("Connected to MySQL database.");

        // Step 1: Enable local infile
        console.log("Step 1: Setting GLOBAL local_infile = 1...");
        try {
            await connection.query("SET GLOBAL local_infile = 1");
            console.log("Successfully enabled global local_infile.");
        } catch (err) {
            console.warn("Could not set SET GLOBAL local_infile = 1:", err.message);
        }

        // Steps 2-4: Import each file
        for (const job of jobs) {
            await runImport(connection, job);
        }

        // Step 5: Verification
        console.log("\n--- Verification of Database Row Counts ---");
        const verifyQuery = `
            SELECT 'vehicle_master' AS tbl, COUNT(*) AS rows FROM vehicle_master
            UNION ALL
            SELECT 'service_history' AS tbl, COUNT(*) AS rows FROM service_history
            UNION ALL
            SELECT 'invoices' AS tbl, COUNT(*) AS rows FROM invoices;
        `;
        const [rows] = await connection.query(verifyQuery);
        console.table(rows);

    } catch (err) {
        console.error("Main execution error:", err.message);
    } finally {
        if (connection) {
            await connection.end();
        }
        console.log("Disconnected.");
    }
})();
