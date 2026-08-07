const fs = require('fs');
const https = require('https');

const BASE_URL = 'https://wms-workshop-app-473233046183.asia-south1.run.app';
const BATCH_ID = 'BATCH-RC2-20260721-001';

function parseCSV(filePath) {
  let content = fs.readFileSync(filePath, 'utf16le');
  if (!content.includes(',')) content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split('\t').length > 1 ? headerLine.split('\t') : headerLine.split(',');
  const cleanHeaders = headers.map(h => h.replace(/^["\s]+|["\s]+$/g, '').trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const row = {};
    cleanHeaders.forEach((h, idx) => {
      let val = cols[idx] ? cols[idx].replace(/^["\s]+|["\s]+$/g, '').trim() : '';
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

function sendRequest(endpoint, method = 'POST', payload = null, token = null) {
  const body = payload ? JSON.stringify(payload) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (body) headers['Content-Length'] = Buffer.byteLength(body);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = https.request(`${BASE_URL}${endpoint}`, { method, headers }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resData));
        } catch (e) {
          resolve({ success: false, raw: resData, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sendBatches(endpoint, rows, token) {
  const BATCH_SIZE = 500;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const res = await sendRequest(endpoint, 'POST', { rows: chunk }, token);
    if (res.success) {
      imported += (res.importedCount || 0);
    } else {
      skipped += chunk.length;
      console.warn(`  Batch failed on ${endpoint}:`, res.error || res.raw);
    }
  }
  return { imported, skipped };
}

async function executeRC2Migration() {
  const startTime = new Date();
  console.log(`=======================================================`);
  console.log(`🚀 STARTING RC2 HISTORICAL MIGRATION [${BATCH_ID}]`);
  console.log(`Target Environment: ${BASE_URL}`);
  console.log(`Start Time: ${startTime.toISOString()}`);
  console.log(`=======================================================\n`);

  console.log('1. Authenticating Admin Release Engineer...');
  const loginRes = await sendRequest('/api/auth/login', 'POST', { username: 'admin', password: 'Admin@DWIP2026' });
  const token = loginRes.token;
  if (!token) {
    console.error('Authentication failed!', loginRes);
    process.exit(1);
  }
  console.log('✓ Authentication successful!\n');

  // STEP 1: Vehicle Master & Warranty (org sale date.csv)
  console.log('Step 1/3: Migrating Vehicle Master & Warranty Data ("org sale date.csv")...');
  const saleRows = parseCSV('C:\\Users\\arhaa\\Downloads\\org sale date.csv');
  const cleanSales = saleRows.map(r => ({
    chassis_no: r['Chassis No.'] || r['Chassis No'] || '',
    registration_no: r['Registration Number'] || r['Registration No.'] || '',
    engine_no: r['Engine No'] || '',
    product_line: r['Product Line'] || '',
    owner_account_name: r['Owner Account Name'] || '',
    tm_invoice_date: r['TM Invoice Date'] || '',
    original_sale_date: r['Original Sale Date'] || '',
    warranty_expiry_date: r['Warranty Expiry Date'] || '',
    warranty_expiry_hours: r['Warranty Expiry Hours'] || '0',
    warranty_expiry_km: r['Warranty Expiry Km'] || '300000',
    date_of_registration: r['Date of Registration'] || ''
  }));

  const resSales = await sendBatches('/api/import/vehicle-master', cleanSales, token);
  console.log(`✓ Step 1 Complete: ${resSales.imported} / ${saleRows.length} vehicle records ingested into Vehicle Master.\n`);

  // STEP 2: Historical Invoices (invoice.CSV)
  console.log('Step 2/3: Migrating Historical Invoice Ledger ("invoice.CSV")...');
  const invRows = parseCSV('C:\\Users\\arhaa\\Downloads\\invoice.CSV');
  const cleanInvoices = invRows.map(r => ({
    invoice_no: r['Invoice #'] || r['Invoice Number'] || '',
    invoice_date: r['Invoice Date'] || '',
    customer_name: r['Account'] || '',
    account: r['Account'] || '',
    invoice_type: r['Invoice Type'] || '',
    invoice_format: r['Invoice Format'] || '',
    invoice_status: r['Invoice Status'] || '',
    final_labour_amount: (r['Final Labour Invoice Amount'] || '').replace(/[^0-9.]/g, ''),
    final_spares_amount: (r['Final Spares Invoice Amount'] || '').replace(/[^0-9.]/g, ''),
    final_consolidated_amt: (r['Final Consolidated Invoice Amount'] || '').replace(/[^0-9.]/g, ''),
    final_consolidated_amount: (r['Final Consolidated Invoice Amount'] || '').replace(/[^0-9.]/g, ''),
    order_no: r['Order #'] || '',
    sr_no: r['SR #'] || '',
    chassis_no: r['Chassis #'] || '',
    vrn: r['VRN'] || ''
  }));

  const resInvoices = await sendBatches('/api/import/invoices', cleanInvoices, token);
  console.log(`✓ Step 2 Complete: ${resInvoices.imported} / ${invRows.length} invoice records ingested into Historical Invoices.\n`);

  // STEP 3: Historical Service History (service history summary.csv)
  console.log('Step 3/3: Migrating Historical Service Ledger ("service history summary.csv")...');
  const shRows = parseCSV('C:\\Users\\arhaa\\Downloads\\service history summary.csv');
  const cleanSH = shRows.map((r, idx) => ({
    sh_no: r['Service Request'] || `SH-HIST-${idx + 10000}`,
    chassis_no: r['Chassis No.'] || '',
    registration_no: r['Registration No.'] || '',
    account: r['Account'] || '',
    account_name: r['Account'] || '',
    service_datetime: r['Service Date/Time'] || '',
    other_service_center: r['Other Service Center'] || '',
    job_card_open_date: r['Job Card Open Date'] || '',
    odometer_reading: (r['Odometer Reading'] || '').replace(/[^0-9]/g, ''),
    sr_type: r['SR Type'] || '',
    summary: r['Summary'] || '',
    service_request: r['Service Request'] || ''
  }));

  const resSH = await sendBatches('/api/import/service-history', cleanSH, token);
  console.log(`✓ Step 3 Complete: ${resSH.imported} / ${shRows.length} service records ingested into Historical Service History.\n`);

  const endTime = new Date();
  const durationSec = Math.round((endTime - startTime) / 1000);

  console.log(`=======================================================`);
  console.log(`🎉 RC2 HISTORICAL MIGRATION COMPLETED SUCCESSFULLY!`);
  console.log(`Import Batch ID: ${BATCH_ID}`);
  console.log(`Duration: ${durationSec}s`);
  console.log(`- Vehicle Sale Records: ${resSales.imported} / ${saleRows.length}`);
  console.log(`- Invoice Records: ${resInvoices.imported} / ${invRows.length}`);
  console.log(`- Service History Records: ${resSH.imported} / ${shRows.length}`);
  console.log(`- Total Records Ingested: ${resSales.imported + resInvoices.imported + resSH.imported}`);
  console.log(`=======================================================`);
}

executeRC2Migration().catch(console.error);
