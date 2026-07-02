/**
 * fix-technician-maps-and-resplit.ts
 * 
 * This script:
 * 1. Reads the CSV to find ALL technicians assigned to each job (columns 10-16)
 * 2. Creates proper job_technician_maps entries for every technician on each job
 * 3. Re-runs the revenue split engine (labor-only) with all assigned technicians
 * 4. Updates allocated_revenue on each employee from the new splits
 * 5. Writes everything to MySQL and local cache
 */

import { db } from "./src/db";
import * as schema from "./src/db/schema";
import { eq } from "drizzle-orm";
import { syncLoad } from "./src/db/sync";
import { calculateRevenueSplit } from "./src/engines/revenue-split-engine";
import { calculateTechnicianKPIs } from "./src/engines/technician-kpi-calculator";
import { checkAndGenerateAlerts } from "./src/engines/productivity-alerts";
import { detectAndCreateRework } from "./src/engines/rework-tracking-service";
import { isTechnicianRole } from "./src/engines/daily-kpi-snapshot-job";
import Fuse from "fuse.js";
import * as fs from "fs";
import * as path from "path";

// CSV Parser (handles quoted fields with commas)
function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
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
      } else if (char === ",") {
        row.push(cell.trim());
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && nextChar === "\n") i++;
        row.push(cell.trim());
        if (row.some(c => c !== "")) lines.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== "")) lines.push(row);
  }
  return lines;
}

