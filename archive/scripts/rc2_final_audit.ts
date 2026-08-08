import { pool } from "./src/db/index.ts";

async function runAudit() {
  console.log("Generating RC2 Final Acceptance Report...\n");

  try {
    const [vm]: any = await pool.query('SELECT COUNT(*) as c FROM vehicle_master');
    const [sh]: any = await pool.query('SELECT COUNT(*) as c FROM service_history');
    const [inv]: any = await pool.query('SELECT COUNT(*) as c FROM invoices');
    // In our schema, customer and warranty are derived from vehicle_master or embedded in it/service_history? 
    // Actually wait, let's just count everything.
    
    // Exception counts:
    // Orphan invoices (chassis_no not in vehicle_master)
    const [orphanInv]: any = await pool.query('SELECT COUNT(*) as c FROM invoices WHERE chassis_no NOT IN (SELECT chassis_no FROM vehicle_master)');
    
    // Orphan service history
    const [orphanSh]: any = await pool.query('SELECT COUNT(*) as c FROM service_history WHERE chassis_no NOT IN (SELECT chassis_no FROM vehicle_master)');
    
    console.log("=== COUNTS ===");
    console.log("Vehicle Master:", vm[0].c);
    console.log("Service History:", sh[0].c);
    console.log("Invoices:", inv[0].c);
    console.log("Orphan Invoices:", orphanInv[0].c);
    console.log("Orphan Service History:", orphanSh[0].c);

    // Let's get 20 random vehicles to validate
    const [vehicles]: any = await pool.query('SELECT chassis_no, registration_no FROM vehicle_master ORDER BY RAND() LIMIT 20');
    console.log("\n=== RANDOM VEHICLES ===");
    console.log(JSON.stringify(vehicles, null, 2));
    
  } catch(e: any) {
    console.error("Audit error:", e.message);
  } finally {
    process.exit(0);
  }
}

runAudit();
