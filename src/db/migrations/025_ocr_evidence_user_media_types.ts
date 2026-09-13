import type { Migration } from "../migrate.ts";
import { pool as db } from "../index.ts";

/**
 * Allow user-attached media types in ocr_evidence.ocr_type.
 *
 * WHY THIS EXISTS
 *
 * Uploading a work photo failed with "Failed to store attachment." The server
 * log gives the real cause:
 *
 *   [EvidenceStorage] Failed to store OCR evidence:
 *   Data truncated for column 'ocr_type' at row 1
 *
 * The column is an ENUM of six OCR kinds:
 *
 *   NUMBERPLATE, INVOICE, MANUAL_JOBCARD, PARTS_PHOTO, FUEL_GAUGE, ODOMETER
 *
 * but evidence-storage.service.ts also declares WORK_PHOTO, VEHICLE_CONDITION
 * and DOCUMENT for user uploads, above a comment asserting "ocr_type is a plain
 * string column, so these need no schema change". It is not a string column,
 * and MySQL rejected every insert carrying one of the three. So the technician's
 * work photos, the advisor's vehicle-condition shots and general documents could
 * never be attached — the upload always failed.
 *
 * WHAT THIS DOES
 *
 * Widens the ENUM to include the three user-media types. Existing values are
 * untouched: adding members to an ENUM does not rewrite or invalidate stored
 * rows, and no row can currently hold one of the new values precisely because
 * they were being rejected.
 *
 * SAFETY
 *
 * Idempotent — it reads the current definition and skips if all three are
 * already present. It refuses rather than guesses if the column is not an ENUM
 * (someone may have already converted it to VARCHAR, in which case nothing is
 * needed and a blind MODIFY would narrow it).
 */
const NEW_TYPES = ["WORK_PHOTO", "VEHICLE_CONDITION", "DOCUMENT"];

const migration: Migration = {
  version: 25,
  name: "ocr_evidence_user_media_types",
  up: async (pool: typeof db) => {
    const connection = await pool.getConnection();
    try {
      const [cols]: any = await connection.query(
        `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = 'ocr_evidence' AND column_name = 'ocr_type'`
      );
      const info = cols?.[0];
      if (!info) {
        throw new Error("REFUSED: ocr_evidence.ocr_type not found.");
      }

      const columnType = String(info.COLUMN_TYPE || "");
      if (!columnType.toLowerCase().startsWith("enum(")) {
        console.log(
          `[Migration v25] ocr_type is ${columnType}, not an ENUM — nothing to widen.`
        );
        return;
      }

      if (NEW_TYPES.every((t) => columnType.includes(`'${t}'`))) {
        console.log("[Migration v25] all user-media types already allowed — skipping.");
        return;
      }

      // Preserve every existing member, in order, and append what is missing.
      const existing = columnType
        .slice(columnType.indexOf("(") + 1, columnType.lastIndexOf(")"))
        .split(",")
        .map((v) => v.trim().replace(/^'|'$/g, ""))
        .filter(Boolean);

      const merged = [...existing];
      for (const t of NEW_TYPES) if (!merged.includes(t)) merged.push(t);

      const nullClause = String(info.IS_NULLABLE).toUpperCase() === "NO" ? "NOT NULL" : "NULL";
      const values = merged.map((v) => `'${v}'`).join(",");

      await connection.execute(
        `ALTER TABLE ocr_evidence MODIFY ocr_type ENUM(${values}) ${nullClause}`
      );
      console.log(
        `[Migration v25] ocr_type widened from ${existing.length} to ${merged.length} ` +
          `values; added ${merged.filter((v) => !existing.includes(v)).join(", ")}.`
      );
    } finally {
      connection.release();
    }
  }
};

export default migration;
