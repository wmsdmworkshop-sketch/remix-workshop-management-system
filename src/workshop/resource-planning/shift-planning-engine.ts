import { Shift } from "./shift-models";

export class ShiftPlanningEngine {
  static assignTechnicianToShift(shift: Shift, technicianId: string, date: string): Shift {
    return {
      ...shift,
      roster: [...shift.roster, { technician_id: technicianId, date }]
    };
  }
}
