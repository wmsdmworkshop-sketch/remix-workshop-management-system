import { Equipment } from "./equipment-models";

export class EquipmentUtilizationEngine {
  static isAvailable(equipment: Equipment): boolean {
    return equipment.availability_status === "AVAILABLE" && !equipment.preventive_maintenance_due;
  }

  static assignEquipment(equipment: Equipment, technicianId: string): Equipment {
    if (!this.isAvailable(equipment)) {
      throw new Error(`Equipment ${equipment.equipment_id} is not available.`);
    }
    return {
      ...equipment,
      availability_status: "IN_USE",
      assigned_technician_id: technicianId
    };
  }

  static releaseEquipment(equipment: Equipment): Equipment {
    return {
      ...equipment,
      availability_status: "AVAILABLE",
      assigned_technician_id: undefined
    };
  }
}
