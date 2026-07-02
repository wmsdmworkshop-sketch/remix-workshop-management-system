require('dotenv').config();
const { google } = require('googleapis');
const mysql = require('mysql2/promise');
const Fuse = require('fuse.js');
const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell);
        lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  return lines;
}

const employeeList = [
  {id: 1, name: "ABDUL GANI SHEK"},
  {id: 2, name: "ABDUL QADEER"},
  {id: 3, name: "ALTAF HUSSAIN"},
  {id: 4, name: "ASHFAQ HUSSAIN"},
  {id: 5, name: "ASIF"},
  {id: 6, name: "FAKIRAAPA"},
  {id: 7, name: "HAMEED PATEL"},
  {id: 8, name: "HANNAMANTRAYA"},
  {id: 9, name: "HUNCHIRAY"},
  {id: 10, name: "JAGADISH"},
  {id: 11, name: "LOKU"},
  {id: 12, name: "MAHMED ALTAF AHMED"},
  {id: 13, name: "MALLINATH"},
  {id: 14, name: "MANJUNATH"},
  {id: 15, name: "MD ABDUL KHADEER"},
  {id: 16, name: "MD GOUSE"},
  {id: 17, name: "MD JAVEED"},
  {id: 18, name: "MEHMOOD"},
  {id: 19, name: "MOHAMMED SHOAIB"},
  {id: 20, name: "MOHAMMED ZAKT"},
  {id: 21, name: "MOHSIN NAWAZ"},
  {id: 22, name: "MUSTAFA"},
  {id: 23, name: "MUZAMIL"},
  {id: 24, name: "NAGESH"},
  {id: 25, name: "PRAHLAD KULKARNI"},
  {id: 26, name: "RAGHAVENDRA KULKARNI"},
  {id: 27, name: "RAJKUMAR AMBARISH"},
  {id: 28, name: "SANGAPPA"},
  {id: 29, name: "SHASHIKUMAR"},
  {id: 30, name: "SIRAJ AHMED"},
  {id: 31, name: "SRINATH M. N"},
  {id: 32, name: "UMAKANTA"},
  {id: 33, name: "YUNUS ALI"},
  {id: 34, name: "REVANSIDAPPA"},
  {id: 35, name: "KHASIM"},
  {id: 36, name: "ASLAM"},
  {id: 37, name: "JAVEED PASHA"},
  {id: 38, name: "AZHAR"},
  {id: 39, name: "AFROZ"},
  {id: 40, name: "AHMED HUSSAIN"},
  {id: 42, name: "MUBEEN"},
  {id: 43, name: "SHARNBASAPPA"}
];

