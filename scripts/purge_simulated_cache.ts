import { pool } from "../src/db/index";

async function purge() {
  console.log("=== Checking oem_vehicle_cache for simulated records ===");
  const [rows]: any = await pool.query(
    "SELECT vrn, provider, chassis_no, model, fetched_at FROM oem_vehicle_cache WHERE payload LIKE '%simulated%' OR payload LIKE '%Simulation Engine%'"
  );

  console.log(`Found ${rows.length} simulated rows in oem_vehicle_cache:`, rows.map((r: any) => r.vrn));

  if (rows.length > 0) {
    const [delRes]: any = await pool.query(
      "DELETE FROM oem_vehicle_cache WHERE payload LIKE '%simulated%' OR payload LIKE '%Simulation Engine%'"
    );
    console.log(`✓ Deleted ${delRes.affectedRows} simulated records from oem_vehicle_cache.`);
  }

  const [countRes]: any = await pool.query("SELECT count(*) as total FROM oem_vehicle_cache");
  console.log(`Remaining genuine rows in oem_vehicle_cache: ${countRes[0].total}`);

  process.exit(0);
}

purge().catch(e => {
  console.error(e);
  process.exit(1);
});
