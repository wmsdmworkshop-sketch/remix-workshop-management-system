import { pool as db } from "../../db/index.ts";
import type { VehicleRepair, VehicleAccident, VehiclePartHistory, VehicleModification, VehicleOwnershipHistory, VerificationLevel } from "./types.ts";

export class DetailedHistoryRepository {
  async addRepair(repair: Omit<VehicleRepair, "createdAt">): Promise<void> {
    const formattedDate = new Date(repair.repairDate).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `INSERT INTO vehicle_repairs (
        repair_id, passport_id, event_id, repair_type, severity, description,
        workshop_name, workshop_type, labour_cost, parts_cost, total_cost, verification_level, repair_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        repair.repairId, repair.passportId, repair.eventId, repair.repairType, repair.severity, repair.description,
        repair.workshopName, repair.workshopType, repair.labourCost, repair.partsCost, repair.totalCost,
        repair.verificationLevel, formattedDate
      ]
    );
  }

  async addAccident(accident: Omit<VehicleAccident, "createdAt">): Promise<void> {
    const formattedDate = new Date(accident.accidentDate).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `INSERT INTO vehicle_accidents (
        accident_id, passport_id, event_id, severity, description, insurance_claim_no,
        claim_status, claim_amount, verification_level, accident_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accident.accidentId, accident.passportId, accident.eventId, accident.severity, accident.description,
        accident.insuranceClaimNo || null, accident.claimStatus || null, accident.claimAmount || 0.00,
        accident.verificationLevel, formattedDate
      ]
    );
  }

  async addPart(part: Omit<VehiclePartHistory, "createdAt">): Promise<void> {
    const formattedDate = new Date(part.installedDate).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `INSERT INTO vehicle_parts_history (
        part_id, passport_id, event_id, part_name, part_number, part_type, brand, cost, warranty_months, verification_level, installed_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        part.partId, part.passportId, part.eventId, part.partName, part.partNumber || null, part.partType || null,
        part.brand || null, part.cost, part.warrantyMonths, part.verificationLevel, formattedDate
      ]
    );
  }

  async addModification(mod: Omit<VehicleModification, "createdAt">): Promise<void> {
    const formattedDate = new Date(mod.modificationDate).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `INSERT INTO vehicle_modifications (
        modification_id, passport_id, event_id, modification_type, description, vendor, cost, verification_level, modification_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mod.modificationId, mod.passportId, mod.eventId, mod.modificationType, mod.description, mod.vendor, mod.cost,
        mod.verificationLevel, formattedDate
      ]
    );
  }

  async addOwnership(owner: Omit<VehicleOwnershipHistory, "createdAt">): Promise<void> {
    const formattedDate = new Date(owner.ownershipStart).toISOString().slice(0, 19).replace('T', ' ');
    await db.execute(
      `INSERT INTO vehicle_ownership_history (
        ownership_id, passport_id, owner_name, owner_type, contact, ownership_start, ownership_end, transfer_method, verification_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        owner.ownershipId, owner.passportId, owner.ownerName, owner.ownerType, owner.contact,
        formattedDate, owner.ownershipEnd || null, owner.transferMethod, owner.verificationLevel
      ]
    );
  }

  async getRepairs(passportId: string): Promise<VehicleRepair[]> {
    const [rows] = await db.query("SELECT * FROM vehicle_repairs WHERE passport_id = ? ORDER BY repair_date DESC", [passportId]) as any[];
    return rows ? rows.map(r => ({
      repairId: r.repair_id,
      passportId: r.passport_id,
      eventId: r.event_id,
      repairType: r.repair_type,
      severity: r.severity,
      description: r.description,
      workshopName: r.workshop_name,
      workshopType: r.workshop_type,
      labourCost: Number(r.labour_cost),
      partsCost: Number(r.parts_cost),
      totalCost: Number(r.total_cost),
      verificationLevel: r.verification_level as VerificationLevel,
      repairDate: r.repair_date
    })) : [];
  }

  async getAccidents(passportId: string): Promise<VehicleAccident[]> {
    const [rows] = await db.query("SELECT * FROM vehicle_accidents WHERE passport_id = ? ORDER BY accident_date DESC", [passportId]) as any[];
    return rows ? rows.map(r => ({
      accidentId: r.accident_id,
      passportId: r.passport_id,
      eventId: r.event_id,
      severity: r.severity,
      description: r.description,
      insuranceClaimNo: r.insurance_claim_no,
      claimStatus: r.claim_status,
      claimAmount: Number(r.claim_amount),
      verificationLevel: r.verification_level as VerificationLevel,
      accidentDate: r.accident_date
    })) : [];
  }

  async getParts(passportId: string): Promise<VehiclePartHistory[]> {
    const [rows] = await db.query("SELECT * FROM vehicle_parts_history WHERE passport_id = ? ORDER BY installed_date DESC", [passportId]) as any[];
    return rows ? rows.map(r => ({
      partId: r.part_id,
      passportId: r.passport_id,
      eventId: r.event_id,
      partName: r.part_name,
      partNumber: r.part_number,
      partType: r.part_type,
      brand: r.brand,
      cost: Number(r.cost),
      warrantyMonths: r.warranty_months,
      verificationLevel: r.verification_level as VerificationLevel,
      installedDate: r.installed_date
    })) : [];
  }

  async getModifications(passportId: string): Promise<VehicleModification[]> {
    const [rows] = await db.query("SELECT * FROM vehicle_modifications WHERE passport_id = ? ORDER BY modification_date DESC", [passportId]) as any[];
    return rows ? rows.map(r => ({
      modificationId: r.modification_id,
      passportId: r.passport_id,
      eventId: r.event_id,
      modificationType: r.modification_type,
      description: r.description,
      vendor: r.vendor,
      cost: Number(r.cost),
      verificationLevel: r.verification_level as VerificationLevel,
      modificationDate: r.modification_date
    })) : [];
  }

  async getOwnerships(passportId: string): Promise<VehicleOwnershipHistory[]> {
    const [rows] = await db.query("SELECT * FROM vehicle_ownership_history WHERE passport_id = ? ORDER BY ownership_start DESC", [passportId]) as any[];
    return rows ? rows.map(r => ({
      ownershipId: r.ownership_id,
      passportId: r.passport_id,
      ownerName: r.owner_name,
      ownerType: r.owner_type,
      contact: r.contact,
      ownershipStart: r.ownership_start,
      ownershipEnd: r.ownership_end,
      transferMethod: r.transfer_method,
      verificationLevel: r.verification_level as VerificationLevel
    })) : [];
  }
}
