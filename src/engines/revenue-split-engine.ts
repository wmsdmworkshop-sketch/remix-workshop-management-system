import { JobRevenueSplit, Employee, JobTechnicianMap } from "../types";

export function getRoleCategory(role: string): 'Mechanic' | 'Technician' | 'Electrician' | 'Additional Tech' {
  const r = (role || "").toLowerCase();
  if (r.includes("mechanic") || r.includes("mech")) return "Mechanic";
  if (r.includes("electrician") || r.includes("elec")) return "Electrician";
  if (r.includes("technician") || r.includes("tech")) return "Technician";
  return "Additional Tech";
}

export function calculateRevenueSplit(
  jobId: number,
  assignedTo: number[], // Array of employee IDs
  laborAmount: number,
  sparesAmount: number,
  dbCache: any
): {
  splits: Omit<JobRevenueSplit, 'id'>[];
  carryForwardPct: number;
  carryForwardAmount: number;
} {
  const totalRevenue = laborAmount + sparesAmount;
  const numTechs = assignedTo.length;

  if (numTechs === 0) {
    return { splits: [], carryForwardPct: 100, carryForwardAmount: totalRevenue };
  }

  // Fetch employee details
  const techsEnriched = assignedTo.map(empId => {
    const emp = dbCache.employees.find((e: Employee) => e.employee_id === empId);
    return {
      employee_id: empId,
      role: emp?.role || "Technician",
      category: getRoleCategory(emp?.role || "Technician")
    };
  });

  // Slot definitions
  const slots: { category: 'Mechanic' | 'Technician' | 'Electrician' | 'Additional Tech'; weight: number }[] = [
    { category: 'Mechanic', weight: 30 },
    { category: 'Technician', weight: 30 },
    { category: 'Electrician', weight: 20 },
    { category: 'Additional Tech', weight: 20 }
  ];

  const resultSplits: { employee_id: number; percentage: number; allocated_amount: number }[] = [];
  let carryForwardPct = 0;

  if (numTechs === 1) {
    // Scenario A: Single technician job -> 100% to that technician
    resultSplits.push({
      employee_id: techsEnriched[0].employee_id,
      percentage: 100,
      allocated_amount: laborAmount
    });
    carryForwardPct = 0;
  } else if (numTechs === 2) {
    // Scenario B: Two technicians job
    const categoryOrder = ['Mechanic', 'Technician', 'Electrician', 'Additional Tech'];
    const sortedTechs = [...techsEnriched].sort((a, b) => {
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });

    if (sortedTechs[0].category !== sortedTechs[1].category) {
      const w0 = slots.find(s => s.category === sortedTechs[0].category)?.weight || 30;
      const w1 = slots.find(s => s.category === sortedTechs[1].category)?.weight || 20;
      
      resultSplits.push({
        employee_id: sortedTechs[0].employee_id,
        percentage: w0,
        allocated_amount: Math.round((laborAmount * w0 / 100) * 100) / 100
      });
      resultSplits.push({
        employee_id: sortedTechs[1].employee_id,
        percentage: w1,
        allocated_amount: Math.round((laborAmount * w1 / 100) * 100) / 100
      });
      carryForwardPct = 100 - (w0 + w1);
    } else {
      const w0 = 30; // Mechanic
      const w1 = 30; // Technician
      resultSplits.push({
        employee_id: sortedTechs[0].employee_id,
        percentage: w0,
        allocated_amount: Math.round((laborAmount * w0 / 100) * 100) / 100
      });
      resultSplits.push({
        employee_id: sortedTechs[1].employee_id,
        percentage: w1,
        allocated_amount: Math.round((laborAmount * w1 / 100) * 100) / 100
      });
      carryForwardPct = 100 - (w0 + w1);
    }
  } else if (numTechs === 3) {
    const slotFilled = [false, false, false, false];
    const unmatchedTechs: typeof techsEnriched = [];

    techsEnriched.forEach(tech => {
      const slotIndex = slots.findIndex((s, idx) => s.category === tech.category && !slotFilled[idx]);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      } else {
        unmatchedTechs.push(tech);
      }
    });

    unmatchedTechs.forEach(tech => {
      const slotIndex = slotFilled.findIndex(filled => !filled);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      }
    });

    const allocatedPct = resultSplits.reduce((sum, r) => sum + r.percentage, 0);
    carryForwardPct = 100 - allocatedPct;
  } else if (numTechs === 4) {
    const slotFilled = [false, false, false, false];
    const unmatchedTechs: typeof techsEnriched = [];

    techsEnriched.forEach(tech => {
      const slotIndex = slots.findIndex((s, idx) => s.category === tech.category && !slotFilled[idx]);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      } else {
        unmatchedTechs.push(tech);
      }
    });

    unmatchedTechs.forEach(tech => {
      const slotIndex = slotFilled.findIndex(filled => !filled);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      }
    });

    carryForwardPct = 0;
  } else {
    const first4 = techsEnriched.slice(0, 4);
    const remaining = techsEnriched.slice(4);

    const slotFilled = [false, false, false, false];
    const unmatchedTechs: typeof techsEnriched = [];

    first4.forEach(tech => {
      const slotIndex = slots.findIndex((s, idx) => s.category === tech.category && !slotFilled[idx]);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      } else {
        unmatchedTechs.push(tech);
      }
    });

    unmatchedTechs.forEach(tech => {
      const slotIndex = slotFilled.findIndex(filled => !filled);
      if (slotIndex !== -1) {
        slotFilled[slotIndex] = true;
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: slots[slotIndex].weight,
          allocated_amount: Math.round((laborAmount * slots[slotIndex].weight / 100) * 100) / 100
        });
      }
    });

    const allocatedPct = resultSplits.reduce((sum, r) => sum + r.percentage, 0);
    const unallocatedPct = 100 - allocatedPct;

    if (unallocatedPct > 0 && remaining.length > 0) {
      const sharePct = unallocatedPct / remaining.length;
      remaining.forEach(tech => {
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: Math.round(sharePct * 100) / 100,
          allocated_amount: Math.round((laborAmount * sharePct / 100) * 100) / 100
        });
      });
      carryForwardPct = 0;
    } else {
      remaining.forEach(tech => {
        resultSplits.push({
          employee_id: tech.employee_id,
          percentage: 0,
          allocated_amount: 0
        });
      });
      carryForwardPct = unallocatedPct;
    }
  }

  const finalSplits = resultSplits.map(s => ({
    job_id: jobId,
    employee_id: s.employee_id,
    allocated_amount: s.allocated_amount,
    percentage: s.percentage,
    created_at: new Date().toISOString()
  }));

  const carryForwardAmount = Math.round((laborAmount * carryForwardPct / 100) * 100) / 100;

  return {
    splits: finalSplits,
    carryForwardPct,
    carryForwardAmount
  };
}