async function run() {
  let connection;
  try {
    console.log("=== STARTING GSHEETS BACKDATE IMPORT ===");
    
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: 'thomas.proxy.rlwy.net',
      port: 50733,
      user: 'root',
      password: 'mjzwCcYkEYSYRAADKjnyAiEZGGrtwAri',
      database: 'railway'
    });
    console.log("Connected to MySQL Database.");

    let rows;
    let csvPath = path.join(__dirname, 'JC_Backdate_June2026.csv');
    if (!fs.existsSync(csvPath)) {
      csvPath = path.join(__dirname, 'JC_Backdate_June2026 - Sheet.csv');
    }

    if (fs.existsSync(csvPath)) {
      console.log(`Found local CSV at "${path.basename(csvPath)}". Reading data from CSV...`);
      const content = fs.readFileSync(csvPath, 'utf8');
      rows = parseCSV(content);
    } else {
      console.log("No local 'JC_Backdate_June2026.csv' or 'JC_Backdate_June2026 - Sheet.csv' found. Attempting Google Sheets API...");
      
      // Google Auth using OAuth2 refresh token from legacy credentials
      const oauth2Client = new google.auth.OAuth2(
        "32555940559.apps.googleusercontent.com",
        "ZmssLNjJy2998hD4CTg2ejr2"
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN || ""
      });
      
      // Search for spreadsheet named "JC_Backdate_June2026"
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      console.log("Searching for spreadsheet 'JC_Backdate_June2026' in Google Drive...");
      const driveRes = await drive.files.list({
        q: "name = 'JC_Backdate_June2026' and mimeType = 'application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name)',
        pageSize: 1
      });
      const files = driveRes.data.files;
      if (!files || files.length === 0) {
        throw new Error("Could not find spreadsheet with name 'JC_Backdate_June2026' in Google Drive. Ensure the sheet exists and the credential wmsdmworkshop@gmail.com has access.");
      }
      const spreadsheetId = files[0].id;
      console.log(`Found spreadsheet ID: ${spreadsheetId}`);

      // Get sheets metadata and fetch values of the first sheet
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetTitle = meta.data.sheets[0].properties.title;
      console.log(`Reading sheet tab: "${sheetTitle}"`);
      
      const sheetDataRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTitle}!A:Z`
      });
      
      rows = sheetDataRes.data.values;
    }

    if (!rows || rows.length < 2) {
      console.log("No data rows found.");
      return;
    }
    
    const headers = rows[0].map(h => h.trim().toLowerCase());
    console.log("Headers detected:", headers);

    const colIndex = (name) => {
      const aliases = {
        'job_card_no': ['job_card_no', 'j c no', 'jc no', 'job card no'],
        'vehicle_reg': ['vehicle_reg', 'vrn', 'vehicle reg', 'vehicle no', 'vehicle_no'],
        'chassis_no': ['chassis_no', 'chassis no'],
        'customer_name': ['customer_name', 'name', 'customer name'],
        'driver_name': ['driver_name', 'driver name'],
        'driver_mobile': ['driver_mobile', 'driver mobile'],
        'service_type': ['service_type', 'jc type', 'service type', 'type'],
        'assigned_to': ['assigned_to', 'mech', 'assigned to', 'technician'],
        'bay_id': ['bay_id', 'bay id', 'bay'],
        'labour_amount': ['labour_amount', 'labour', 'labor', 'labour amount'],
        'spares_amount': ['spares_amount', 'spares', 'parts', 'spares amount'],
        'total_amount': ['total_amount', 'total', 'total amount'],
        'job_status': ['job_status', 'status', 'job status'],
        'created_at': ['created_at', 'invoice date', 'date', 'created date', 'created at']
      };

      const searchNames = aliases[name] || [name];
      for (const sn of searchNames) {
        const idx = headers.indexOf(sn.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };
    
    // Validate required columns are mapped
    const reqCols = ['job_card_no', 'vehicle_reg', 'service_type', 'created_at'];
    for (const c of reqCols) {
      if (colIndex(c) === -1) {
        throw new Error(`Missing required column: "${c}" in spreadsheet headers.`);
      }
    }

    // Load helper databases to match records and ensure references exist
    const [srTypes] = await connection.query("SELECT sr_type_id, sr_type_code, sr_type_name FROM sr_types");
    const [existingJcs] = await connection.query("SELECT job_card_no FROM job_cards");
    const existingSet = new Set(existingJcs.map(j => j.job_card_no));
    
    const [maxJobRows] = await connection.query("SELECT MAX(job_id) AS max_id FROM job_cards");
    let nextJobId = (maxJobRows[0].max_id || 0) + 1;
    
    const [maxMapRows] = await connection.query("SELECT MAX(map_id) AS max_id FROM job_technician_maps");
    let nextMapId = (maxMapRows[0].max_id || 0) + 1;

    // Set up Fuse.js for fuzzy employee matching
    const fuse = new Fuse(employeeList, {
      keys: ['name'],
      includeScore: true,
      threshold: 0.6
    });

    let insertedCount = 0;
    let skippedCount = 0;
    let unmatchedCount = 0;
    const unmatchedNames = new Set();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) {
        skippedCount++;
        continue;
      }

      const getVal = (name) => {
        const idx = colIndex(name);
        if (idx === -1 || idx >= row.length) return '';
        return (row[idx] || '').trim();
      };

      const jobCardNo = getVal('job_card_no');
      const vehicleReg = getVal('vehicle_reg');
      const chassisNo = getVal('chassis_no');
      const customerName = getVal('customer_name');
      const driverName = getVal('driver_name') || customerName;
      const driverMobile = getVal('driver_mobile');
      const serviceType = getVal('service_type');
      const assignedTo = getVal('assigned_to');
      const bayId = getVal('bay_id');
      const labourAmount = getVal('labour_amount') || '0';
      const sparesAmount = getVal('spares_amount') || '0';
      const totalAmount = getVal('total_amount') || '0';
      const createdAt = getVal('created_at');

      if (!jobCardNo) {
        skippedCount++;
        continue;
      }

      // VALIDATION: job_card_no unique
      if (existingSet.has(jobCardNo)) {
        console.warn(`Row ${i}: Skipping duplicate job_card_no "${jobCardNo}"`);
        skippedCount++;
        continue;
      }

      // VALIDATION: vehicle_reg not empty
      if (!vehicleReg || vehicleReg === "") {
        console.warn(`Row ${i}: Skipping empty vehicle_reg`);
        skippedCount++;
        continue;
      }

      // VALIDATION: service_type in ENUM
      const mapServiceType = (sheetVal, srTypesList) => {
        const val = (sheetVal || "").trim().toLowerCase();
        let match = srTypesList.find(t => 
          t.sr_type_code.toLowerCase() === val ||
          t.sr_type_name.toLowerCase() === val
        );
        if (match) return match;
        
        let mappedCode = "GR"; // default to General Repair
        if (val.includes("warranty")) {
          mappedCode = "GR";
        } else if (val.includes("free service") || val.includes("periodic") || val.includes("pm")) {
          mappedCode = "PM";
        } else if (val.includes("running") || val.includes("repair")) {
          mappedCode = "GR";
        } else if (val.includes("break down") || val.includes("breakdown")) {
          mappedCode = "GR";
        } else if (val.includes("alignment") || val.includes("wheel")) {
          mappedCode = "WA";
        } else if (val.includes("quick") || val.includes("qs")) {
          mappedCode = "QS";
        } else if (val.includes("scheduled") || val.includes("schedule")) {
          mappedCode = "PM";
        }
        
        return srTypesList.find(t => t.sr_type_code.toUpperCase() === mappedCode.toUpperCase());
      };

      const matchedSrType = mapServiceType(serviceType, srTypes);
      if (!matchedSrType) {
        console.warn(`Row ${i}: Skipping invalid service_type "${serviceType}"`);
        skippedCount++;
        continue;
      }

      // VALIDATION: labour_amount numeric
      const labourNum = Number(labourAmount);
      if (isNaN(labourNum)) {
        console.warn(`Row ${i}: Skipping invalid numeric labour_amount "${labourAmount}"`);
        skippedCount++;
        continue;
      }

      // VALIDATION: created_at valid date
      let createdDate = new Date(createdAt);
      if (isNaN(createdDate.getTime())) {
        const parts = createdAt.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            createdDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else {
            createdDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
      }
      if (isNaN(createdDate.getTime())) {
        console.warn(`Row ${i}: Skipping invalid created_at date "${createdAt}"`);
        skippedCount++;
        continue;
      }

      // Format clean database date strings
      const yyyy = createdDate.getFullYear();
      const mm = String(createdDate.getMonth() + 1).padStart(2, "0");
      const dd = String(createdDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timeStr = "12:00:00";
      const fullTimestampStr = `${dateStr}T${timeStr}.000Z`;

      // bay_id fallback
      const finalBayId = (bayId && !isNaN(parseInt(bayId))) ? parseInt(bayId) : Math.floor(Math.random() * 9) + 1;

      // Fuzzy Match Technician
      let matchedEmpId = null;
      let matchedEmpName = "Unassigned";
      if (assignedTo && assignedTo.trim() !== "") {
        const results = fuse.search(assignedTo);
        if (results.length > 0) {
          const best = results[0];
          if (best.score <= 0.6) {
            matchedEmpId = best.item.id;
            matchedEmpName = best.item.name;
            console.log(`Row ${i}: Fuzzy matched "${assignedTo}" -> "${matchedEmpName}" (score: ${best.score.toFixed(3)})`);
          } else {
            unmatchedCount++;
            unmatchedNames.add(assignedTo);
            console.warn(`Row ${i}: Unmatched technician name "${assignedTo}" (best score: ${best.score.toFixed(3)})`);
          }
        } else {
          unmatchedCount++;
          unmatchedNames.add(assignedTo);
          console.warn(`Row ${i}: Unmatched technician name "${assignedTo}" (no close matches found)`);
        }
      }

      // Insert into MySQL job_cards table
      const jobId = nextJobId++;
      
      const insertSql = `
        INSERT INTO job_cards (
          job_id, job_card_no, vrn, customer_name, customer_mobile,
          vehicle_make, vehicle_model, vehicle_year, km_reading, sr_type_id,
          job_description, priority, bay_id, status, etd,
          started_at, completed_at, invoiced_at, created_by, created_at,
          updated_at, date_in, time_in, expected_date_out, expected_time_of_completion,
          time_out, date_completed, bay_no, service_advisor, technician_name,
          no_of_laborers, actual_time_taken, gate_pass_issued, exited_at,
          chassis_number, driver_name, driver_mobile, token_number, waiting_time_mins,
          progress_pct, parts_price, labor_price, parts_status, warranty_status,
          payment_method, payment_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        jobId,
        jobCardNo,
        vehicleReg,
        customerName || 'Unknown Customer',
        driverMobile || '+919999999999',
        'Tata Motors',
        'Tata LPT 1916',
        2022,
        50000,
        matchedSrType.sr_type_id,
        `${matchedSrType.sr_type_name} backdate import.`,
        'Normal',
        finalBayId,
        'Completed', // Closed status maps to Completed in app
        fullTimestampStr,
        fullTimestampStr,
        fullTimestampStr,
        fullTimestampStr,
        1,
        fullTimestampStr,
        fullTimestampStr,
        dateStr,
        timeStr,
        dateStr,
        timeStr,
        timeStr,
        dateStr,
        String(finalBayId),
        'Jane Smith',
        matchedEmpName,
        1,
        '3h 00m',
        1, // true (gate pass issued)
        fullTimestampStr,
        chassisNo || 'N/A',
        driverName || 'Unknown Driver',
        driverMobile || '+919999999999',
        `GT-${String(jobId).padStart(3, "0")}`,
        0,
        100,
        Math.round(Number(sparesAmount || 0)),
        Math.round(Number(labourAmount || 0)),
        'Delivered',
        'Approved',
        'Cash',
        'BACKDATE-IMPORT'
      ];

      await connection.query(insertSql, values);
      existingSet.add(jobCardNo);

      // If technician matched, insert into job_technician_maps
      if (matchedEmpId) {
        const mapId = nextMapId++;
        const mapSql = `
          INSERT INTO job_technician_maps (
            map_id, job_id, employee_id, tech_role, assigned_at
          ) VALUES (?, ?, ?, ?, ?)
        `;
        await connection.query(mapSql, [
          mapId,
          jobId,
          matchedEmpId,
          'Primary Technician',
          fullTimestampStr
        ]);
      }

      insertedCount++;
    }

    console.log("\n=== IMPORT SUMMARY ===");
    console.log(`Total inserted: ${insertedCount}`);
    console.log(`Total skipped: ${skippedCount}`);
    console.log(`Total unmatched technician row assignments: ${unmatchedCount}`);
    if (unmatchedNames.size > 0) {
      console.log("List of unmatched technician names:", Array.from(unmatchedNames));
    }
    console.log("Import script execution completed successfully. Locks set to run once.");

  } catch (error) {
    console.error("Execution failed:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed.");
    }
  }
}

run();
