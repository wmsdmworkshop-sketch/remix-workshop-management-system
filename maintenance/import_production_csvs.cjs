require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

async function main() {
  console.log(`Connecting to Cloud SQL MySQL database (${process.env.DB_HOST}:${process.env.DB_PORT}, DB: ${process.env.DB_DATABASE})...`);
  
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '35.200.150.167',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'WmsSecureMySQL2026!',
      database: process.env.DB_DATABASE || 'railway',
      port: Number(process.env.DB_PORT || 3306),
      connectTimeout: 20000
    });
  } catch (err) {
    console.error('Could not connect to MySQL database:', err.message);
    process.exit(1);
  }

  console.log('Connected to live Cloud SQL MySQL successfully!');

  // Ensure tables exist
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS vehicle_master (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chassis_number VARCHAR(100),
      registration_no VARCHAR(50),
      engine_no VARCHAR(100),
      product_line VARCHAR(100),
      owner_account_name VARCHAR(255),
      owner_account_site VARCHAR(255),
      tm_invoice_date VARCHAR(50),
      original_sale_date VARCHAR(50),
      warranty_expiry_date VARCHAR(50),
      warranty_expiry_hours VARCHAR(50),
      warranty_expiry_km VARCHAR(50),
      contact_authorization VARCHAR(255),
      date_of_registration VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chassis (chassis_number),
      INDEX idx_vrn (registration_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_no VARCHAR(100),
      invoice_date VARCHAR(50),
      customer_name VARCHAR(255),
      invoice_type VARCHAR(100),
      invoice_format VARCHAR(100),
      invoice_status VARCHAR(50),
      final_labour_amount VARCHAR(50),
      final_spares_amount VARCHAR(50),
      final_consolidated_amount VARCHAR(50),
      order_no VARCHAR(100),
      sr_no VARCHAR(100),
      chassis_no VARCHAR(100),
      vrn VARCHAR(50),
      cancellation_reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inv_chassis (chassis_no),
      INDEX idx_inv_order (order_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS service_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      chassis_no VARCHAR(100),
      registration_no VARCHAR(50),
      account_name VARCHAR(255),
      service_datetime VARCHAR(50),
      other_service_center VARCHAR(255),
      job_card_open_date VARCHAR(50),
      odometer_reading VARCHAR(50),
      sr_type VARCHAR(100),
      summary VARCHAR(500),
      service_request VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sh_chassis (chassis_no),
      INDEX idx_sh_vrn (registration_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Helper to read UTF16/UTF8 CSV
  function parseCSV(filePath) {
    let content = fs.readFileSync(filePath, 'utf16le');
    if (!content.includes(',')) content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];
    
    // Clean BOM
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

  // 1. Import Original Sale Data -> vehicle_master
  console.log('Parsing "org sale date.csv"...');
  const saleRows = parseCSV('C:\\Users\\arhaa\\Downloads\\org sale date.csv');
  console.log(`Parsed ${saleRows.length} vehicle sale rows.`);

  let saleCount = 0;
  for (const r of saleRows) {
    const chassis = r['Chassis No.'] || r['Chassis No'] || r['chassis_no'];
    const vrn = r['Registration Number'] || r['Registration No.'] || r['vrn'];
    if (!chassis && !vrn) continue;

    await connection.execute(`
      INSERT INTO vehicle_master (
        chassis_number, registration_no, engine_no, product_line, owner_account_name, 
        owner_account_site, tm_invoice_date, original_sale_date, warranty_expiry_date, 
        warranty_expiry_hours, warranty_expiry_km, contact_authorization, date_of_registration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      chassis || '',
      vrn || '',
      r['Engine No'] || '',
      r['Product Line'] || '',
      r['Owner Account Name'] || '',
      r['Owner Account Site'] || '',
      r['TM Invoice Date'] || '',
      r['Original Sale Date'] || '',
      r['Warranty Expiry Date'] || '',
      r['Warranty Expiry Hours'] || '',
      r['Warranty Expiry Km'] || '',
      r['Contact Authorization'] || '',
      r['Date of Registration'] || ''
    ]);
    saleCount++;
  }
  console.log(`✓ Imported ${saleCount} vehicle sale records into vehicle_master.`);

  // 2. Import Invoice History -> invoices
  console.log('Parsing "invoice.CSV"...');
  const invRows = parseCSV('C:\\Users\\arhaa\\Downloads\\invoice.CSV');
  console.log(`Parsed ${invRows.length} invoice rows.`);

  let invCount = 0;
  for (const r of invRows) {
    const invNo = r['Invoice #'] || r['Invoice Number'];
    if (!invNo) continue;

    await connection.execute(`
      INSERT INTO invoices (
        invoice_no, invoice_date, customer_name, invoice_type, invoice_format, 
        invoice_status, final_labour_amount, final_spares_amount, final_consolidated_amount, 
        order_no, sr_no, chassis_no, vrn, cancellation_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invNo,
      r['Invoice Date'] || '',
      r['Account'] || '',
      r['Invoice Type'] || '',
      r['Invoice Format'] || '',
      r['Invoice Status'] || '',
      r['Final Labour Invoice Amount'] || '',
      r['Final Spares Invoice Amount'] || '',
      r['Final Consolidated Invoice Amount'] || '',
      r['Order #'] || '',
      r['SR #'] || '',
      r['Chassis #'] || '',
      r['VRN'] || '',
      r['Cancellation Reason'] || ''
    ]);
    invCount++;
  }
  console.log(`✓ Imported ${invCount} invoice records into invoices.`);

  // 3. Import Service History Summary -> service_history
  console.log('Parsing "service history summary.csv"...');
  const shRows = parseCSV('C:\\Users\\arhaa\\Downloads\\service history summary.csv');
  console.log(`Parsed ${shRows.length} service history rows.`);

  let shCount = 0;
  for (const r of shRows) {
    const chassis = r['Chassis No.'] || r['chassis_no'];
    const vrn = r['Registration No.'] || r['vrn'];
    if (!chassis && !vrn) continue;

    await connection.execute(`
      INSERT INTO service_history (
        chassis_no, registration_no, account_name, service_datetime, 
        other_service_center, job_card_open_date, odometer_reading, sr_type, summary, service_request
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      chassis || '',
      vrn || '',
      r['Account'] || '',
      r['Service Date/Time'] || '',
      r['Other Service Center'] || '',
      r['Job Card Open Date'] || '',
      r['Odometer Reading'] || '',
      r['SR Type'] || '',
      r['Summary'] || '',
      r['Service Request'] || ''
    ]);
    shCount++;
  }
  console.log(`✓ Imported ${shCount} service history records into service_history.`);

  await connection.end();
  console.log('\n🎉 SUCCESS: All 3 CSV files (org sale date.csv, invoice.CSV, service history summary.csv) uploaded and ingested into live production Cloud SQL database!');
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