async function run() {
  console.log("=== FIX TECHNICIAN MAPS & RE-SPLIT LABOR REVENUE ===\n");

  // 1. Load live database state
  console.log("Step 1: Loading live database state from MySQL...");
  const dbState = await syncLoad();
  console.log(`  Loaded: ${dbState.employees.length} employees, ${dbState.jobCards.length} job cards`);

  // 2. Read CSV
  let csvPath = path.join(process.cwd(), "JC_Backdate_June2026 - Sheet.csv");
  if (!fs.existsSync(csvPath)) {
    csvPath = path.join(process.cwd(), "JC_Backdate_June2026.csv");
  }
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found!");
    process.exit(1);
  }
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const csvRows = parseCSV(csvContent);
  console.log(`  CSV rows (including header): ${csvRows.length}`);

  // 3. Build employee fuzzy matcher
  const empList = dbState.employees.map((e: any) => ({
    id: e.employee_id,
    name: e.full_name,
  }));
  const fuse = new Fuse(empList, {
    keys: ["name"],
    includeScore: true,
    threshold: 0.4,
  });

  function matchEmployee(name: string): number | null {
    if (!name || name.trim() === "") return null;
    const cleanName = name.trim().toUpperCase();
    
    // Direct exact match first
    const exact = empList.find(
      (e: any) => e.name.toUpperCase() === cleanName
    );
    if (exact) return exact.id;

    // Fuzzy match
    const results = fuse.search(name);
    if (results.length > 0 && results[0].score! <= 0.4) {
      return results[0].item.id;
    }
    return null;
  }

  // 4. Parse CSV and build a map: jobCardNo -> [employee_ids with tech_roles]
  //    CSV columns: 10=MECH, 11=TEC, 12=ELE, 13=TEC2, 14=ELE2, 15=ADD_TECH, 16=ADD_ELEC
  const TECH_COLS = [
    { idx: 10, role: "Primary Technician" },   // MECH
    { idx: 11, role: "Co-Technician" },         // TEC
    { idx: 12, role: "Electrician" },           // ELE
    { idx: 13, role: "Co-Technician" },         // TEC2
    { idx: 14, role: "Electrician" },           // ELE2
    { idx: 15, role: "Add Tech" },              // ADDITIONAL TECH
    { idx: 16, role: "Add Tech" },              // ADDITIONAL ELEC
  ];

  const jobTechMap: Map<string, { empId: number; role: string }[]> = new Map();
  const unmatchedNames = new Set<string>();

  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    const jcNo = row[2]?.trim();
    if (!jcNo) continue;

    const techs: { empId: number; role: string }[] = [];
    const seenEmpIds = new Set<number>();

    for (const col of TECH_COLS) {
      const techName = row[col.idx]?.trim();
      if (!techName || techName === "") continue;

      const empId = matchEmployee(techName);
      if (empId && !seenEmpIds.has(empId)) {
        seenEmpIds.add(empId);
        techs.push({ empId, role: col.role });
      } else if (!empId) {
        unmatchedNames.add(techName);
      }
    }

    if (techs.length > 0) {
      jobTechMap.set(jcNo, techs);
    }
  }

  console.log(`\n  Parsed ${jobTechMap.size} jobs with technician assignments from CSV`);
  if (unmatchedNames.size > 0) {
    console.log(`  Unmatched technician names: ${Array.from(unmatchedNames).join(", ")}`);
  }

  // 5. Clear existing job_technician_maps and rebuild from CSV
  console.log("\nStep 2: Rebuilding job_technician_maps from CSV data...");
  await db.delete(schema.jobTechnicianMaps);

  let nextMapId = 1;
  const newMaps: any[] = [];

  for (const [jcNo, techs] of jobTechMap.entries()) {
    // Find job_id from job_card_no
    const job = dbState.jobCards.find((j: any) => j.job_card_no === jcNo);
    if (!job) continue;

    for (const tech of techs) {
      const mapEntry = {
        map_id: nextMapId++,
        job_id: job.job_id,
        employee_id: tech.empId,
        tech_role: tech.role,
        assigned_at: job.created_at || job.date_in || new Date().toISOString(),
      };
      newMaps.push(mapEntry);
    }
  }

  // Batch insert new maps
  for (let i = 0; i < newMaps.length; i += 100) {
    await db.insert(schema.jobTechnicianMaps).values(newMaps.slice(i, i + 100));
  }
  dbState.jobTechnicianMaps = newMaps;
  console.log(`  Created ${newMaps.length} technician map entries across ${jobTechMap.size} jobs`);

  // 6. Re-run revenue splits with all assigned technicians (LABOR ONLY)
  console.log("\nStep 3: Re-calculating LABOR-ONLY revenue splits...");
  dbState.jobRevenueSplits = [];

  let nextSplitId = 1;
  let processedCount = 0;

  for (const job of dbState.jobCards) {
    const maps = newMaps.filter((m: any) => m.job_id === job.job_id);
    if (maps.length === 0) continue;

    const assignedTo = maps.map((m: any) => m.employee_id);
    const laborVal = Number(job.labor_price || 0);
    const partsVal = Number(job.parts_price || 0);

    // Revenue split engine already only splits laborVal, not partsVal
    const { splits } = calculateRevenueSplit(job.job_id, assignedTo, laborVal, partsVal, dbState);
    splits.forEach((s: any) => {
      dbState.jobRevenueSplits.push({
        id: nextSplitId++,
        ...s,
        created_at: job.completed_at || job.created_at || s.created_at,
      });
    });
    processedCount++;
  }
  console.log(`  Generated ${dbState.jobRevenueSplits.length} revenue split records across ${processedCount} jobs`);

  // 7. Calculate allocated_revenue per employee from splits
  console.log("\nStep 4: Calculating allocated_revenue per employee from labor splits...");
  const empRevenue: Record<number, number> = {};
  dbState.jobRevenueSplits.forEach((s: any) => {
    empRevenue[s.employee_id] = (empRevenue[s.employee_id] || 0) + Number(s.allocated_amount || 0);
  });

  // Update employee records
  for (const emp of dbState.employees) {
    const newRev = Math.round((empRevenue[emp.employee_id] || 0) * 100) / 100;
    emp.allocated_revenue = newRev;
    
    // Also update MySQL
    await db.update(schema.employees)
      .set({ allocated_revenue: Math.round(newRev) })
      .where(eq(schema.employees.employee_id, emp.employee_id));
  }

  // Print results sorted by allocated_revenue descending
  const sortedEmps = [...dbState.employees]
    .filter((e: any) => (e.allocated_revenue || 0) > 0 || (e.target_revenue || 0) > 0)
    .sort((a: any, b: any) => (b.allocated_revenue || 0) - (a.allocated_revenue || 0));

  console.log("\n  Employee Productivity Summary (Labor-Only Allocation):");
  console.log("  " + "-".repeat(80));
  console.log("  " + "Employee Name".padEnd(30) + "Role".padEnd(22) + "Allocated".padStart(12) + "Target".padStart(12) + "% to Target".padStart(12));
  console.log("  " + "-".repeat(80));
  for (const emp of sortedEmps) {
    const rev = emp.allocated_revenue || 0;
    const target = emp.target_revenue || 0;
    const pct = target > 0 ? ((rev / target) * 100).toFixed(2) + "%" : "N/A";
    console.log(
      "  " +
      emp.full_name.padEnd(30) +
      (emp.role || "").padEnd(22) +
      `₹${rev.toLocaleString()}`.padStart(12) +
      `₹${target.toLocaleString()}`.padStart(12) +
      pct.padStart(12)
    );
  }

  // 8. Re-run rework detection, KPI snapshots, and alerts
  console.log("\nStep 5: Re-running rework detection...");
  dbState.reworkTrackings = [];
  const backdateStart = new Date("2026-06-01T00:00:00.000Z");
  const backdateEnd = new Date("2026-06-27T23:59:59.999Z");

  const sortedAllJobs = [...(dbState.jobCards || [])].sort((a: any, b: any) => {
    const dateA = new Date(a.created_at || a.date_in || 0).getTime();
    const dateB = new Date(b.created_at || b.date_in || 0).getTime();
    return dateA - dateB;
  });

  sortedAllJobs.forEach((job: any) => {
    const jobDate = new Date(job.created_at || job.date_in || 0);
    if (jobDate >= backdateStart && jobDate <= backdateEnd) {
      detectAndCreateRework(job, dbState);
    }
  });
  console.log(`  Generated ${dbState.reworkTrackings.length} rework records`);

  console.log("\nStep 6: Re-calculating daily KPI snapshots...");
  dbState.technicianKpiDailies = [];
  dbState.productivityAlerts = [];

  const technicians = (dbState.employees || []).filter(
    (e: any) => e.is_active && isTechnicianRole(e.role)
  );
  console.log(`  Processing ${technicians.length} active technicians`);

  let nextKpiId = 1;
  let nextAlertId = 1;

  for (let day = 1; day <= 27; day++) {
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `2026-06-${dayStr}`;

    technicians.forEach((tech: any) => {
      const kpi = calculateTechnicianKPIs(tech.employee_id, dateStr, dbState);
      dbState.technicianKpiDailies.push({ id: nextKpiId++, ...kpi });

      const triggeredAlerts = checkAndGenerateAlerts(kpi, dbState);
      triggeredAlerts.forEach((alert: any) => {
        dbState.productivityAlerts.push({
          id: nextAlertId++,
          ...alert,
          created_at: dateStr + "T18:00:00.000Z",
        });
      });
    });
  }
  console.log(`  Generated ${dbState.technicianKpiDailies.length} KPI snapshots`);
  console.log(`  Generated ${dbState.productivityAlerts.length} productivity alerts`);

  // 9. Write everything to MySQL
  console.log("\nStep 7: Writing all data to MySQL...");

  // Job revenue splits
  await db.delete(schema.jobRevenueSplit);
  const splitRecords = dbState.jobRevenueSplits.map((row: any) => ({
    id: row.id,
    job_id: row.job_id,
    employee_id: row.employee_id,
    allocated_amount: String(row.allocated_amount),
    percentage: String(row.percentage),
    created_at: row.created_at ? new Date(row.created_at) : undefined,
  }));
  for (let i = 0; i < splitRecords.length; i += 100) {
    await db.insert(schema.jobRevenueSplit).values(splitRecords.slice(i, i + 100));
  }

  // Rework trackings
  await db.delete(schema.reworkTracking);
  if (dbState.reworkTrackings.length > 0) {
    const reworks = dbState.reworkTrackings.map((row: any) => ({
      ...row,
      rework_revenue: String(row.rework_revenue),
      original_closure_date: row.original_closure_date ? new Date(row.original_closure_date) : undefined,
      rework_date: row.rework_date ? new Date(row.rework_date) : undefined,
      created_at: row.created_at ? new Date(row.created_at) : undefined,
    }));
    for (let i = 0; i < reworks.length; i += 100) {
      await db.insert(schema.reworkTracking).values(reworks.slice(i, i + 100));
    }
  }

  // KPI dailies
  await db.delete(schema.technicianKpiDaily);
  const kpiRecords = dbState.technicianKpiDailies.map((row: any) => ({
    ...row,
    revenue_earned: String(row.revenue_earned),
    completion_efficiency: String(row.completion_efficiency),
    utilization_percent: String(row.utilization_percent),
    rework_percent: String(row.rework_percent),
    tml_claim_rate: String(row.tml_claim_rate),
    avg_revenue_per_job: String(row.avg_revenue_per_job),
    on_time_completion: String(row.on_time_completion),
    quality_score: String(row.quality_score),
    overtime_hours: String(row.overtime_hours),
    created_at: row.created_at ? new Date(row.created_at) : undefined,
  }));
  for (let i = 0; i < kpiRecords.length; i += 100) {
    await db.insert(schema.technicianKpiDaily).values(kpiRecords.slice(i, i + 100));
  }

  // Productivity alerts
  await db.delete(schema.productivityAlerts);
  if (dbState.productivityAlerts.length > 0) {
    const alertRecords = dbState.productivityAlerts.map((row: any) => ({
      ...row,
      trigger_value: String(row.trigger_value),
      threshold_value: String(row.threshold_value),
      created_at: row.created_at ? new Date(row.created_at) : undefined,
      resolved_at: row.resolved_at ? new Date(row.resolved_at) : null,
    }));
    for (let i = 0; i < alertRecords.length; i += 100) {
      await db.insert(schema.productivityAlerts).values(alertRecords.slice(i, i + 100));
    }
  }

  // 10. Save local cache
  console.log("\nStep 8: Updating local cache workshop_db.json...");
  const DATA_FILE = path.join(process.cwd(), "workshop_db.json");
  fs.writeFileSync(DATA_FILE, JSON.stringify(dbState, null, 2), "utf8");

  console.log("\n=========================================");
  console.log("✅ FIX COMPLETE!");
  console.log("=========================================");
  console.log(`* Technician map entries: ${newMaps.length}`);
  console.log(`* Revenue split records (labor-only): ${dbState.jobRevenueSplits.length}`);
  console.log(`* Rework records: ${dbState.reworkTrackings.length}`);
  console.log(`* KPI snapshots: ${dbState.technicianKpiDailies.length}`);
  console.log(`* Alerts generated: ${dbState.productivityAlerts.length}`);
  console.log("=========================================");

  process.exit(0);
}

run();
