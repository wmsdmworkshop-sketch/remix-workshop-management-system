import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { KPITrend } from "./analytics-types";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class KPIAggregationEngine {
  constructor(private eventBus: IEventBus) {}

  public async aggregateAndSnapshot(
    kpiId: string,
    calculatedValue: number,
    branchId?: string,
    businessUnit?: string
  ): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
    try {
      const runId = `RUN-${randomUUID().substring(0, 8)}`;
      const snapshotId = `SNAP-${randomUUID().substring(0, 8)}`;

      // 1. Fetch KPI config
      const [catalogs] = await db.execute("SELECT default_target FROM tbl_kpi_catalog WHERE kpi_id = ?", [kpiId]) as any[];
      if (catalogs.length === 0) throw new Error("KPI Catalog entry not found");

      const target = parseFloat(catalogs[0].default_target);
      const variance = calculatedValue - target;

      // 2. Determine Trend based on previous snapshot
      let trend: KPITrend = 'FLAT';
      const [previous] = await db.execute(
        "SELECT kpi_value FROM tbl_kpi_snapshot WHERE kpi_id = ? AND branch_id <=> ? ORDER BY snapshot_time DESC LIMIT 1",
        [kpiId, branchId || null]
      ) as any[];

      if (previous.length > 0) {
        const prevValue = parseFloat(previous[0].kpi_value);
        if (calculatedValue > prevValue) trend = 'UP';
        else if (calculatedValue < prevValue) trend = 'DOWN';
      }

      // 3. Get next version
      let version = 1;
      const [maxVer] = await db.execute(
        "SELECT MAX(version) as max_v FROM tbl_kpi_snapshot WHERE kpi_id = ? AND branch_id <=> ?",
        [kpiId, branchId || null]
      ) as any[];
      if (maxVer.length > 0 && maxVer[0].max_v) {
        version = maxVer[0].max_v + 1;
      }

      // 4. Save Snapshot
      await db.execute(
        "INSERT INTO tbl_kpi_snapshot (snapshot_id, kpi_id, run_id, version, branch_id, business_unit, kpi_value, target, variance, trend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [snapshotId, kpiId, runId, version, branchId || null, businessUnit || null, calculatedValue, target, variance, trend]
      );

      // 5. Fire Domain Event
      const context = makeSystemContext(`KPI-REFRESH-${snapshotId}`);
      await this.eventBus.publish("KPI_REFRESHED", {
        kpiId,
        snapshotId,
        runId,
        version,
        value: calculatedValue
      }, context);

      return { success: true, snapshotId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
