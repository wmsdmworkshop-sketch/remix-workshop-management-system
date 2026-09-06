import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

// The staged Gate-In -> Reception -> SA Assignment pipeline
// (RealtimeOwnershipPipeline) needs to create a job_card_master row at SA
// Assignment time, before a bay, technician, or ETD have been decided (those
// come later, from the floor supervisor's allocation). The legacy schema
// required bay_id/assigned_to/etd/customer_name up front because the old
// "New Job" form collected everything on one screen. Loosening these to
// nullable lets the new pipeline create the row early and let floor
// allocation fill the rest in — without fabricating placeholder values for
// data that genuinely isn't known yet.
const migration: Migration = {
  version: 16,
  name: "job_card_master_early_creation",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(`
        ALTER TABLE job_card_master
          MODIFY bay_id INT UNSIGNED NULL,
          MODIFY assigned_to INT UNSIGNED NULL,
          MODIFY etd DATETIME NULL,
          MODIFY customer_name VARCHAR(100) NULL
      `);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

export default migration;
