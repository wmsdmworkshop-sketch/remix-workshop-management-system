import { Workload } from "./workload-models";
import { BayCapacity } from "./bay-capacity-models";
import { TechnicianCapacity } from "./technician-capacity-models";

export class BottleneckEngine {
  static detectBottlenecks(workshopId: string, date: string, bays: BayCapacity, technicians: TechnicianCapacity[]): Workload {
    const bayShortage = bays.available === 0;
    const techShortage = technicians.filter(t => t.attendance === "PRESENT").every(t => t.utilization_percent >= 100);
    
    return {
      workload_id: `WL-${Math.floor(Math.random() * 10000)}`,
      workshop_id: workshopId,
      date,
      bay_shortage: bayShortage,
      technician_shortage: techShortage,
      parts_delay: false, // mock
      equipment_downtime: false, // mock
      approval_delays: false, // mock
      qc_queue: false, // mock
      delivery_queue: false // mock
    };
  }
}
