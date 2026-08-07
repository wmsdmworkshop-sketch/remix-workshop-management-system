const fs = require('fs');
const https = require('https');

const BASE_URL = 'https://wms-workshop-app-473233046183.asia-south1.run.app';

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

async function sendRequest(endpoint, payload, token = null) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = https.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers
    }, (res) => {
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
    req.write(body);
    req.end();
  });
}

async function postBatch(endpoint, rows, token) {
  const BATCH_SIZE = 500;
  let grandTotal = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const result = await sendRequest(endpoint, { rows: chunk }, token);
    const count = result.importedCount || 0;
    grandTotal += count;
    console.log(`  Sent chunk ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} rows) -> Imported: ${count} (Status: ${result.success ? 'SUCCESS' : result.error || 'OK'})`);
  }
  return grandTotal;
}

async function run() {
  console.log('🔑 Logging in as admin to get auth token...');
  const loginRes = await sendRequest('/api/auth/login', { username: 'admin', password: 'Admin@DWIP2026' });
  if (!loginRes.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.token;
  console.log('✓ Authenticated successfully! Token acquired.\n');

  console.log('🚀 Starting API batch upload for all 3 CSV files to live Cloud Run app...\n');

  // 1. org sale date.csv -> /api/import/vehicle-master
  console.log('1. Uploading "C:\\Users\\arhaa\\Downloads\\org sale date.csv" (Vehicle Master)...');
  const saleRows = parseCSV('C:\\Users\\arhaa\\Downloads\\org sale date.csv');
  const mappedSales = saleRows.map(r => ({
    chassis_no: r['Chassis No.'] || r['Chassis No'] || '',
    registration_no: r['Registration Number'] || r['Registration No.'] || '',
    engine_no: r['Engine No'] || '',
    product_line: r['Product Line'] || '',
    owner_account_name: r['Owner Account Name'] || '',
    tm_invoice_date: r['TM Invoice Date'] || '',
    original_sale_date: r['Original Sale Date'] || '',
    warranty_expiry_date: r['Warranty Expiry Date'] || '',
    warranty_expiry_hours: r['Warranty Expiry Hours'] || '',
    warranty_expiry_km: r['Warranty Expiry Km'] || '',
    date_of_registration: r['Date of Registration'] || ''
  }));
  const countSales = await postBatch('/api/import/vehicle-master', mappedSales, token);
  console.log(`✓ Vehicle Master: ${countSales} records imported!\n`);

  // 2. invoice.CSV -> /api/import/invoices
  console.log('2. Uploading "C:\\Users\\arhaa\\Downloads\\invoice.CSV" (Invoices)...');
  const invRows = parseCSV('C:\\Users\\arhaa\\Downloads\\invoice.CSV');
  const mappedInvoices = invRows.map(r => ({
    invoice_no: r['Invoice #'] || r['Invoice Number'] || '',
    invoice_date: r['Invoice Date'] || '',
    customer_name: r['Account'] || '',
    invoice_type: r['Invoice Type'] || '',
    invoice_format: r['Invoice Format'] || '',
    invoice_status: r['Invoice Status'] || '',
    final_labour_amount: r['Final Labour Invoice Amount'] || '',
    final_spares_amount: r['Final Spares Invoice Amount'] || '',
    final_consolidated_amt: r['Final Consolidated Invoice Amount'] || '',
    order_no: r['Order #'] || '',
    sr_no: r['SR #'] || '',
    chassis_no: r['Chassis #'] || '',
    vrn: r['VRN'] || ''
  }));
  const countInvoices = await postBatch('/api/import/invoices', mappedInvoices, token);
  console.log(`✓ Invoices: ${countInvoices} records imported!\n`);

  // 3. service history summary.csv -> /api/import/service-history
  console.log('3. Uploading "C:\\Users\\arhaa\\Downloads\\service history summary.csv" (Service History)...');
  const shRows = parseCSV('C:\\Users\\arhaa\\Downloads\\service history summary.csv');
  const mappedSH = shRows.map(r => ({
    chassis_no: r['Chassis No.'] || '',
    registration_no: r['Registration No.'] || '',
    account: r['Account'] || '',
    service_datetime: r['Service Date/Time'] || '',
    other_service_center: r['Other Service Center'] || '',
    job_card_open_date: r['Job Card Open Date'] || '',
    odometer_reading: r['Odometer Reading'] || '',
    sr_type: r['SR Type'] || '',
    summary: r['Summary'] || '',
    service_request: r['Service Request'] || ''
  }));
  const countSH = await postBatch('/api/import/service-history', mappedSH, token);
  console.log(`✓ Service History: ${countSH} records imported!\n`);

  console.log(`=======================================================
🎉 FINAL IMPORT SUMMARY (LIVE CLOUD RUN DEPLOYMENT):
- Vehicle Master Records Imported: ${countSales} / ${saleRows.length}
- Invoice Records Imported: ${countInvoices} / ${invRows.length}
- Service History Records Imported: ${countSH} / ${shRows.length}
- Total Operational Records Ingested: ${countSales + countInvoices + countSH}
=======================================================`);
}

run().catch(console.error);
