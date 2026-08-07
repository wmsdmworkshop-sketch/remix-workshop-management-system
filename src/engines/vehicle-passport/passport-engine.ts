import { pool as db } from "../../db/index.ts";
import crypto from "crypto";
import type { VehiclePassport, PassportStatus } from "./types.ts";

export class VehiclePassportEngine {
  /**
   * Creates a brand new VehiclePassport master record.
   */
  async createPassport(params: {
    vehicleId: string;
    vin: string;
    engineNo: string;
    registrationNo: string;
    make: string;
    model: string;
    yearOfManufacture: number;
    fuelType: string;
    bodyType: string;
    dealerId: string;
    branchId: string;
  }): Promise<VehiclePassport> {
    const passportId = `VPASS-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newPassport: VehiclePassport = {
      passportId,
      vehicleId: params.vehicleId,
      vin: params.vin,
      engineNo: params.engineNo,
      registrationNo: params.registrationNo,
      make: params.make,
      model: params.model,
      yearOfManufacture: params.yearOfManufacture,
      fuelType: params.fuelType,
      bodyType: params.bodyType,
      passportStatus: "ACTIVE",
      passportScore: 100.00,
      healthScore: 100.00,
      trustScore: 100.00,
      totalEvents: 0,
      verifiedEvents: 0,
      dealerId: params.dealerId,
      branchId: params.branchId,
      createdAt: now,
      updatedAt: now,
    };

    await db.execute(
      `INSERT INTO vehicle_passports (
        passport_id, vehicle_id, vin, engine_no, registration_no, make, model, 
        year_of_manufacture, fuel_type, body_type, passport_status, 
        passport_score, health_score, trust_score, total_events, verified_events, 
        dealer_id, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newPassport.passportId, newPassport.vehicleId, newPassport.vin,
        newPassport.engineNo, newPassport.registrationNo, newPassport.make,
        newPassport.model, newPassport.yearOfManufacture, newPassport.fuelType,
        newPassport.bodyType, newPassport.passportStatus, newPassport.passportScore,
        newPassport.healthScore, newPassport.trustScore, newPassport.totalEvents,
        newPassport.verifiedEvents, newPassport.dealerId, newPassport.branchId
      ]
    );

    return newPassport;
  }

  /**
   * Fetches a passport by master ID.
   */
  async getPassport(passportId: string): Promise<VehiclePassport | null> {
    const [rows] = await db.query(
      "SELECT * FROM vehicle_passports WHERE passport_id = ?",
      [passportId]
    ) as any[];

    if (!rows || rows.length === 0) return null;
    return this.mapRowToPassport(rows[0]);
  }

  /**
   * Lookups a passport by alternative unique fields.
   */
  async lookupPassport(query: { vin?: string; registrationNo?: string; vehicleId?: string }): Promise<VehiclePassport | null> {
    let sql = "SELECT * FROM vehicle_passports WHERE ";
    const params: any[] = [];
    const conditions: string[] = [];

    if (query.vin) {
      conditions.push("vin = ?");
      params.push(query.vin);
    }
    if (query.registrationNo) {
      conditions.push("registration_no = ?");
      params.push(query.registrationNo);
    }
    if (query.vehicleId) {
      conditions.push("vehicle_id = ?");
      params.push(query.vehicleId);
    }

    if (conditions.length === 0) return null;
    sql += conditions.join(" OR ");

    const [rows] = await db.query(sql, params) as any[];
    if (!rows || rows.length === 0) return null;
    return this.mapRowToPassport(rows[0]);
  }

  /**
   * Updates scoring metrics on the master passport.
   */
  async updatePassportScores(
    passportId: string,
    scores: { passportScore: number; healthScore: number; trustScore: number; totalEvents: number; verifiedEvents: number }
  ): Promise<void> {
    await db.execute(
      `UPDATE vehicle_passports 
       SET passport_score = ?, health_score = ?, trust_score = ?, total_events = ?, verified_events = ? 
       WHERE passport_id = ?`,
      [scores.passportScore, scores.healthScore, scores.trustScore, scores.totalEvents, scores.verifiedEvents, passportId]
    );
  }

  /**
   * Helper mapping DB fields to interface object
   */
  private mapRowToPassport(row: any): VehiclePassport {
    return {
      passportId: row.passport_id,
      vehicleId: row.vehicle_id,
      vin: row.vin,
      engineNo: row.engine_no,
      registrationNo: row.registration_no,
      make: row.make,
      model: row.model,
      yearOfManufacture: row.year_of_manufacture,
      fuelType: row.fuel_type,
      bodyType: row.body_type,
      passportStatus: row.passport_status as PassportStatus,
      passportScore: Number(row.passport_score),
      healthScore: Number(row.health_score),
      trustScore: Number(row.trust_score),
      totalEvents: row.total_events,
      verifiedEvents: row.verified_events,
      dealerId: row.dealer_id,
      branchId: row.branch_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
