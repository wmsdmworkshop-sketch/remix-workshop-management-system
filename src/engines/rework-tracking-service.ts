import { JobCard, JobTechnicianMap, ReworkTracking, Employee } from "../types";

export function detectAndCreateRework(
  newJob: JobCard,
  dbCache: any
): ReworkTracking | null {
  const vrn = newJob.vrn;
  if (!vrn) return null;

  dbCache.jobCards = dbCache.jobCards || [];
  dbCache.jobTechnicianMaps = dbCache.jobTechnicianMaps || [];
  dbCache.reworkTrackings = dbCache.reworkTrackings || [];

  // Find completed/invoiced jobs for this VRN in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const originalJobs = dbCache.jobCards.filter((j: JobCard) => {
    // Must be same VRN, not the same job ID, and must be completed/invoiced
    if (j.vrn.toLowerCase().trim() !== vrn.toLowerCase().trim() || j.job_id === newJob.job_id) {
      return false;
    }
    if (!["Completed", "Invoiced"].includes(j.status)) {
      return false;
    }
    const closureDateStr = j.completed_at || j.date_completed || j.invoiced_at;
    if (!closureDateStr) return false;

    const closureDate = new Date(closureDateStr);
    return closureDate >= sevenDaysAgo && closureDate <= new Date();
  });

  if (originalJobs.length === 0) {
    return null; // No original job within 7 days
  }

  // Use the most recent completed job
  const sortedJobs = [...originalJobs].sort((a, b) => {
    const dateA = new Date(a.completed_at || a.date_completed || a.invoiced_at || 0).getTime();
    const dateB = new Date(b.completed_at || b.date_completed || b.invoiced_at || 0).getTime();
    return dateB - dateA;
  });

  const originalJob = sortedJobs[0];

  // Find the primary technician assigned to the original job
  const originalMaps = dbCache.jobTechnicianMaps.filter(
    (m: JobTechnicianMap) => m.job_id === originalJob.job_id
  );
  
  // Find primary technician, or co-technician, or any technician if none specified
  const primaryMap =
    originalMaps.find((m: JobTechnicianMap) => m.tech_role === "Primary Technician") ||
    originalMaps.find((m: JobTechnicianMap) => m.tech_role === "Co-Technician") ||
    originalMaps[0];

  const assignedTechId = primaryMap ? primaryMap.employee_id : 1; // fallback to employee_id 1 (supervisor / admin)

  const originalClosureDateStr = originalJob.completed_at || originalJob.date_completed || originalJob.invoiced_at || new Date().toISOString();
  const originalClosureDate = new Date(originalClosureDateStr);
  const reworkDate = new Date(newJob.created_at || new Date());

  const diffTime = Math.abs(reworkDate.getTime() - originalClosureDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const nextId = dbCache.reworkTrackings.reduce(
    (max: number, r: ReworkTracking) => Math.max(max, r.id),
    0
  ) + 1;

  const reworkRecord: ReworkTracking = {
    id: nextId,
    original_job_id: originalJob.job_id,
    rework_job_id: newJob.job_id,
    vehicle_reg: vrn,
    assigned_technician_id: assignedTechId,
    original_closure_date: originalClosureDateStr,
    rework_date: newJob.created_at || new Date().toISOString(),
    days_since_original: diffDays,
    original_issue: originalJob.job_description || "N/A",
    rework_reason: newJob.job_description || "N/A",
    rework_completed: ["Completed", "Invoiced"].includes(newJob.status),
    rework_revenue: Number(newJob.labor_price || 0) + Number(newJob.parts_price || 0)
  };

  // Add to dbCache
  dbCache.reworkTrackings.push(reworkRecord);

  return reworkRecord;
}

export function getReworkHistoryForTechnician(
  employeeId: number,
  dbCache: any
): {
  reworkHistory: ReworkTracking[];
  reworkPercent: number;
} {
  const reworks = (dbCache.reworkTrackings || []).filter(
    (r: ReworkTracking) => r.assigned_technician_id === employeeId
  );

  // Calculate Rework % = (Rework jobs / Total jobs assigned) * 100
  const maps = (dbCache.jobTechnicianMaps || []).filter(
    (m: JobTechnicianMap) => m.employee_id === employeeId
  );
  const totalAssigned = maps.length;

  const reworkPercent = totalAssigned > 0 ? Math.round((reworks.length / totalAssigned) * 100 * 100) / 100 : 0;

  return {
    reworkHistory: reworks,
    reworkPercent
  };
}
