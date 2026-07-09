const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const gcpDbConfig = {
    host: '35.200.150.167',
    port: 3306,
    user: 'root',
    password: 'WmsSecureMySQL2026!',
    database: 'railway',
    connectTimeout: 30000,
};

// ─── CSV Parsing ───────────────────────────────────────────────────
// The CSVs use a non-standard quoting where the entire line is one quoted field.
// Invoice.CSV:  "col1,col2,...,""Rs.1,234.00"",...,colN"\t
// ServiceHistory.CSV: "col1,col2,...,""58,873"",...,colN"\t\t\t
// vehicle_history.csv: standard CSV with mixed columns

function parseQuotedCsvLine(line) {
    // Remove trailing tabs and whitespace
    line = line.replace(/\t+$/, '').trim();
    
    // If the entire line is wrapped in outer quotes, unwrap
    if (line.startsWith('"') && line.endsWith('"')) {
        line = line.slice(1, -1);
    }
    
    // Now parse CSV with embedded double-quotes ("" = escaped quote)
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];
        
        if (ch === '"' && next === '"') {
            // Escaped quote — toggle into quoted mode or add literal quote
            if (!inQuotes) {
                inQuotes = true;
            } else {
                current += '"';
            }
            i++; // skip next quote
        } else if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

function parseStandardCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

// ─── Date Parsing ──────────────────────────────────────────────────
function parseDate(val) {
    if (!val || val === '' || val === 'null') return null;
    // DD/MM/YYYY or DD-MM-YYYY
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    return null;
}

