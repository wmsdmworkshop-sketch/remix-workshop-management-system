import { CapacityPlan } from "./capacity-models";

export class CapacityEngine {
  static generateDailyPlan(workshopId: string, date: string, totalBays: number, workingHours: number): CapacityPlan {
    const dailyCapacity = totalBays * workingHours;
    
    return {
      plan_id: `CAP-${Math.floor(Math.random() * 10000)}`,
      workshop_id: workshopId,
      date,
      daily_capacity_hours: dailyCapacity,
      booked_capacity_hours: 0,
      available_capacity_hours: dailyCapacity
    };
  }

  static bookCapacity(plan: CapacityPlan, hoursBooked: number): CapacityPlan {
    if (plan.available_capacity_hours < hoursBooked) {
      throw new Error("Insufficient capacity");
    }
    return {
      ...plan,
      booked_capacity_hours: plan.booked_capacity_hours + hoursBooked,
      available_capacity_hours: plan.available_capacity_hours - hoursBooked
    };
  }
}
