require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const csv = require('fast-csv');

const BATCH_SIZE = 1000; // Increased batch size since local network latency is near zero

// Local Connection Configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '3306')
};

function sanitizeDate(dateStr) {
    if (!dateStr || dateStr.trim() === "" || dateStr.toLowerCase() === "null") return null;
    const ddmmyyyyRegex = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
    const match = dateStr.match(ddmmyyyyRegex);
    if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

function sanitizeNum(val, isFloat = false) {
    if (val === undefined || val === null || val.trim() === "" || val.toLowerCase() === "null") return null;
    const cleanVal = val.replace(/[^0-9.-]/g, '');
    return isFloat ? parseFloat(cleanVal) : parseInt(cleanVal, 10);
}

function sanitizeText(val) {
    if (!val || val.trim() === "" || val.toLowerCase() === "null") return null;
    return val.trim();
}

function importCsvInBatches(filePath, processor) {
    return new Promise((resolve, reject) => {
        let batch = [];
        const stream = fs.createReadStream(filePath)
            .pipe(csv.parse({ headers: true, discardUnmappedColumns: true, trim: true }));

        stream.on('data', (row) => {
            batch.push(row);
            if (batch.length >= BATCH_SIZE) {
                stream.pause();
                processor(batch)
                    .then(() => {
                        batch = [];
                        stream.resume();
                    })
                    .catch(err => stream.destroy(err));
            }
        });

        stream.on('end', async () => {
            try {
                if (batch.length > 0) {
                    await processor(batch);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        stream.on('error', (err) => reject(err));
    });
}

async function runLocalMigration() {
    console.log('=== LOCAL MYSQL MIGRATION SYSTEM ===');
    const start = Date.now();
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to Local MySQL Database successfully.');

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('SET UNIQUE_CHECKS = 0');
        console.log('[1/4] Integrity checks temporarily suspended.');

        // 1. Vehicle Master Import
        console.log('[2/4] Importing dim_vehicle_master...');
        const vehiclePath = path.join(__dirname, 'vehicle_master.csv');
        await importCsvInBatches(vehiclePath, async (batch) => {
            const query = `
                INSERT INTO dim_vehicle_master 
                (chassis_no, registration_no, engine_no, product_line, owner_account_name, original_sale_date, color)
                VALUES ?
                ON DUPLICATE KEY UPDATE owner_account_name = VALUES(owner_account_name);
            `;
            const values = batch.map(row => [
                sanitizeText(row.Chassis_No),
                sanitizeText(row.Registration_No),
                sanitizeText(row.Engine_No),
                sanitizeText(row.Product_Line),
                sanitizeText(row.Owner_Account_Name),
                sanitizeDate(row.Original_Sale_Date),
                sanitizeText(row.Color)
            ]);
            await connection.query(query, [values]);
        });

        // 2. Invoices Import
        console.log('[3/4] Importing fact_invoices...');
        const invoicesPath = path.join(__dirname, 'fact_invoices.csv');
        await importCsvInBatches(invoicesPath, async (batch) => {
            const query = `
                INSERT INTO fact_invoices 
                (invoice_no, chassis_no, registration_no, invoice_date, net_amount, labour_amount, spares_amount)
                VALUES ?
                ON DUPLICATE KEY UPDATE net_amount = VALUES(net_amount);
            `;
            const values = batch.map(row => [
                sanitizeText(row.Invoice_No),
                sanitizeText(row.Chassis_No),
                sanitizeText(row.Registration_No),
                sanitizeDate(row.Invoice_Date),
                sanitizeNum(row.Net_Amount, true),
                sanitizeNum(row.Labour_Amount, true),
                sanitizeNum(row.Spares_Amount, true)
            ]);
            await connection.query(query, [values]);
        });

        // 3. Service History Import
        console.log('[4/4] Importing fact_service_history...');
        const servicePath = path.join(__dirname, 'fact_service_history.csv');
        await importCsvInBatches(servicePath, async (batch) => {
            const query = `
                INSERT INTO fact_service_history 
                (job_card_no, chassis_no, registration_no, job_card_open_date, job_card_close_date, odometer_reading, sr_no)
                VALUES ?
                ON DUPLICATE KEY UPDATE odometer_reading = VALUES(odometer_reading);
            `;
            const values = batch.map(row => [
                sanitizeText(row.Job_Card_No),
                sanitizeText(row.Chassis_No),
                sanitizeText(row.Registration_No),
                sanitizeDate(row.Job_Card_Open_Date),
                sanitizeDate(row.Job_Card_Close_Date),
                sanitizeNum(row.Odometer_Reading, false),
                sanitizeText(row.SR_No)
            ]);
            await connection.query(query, [values]);
        });

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.query('SET UNIQUE_CHECKS = 1');
        console.log(`\n[SUCCESS] Migration finished cleanly in ${((Date.now() - start) / 1000).toFixed(2)}s.`);

    } catch (error) {
        console.error('\n[FATAL ERROR] Migration aborted:');
        console.error(error.message);
    } finally {
        if (connection) await connection.end();
    }
}

runLocalMigration();