function parseDatetime(val) {
    if (!val || val === '' || val === 'null') return null;
    // DD/MM/YYYY HH:MM:SS AM/PM
    const m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
    if (m) {
        let hour = parseInt(m[4]);
        if (m[7] && m[7].toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (m[7] && m[7].toUpperCase() === 'AM' && hour === 12) hour = 0;
        return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')} ${String(hour).padStart(2,'0')}:${m[5]}:${m[6]}`;
    }
    return parseDate(val);
}

// ─── Currency Parsing ──────────────────────────────────────────────
function parseCurrency(val) {
    if (!val || val === '' || val === 'null') return 0;
    // Remove "Rs.", commas, spaces
    const cleaned = val.replace(/Rs\./gi, '').replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parseInt2(val) {
    if (!val || val === '' || val === 'null') return null;
    const cleaned = val.replace(/,/g, '').trim();
    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
}

// ─── Batch Insert Helper ──────────────────────────────────────────
async function batchInsert(pool, tableName, rows, batchSize = 100) {
    if (!rows || rows.length === 0) return;
    console.log(`  Loading ${rows.length} rows into \`${tableName}\`...`);
    
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        // Build a single bulk insert statement
        const keys = Object.keys(batch[0]);
        const placeholders = batch.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
        const sql = `INSERT IGNORE INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`;
        
        const values = [];
        batch.forEach(row => {
            keys.forEach(k => {
                values.push(row[k]);
            });
        });
        
        // Execute with retry on deadlock
        let success = false;
        let attempts = 3;
        while (!success && attempts > 0) {
            try {
                await pool.execute(sql, values);
                success = true;
            } catch (e) {
                if (e.code === 'ER_LOCK_DEADLOCK') {
                    attempts--;
                    if (attempts === 0) throw e;
                    console.log(`    ⚠️ Deadlock hit on \`${tableName}\`, retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    throw e;
                }
            }
        }
        
        inserted += batch.length;
        if (inserted % 1000 === 0 || inserted === rows.length) {
            process.stdout.write(`    ${inserted}/${rows.length}\r`);
        }
    }
    console.log(`  \n  ✅ ${inserted} rows loaded into \`${tableName}\``);
}

// ─── Main ──────────────────────────────────────────────────────────
async function run() {
    console.log('=== Data Loader: CSV → GCP Cloud SQL ===\n');

    // ──────────────── 1. VEHICLE MASTER ────────────────
    console.log('Step 1: Parsing vehicle_history.csv for Vehicle Master data...');
    const vmRaw = fs.readFileSync('C:\\Users\\arhaa\\Downloads\\data old\\vehicle_history.csv', 'utf8');
    const vmLines = vmRaw.split('\n').filter(l => l.trim().length > 0);
    const vmHeaders = parseStandardCsvLine(vmLines[0]);
    
    // Find the Vehicle Master columns (they start at "Booking Ref No" in the combined file)
    // Based on header inspection, vehicle master columns start from index ~50
    // Headers from the raw file for VM section:
    // Booking Ref No, Registration Number, Engine No, Product/VC#, Product Line, Owner Account Name,
    // Owner Account Site, TM Invoice Date, Original Sale Date, Status, Next Service Date, Next Service Type,
    // Selling Dealer, Total Loss Vehicle, Warranty Expiry Date, Warranty Expiry Hours, Warranty Expiry Km,
    // Contact Authorization, Chassis Color, Date of Registration, Date of Commissioning, RC Attached,
    // HSN Code, GST Invoice#, Commercial Invoice#
    
    // Map header names to their indices
    const hIdx = {};
    vmHeaders.forEach((h, i) => { hIdx[h.trim()] = i; });
    
    console.log(`  Total CSV headers: ${vmHeaders.length}`);
    console.log(`  Total data rows: ${vmLines.length - 1}`);
    
    // Extract unique vehicles by Chassis # (from the VM section of the combined file)
    const vehicleMap = new Map();
    
    for (let i = 1; i < vmLines.length; i++) {
        const fields = parseStandardCsvLine(vmLines[i]);
        
        let chassis = (fields[hIdx['Chassis #']] || fields[hIdx['Chassis No.']] || fields[hIdx['chassis_no']] || '').trim();
        if (!chassis) continue;
        
        let existing = vehicleMap.get(chassis);
        if (!existing) {
            existing = {
                chassis_no: chassis,
                registration_no: null, booking_ref_no: null, engine_no: null,
                product_vc: null, product_line: null, owner_account_name: null,
                owner_account_site: null, tm_invoice_date: null, original_sale_date: null,
                status: null, next_service_date: null, next_service_type: null,
                physical_status: null, selling_dealer: null, total_loss_vehicle: 0,
                warranty_expiry_date: null, warranty_expiry_hours: null, warranty_expiry_km: null,
                contact_authorization: null, chassis_color: null, date_of_registration: null,
                date_of_commissioning: null, rc_attached: 0, hsn_code: null,
                gst_invoice_no: null, commercial_invoice_no: null,
            };
            vehicleMap.set(chassis, existing);
        }

        // Merge attributes with fallbacks
        const regVal = (fields[hIdx['VRN']] || fields[hIdx['Registration No.']] || fields[hIdx['Registration Number']] || fields[hIdx['registration_no']] || '').trim();
        if (regVal && !existing.registration_no) existing.registration_no = regVal;

        const bookingVal = (fields[hIdx['Booking Ref No']] || '').trim();
        if (bookingVal && !existing.booking_ref_no) existing.booking_ref_no = bookingVal;

        const engineVal = (fields[hIdx['Engine No']] || '').trim();
        if (engineVal && !existing.engine_no) existing.engine_no = engineVal;

        const vcVal = (fields[hIdx['Product/VC#']] || '').trim();
        if (vcVal && !existing.product_vc) existing.product_vc = vcVal;

        const lineVal = (fields[hIdx['Product Line']] || fields[hIdx['product_line']] || '').trim();
        if (lineVal && !existing.product_line) existing.product_line = lineVal;

        const ownerVal = (fields[hIdx['Owner Account Name']] || fields[hIdx['Account']] || fields[hIdx['customer_account_name']] || '').trim();
        if (ownerVal && !existing.owner_account_name) existing.owner_account_name = ownerVal;

        const siteVal = (fields[hIdx['Owner Account Site']] || fields[hIdx['owner_account_site']] || '').trim();
        if (siteVal && !existing.owner_account_site) existing.owner_account_site = siteVal;

        const tmDate = parseDate(fields[hIdx['TM Invoice Date']] || fields[hIdx['tm_invoice_date']]);
        if (tmDate && !existing.tm_invoice_date) existing.tm_invoice_date = tmDate;

        const saleDate = parseDate(fields[hIdx['Original Sale Date']] || fields[hIdx['original_sale_date']]);
        if (saleDate && !existing.original_sale_date) existing.original_sale_date = saleDate;

        const statusVal = (fields[hIdx['Status']] || '').trim();
        if (statusVal && !existing.status) existing.status = statusVal;

        const nextDate = parseDate(fields[hIdx[' Next Service Date']] || fields[hIdx['next_service_date']]);
        if (nextDate && !existing.next_service_date) existing.next_service_date = nextDate;

        const nextType = (fields[hIdx['Next Service Type']] || fields[hIdx['next_service_type']] || '').trim();
        if (nextType && !existing.next_service_type) existing.next_service_type = nextType;

        const dealerVal = (fields[hIdx['Selling Dealer']] || '').trim();
        if (dealerVal && !existing.selling_dealer) existing.selling_dealer = dealerVal;

        const totalLoss = (fields[hIdx['Total Loss Vehicle']] || '').trim() === 'Y' ? 1 : 0;
        if (totalLoss) existing.total_loss_vehicle = 1;

        const warrantyDate = parseDate(fields[hIdx['Warranty Expiry Date']] || fields[hIdx['warranty_expiry_date']]);
        if (warrantyDate && !existing.warranty_expiry_date) existing.warranty_expiry_date = warrantyDate;

        const warrantyHrs = parseInt2(fields[hIdx['Warranty Expiry Hours']] || fields[hIdx['warranty_expiry_hours']]);
        if (warrantyHrs && !existing.warranty_expiry_hours) existing.warranty_expiry_hours = warrantyHrs;

        const warrantyKm = parseInt2(fields[hIdx['Warranty Expiry Km']] || fields[hIdx['warranty_expiry_km']]);
        if (warrantyKm && !existing.warranty_expiry_km) existing.warranty_expiry_km = warrantyKm;

        const authVal = (fields[hIdx['Contact Authorization']] || '').trim();
        if (authVal && !existing.contact_authorization) existing.contact_authorization = authVal;

        const colorVal = (fields[hIdx['Chassis Color']] || '').trim();
        if (colorVal && !existing.chassis_color) existing.chassis_color = colorVal;

        const regDate = parseDate(fields[hIdx['Date of Registration']] || '');
        if (regDate && !existing.date_of_registration) existing.date_of_registration = regDate;

        const commDate = parseDate(fields[hIdx['Date of Commissioning']] || '');
        if (commDate && !existing.date_of_commissioning) existing.date_of_commissioning = commDate;

        const rc = (fields[hIdx['RC Attached']] || '').trim() === 'Y' ? 1 : 0;
        if (rc) existing.rc_attached = 1;

        const hsn = (fields[hIdx['HSN Code']] || '').trim();
        if (hsn && !existing.hsn_code) existing.hsn_code = hsn;

        const gst = (fields[hIdx['GST Invoice#']] || '').trim();
        if (gst && !existing.gst_invoice_no) existing.gst_invoice_no = gst;

        const commInv = (fields[hIdx['Commercial Invoice#']] || '').trim();
        if (commInv && !existing.commercial_invoice_no) existing.commercial_invoice_no = commInv;
    }
    console.log(`  Unique vehicles extracted: ${vehicleMap.size}`);

    // ──────────────── 2. INVOICE ────────────────
    console.log('\nStep 2: Parsing Invoice.CSV...');
    const invRaw = fs.readFileSync('C:\\Users\\arhaa\\Downloads\\data old\\Invoice.CSV', 'utf16le').replace(/^\uFEFF/, '');
    const invLines = invRaw.split('\n').filter(l => l.trim().length > 0);
    // First line is the header (quoted)
    const invHeaderLine = invLines[0];
    const invHeaders = parseQuotedCsvLine(invHeaderLine);
    console.log(`  Invoice headers: ${invHeaders.join(', ')}`);
    
    const invoiceRows = [];
    const invoiceChassis = new Set();
    for (let i = 1; i < invLines.length; i++) {
        const fields = parseQuotedCsvLine(invLines[i]);
        if (fields.length < 13) continue;
        
        const chassis = (fields[12] || '').trim(); // Chassis #
        const invoiceNo = (fields[1] || '').trim(); // Invoice #
        if (!chassis || !invoiceNo) continue;
        
        invoiceChassis.add(chassis);
        invoiceRows.push({
            invoice_no: invoiceNo,
            chassis_no: chassis,
            registration_no: (fields[13] || '').trim() || null,
            sr_assigned_to: (fields[0] || '').trim() || null,
            invoice_date: parseDate(fields[2]),
            account: (fields[3] || '').trim() || null,
            invoice_type: (fields[4] || '').trim() || null,
            invoice_format: (fields[5] || '').trim() || null,
            invoice_status: (fields[6] || '').trim() || null,
            final_labour_amount: parseCurrency(fields[7]),
            final_spares_amount: parseCurrency(fields[8]),
            final_consolidated_amt: parseCurrency(fields[9]),
            order_no: (fields[10] || '').trim() || null,
            sr_no: (fields[11] || '').trim() || null,
            cancellation_reason: (fields[14] || '').trim() || null,
        });
    }
    console.log(`  Invoices parsed: ${invoiceRows.length}`);
    console.log(`  Unique chassis in invoices: ${invoiceChassis.size}`);

    // ──────────────── 3. SERVICE HISTORY ────────────────
    console.log('\nStep 3: Parsing ServiceHistory.CSV...');
    const shRaw = fs.readFileSync('C:\\Users\\arhaa\\Downloads\\data old\\ServiceHistory.CSV', 'utf16le').replace(/^\uFEFF/, '');
    const shLines = shRaw.split('\n').filter(l => l.trim().length > 0);
    const shHeaders = parseQuotedCsvLine(shLines[0]);
    console.log(`  Service headers: ${shHeaders.join(', ')}`);
    
    const serviceRows = [];
    const serviceChassis = new Set();
    for (let i = 1; i < shLines.length; i++) {
        const fields = parseQuotedCsvLine(shLines[i]);
        if (fields.length < 10) continue;
        
        const shNo = (fields[0] || '').trim();    // SH #
        const chassis = (fields[1] || '').trim();  // Chassis #
        if (!chassis || !shNo) continue;
        
        serviceChassis.add(chassis);
        serviceRows.push({
            sh_no: shNo,
            chassis_no: chassis,
            registration_no: (fields[2] || '').trim() || null,
            account: (fields[3] || '').trim() || null,
            sr_no: (fields[4] || '').trim() || null,
            service_datetime: parseDatetime(fields[5]),
            other_service_center: (fields[6] || '').trim() || null,
            serviced_at_other_src: (fields[7] || '').trim() === 'Y' ? 1 : 0,
            job_card_open_date: parseDate(fields[8]),
            odometer_reading: parseInt2(fields[9]),
            sr_type: (fields[10] || '').trim() || null,
            summary: (fields[11] || '').trim() || null,
            survey_customer: (fields[12] || '').trim() === 'Y' ? 1 : 0,
            revisit: (fields[13] || '').trim() === 'Y' ? 1 : 0,
            service_request: (fields[14] || '').trim() || null,
            contact_full_name: (fields[15] || '').trim() || null,
        });
    }
    console.log(`  Service records parsed: ${serviceRows.length}`);
    console.log(`  Unique chassis in services: ${serviceChassis.size}`);

    // ──────────────── 4. Ensure all chassis exist in vehicle_master ────────────────
    // Invoice and Service rows reference chassis via FK. We must ensure all chassis exist.
    console.log('\nStep 4: Ensuring FK integrity — adding missing chassis to vehicle_master...');
    const allChassis = new Set([...invoiceChassis, ...serviceChassis]);
    let added = 0;
    for (const ch of allChassis) {
        if (!vehicleMap.has(ch)) {
            vehicleMap.set(ch, {
                chassis_no: ch,
                registration_no: null, booking_ref_no: null, engine_no: null,
                product_vc: null, product_line: null, owner_account_name: null,
                owner_account_site: null, tm_invoice_date: null, original_sale_date: null,
                status: null, next_service_date: null, next_service_type: null,
                physical_status: null, selling_dealer: null, total_loss_vehicle: 0,
                warranty_expiry_date: null, warranty_expiry_hours: null, warranty_expiry_km: null,
                contact_authorization: null, chassis_color: null, date_of_registration: null,
                date_of_commissioning: null, rc_attached: 0, hsn_code: null,
                gst_invoice_no: null, commercial_invoice_no: null,
            });
            added++;
        }
    }
    console.log(`  Vehicles from CSV: ${vehicleMap.size - added}, stub vehicles added for FK: ${added}`);
    console.log(`  Total vehicle_master rows to insert: ${vehicleMap.size}`);

    // ──────────────── 5. Write to GCP ────────────────
    console.log('\nStep 5: Connecting to GCP Cloud SQL...');
    const pool = mysql.createPool({ ...gcpDbConfig, connectionLimit: 50 });
    
    // Clear existing data (order matters for FK constraints)
    console.log('  Clearing existing data...');
    await pool.execute('DELETE FROM invoices');
    await pool.execute('DELETE FROM service_history');
    await pool.execute('DELETE FROM vehicle_master');
    console.log('  ✅ Tables cleared.');
    
    // Insert in FK order: vehicle_master first, then service_history & invoices
    const vehicleRows = Array.from(vehicleMap.values());
    await batchInsert(pool, 'vehicle_master', vehicleRows, 50);
    await batchInsert(pool, 'service_history', serviceRows, 50);
    await batchInsert(pool, 'invoices', invoiceRows, 50);
    
    // ──────────────── 6. Verify ────────────────
    console.log('\nStep 6: Verifying...');
    const [[{vm}]] = await pool.query('SELECT COUNT(*) as vm FROM vehicle_master');
    const [[{sh}]] = await pool.query('SELECT COUNT(*) as sh FROM service_history');
    const [[{inv}]] = await pool.query('SELECT COUNT(*) as inv FROM invoices');
    console.log(`  vehicle_master: ${vm} rows`);
    console.log(`  service_history: ${sh} rows`);
    console.log(`  invoices: ${inv} rows`);
    
    await pool.end();
    console.log('\n🎉 Data load complete!');
}

run().catch(e => console.error('❌ Load failed:', e));
