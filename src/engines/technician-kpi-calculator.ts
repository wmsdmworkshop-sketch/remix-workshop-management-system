import { Employee, JobCard, JobTechnicianMap, JobRevenueSplit, SRType, TechnicianKPIDaily } from "../types";

function safeGetDateOnly(val: any): string {
  if (!val) return "";
  if (val instanceof Date) {
    try {
      return val.toISOString().split("T")[0];
    } catch {
      return "";
    }
  }
  if (typeof val === "string") {
    return val.split("T")[0];
  }
  try {
    const s = String(val);
    if (s.includes("T")) return s.split("T")[0];
    return s;
  } catch {
    return "";
  }
}

// Helper to parse duration like "2h 30m" to minutes
export function parseDurationToMins(durationStr: string | null | undefined): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/i);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const mins = parseInt(match[2] || "0", 10);
  return hours * 60 + mins;
}

// Overlap helper for time ranges
function getOverlapMins(
  jobStart: Date,
  jobEnd: Date,
  slotStartStr: string, // e.g., "08:00"
  slotEndStr: string,   // e.g., "12:00"
  dateStr: string       // e.g., "2026-06-28"
): number {
  const sStart = new Date(`${dateStr}T${slotStartStr}:00`);
  const sEnd = new Date(`${dateStr}T${slotEndStr}:00`);

  const startMax = jobStart.getTime() > sStart.getTime() ? jobStart : sStart;
  const endMin = jobEnd.getTime() < sEnd.getTime() ? jobEnd : sEnd;

  const diffMs = endMin.getTime() - startMax.getTime();
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
}

export function calculateTechnicianKPIs(
  employeeId: number,
  kpiDate: string, // Format: "YYYY-MM-DD"
  dbCache: any
): Omit<TechnicianKPIDaily, 'id'> {
  // Find all maps for this technician
  const techMaps = (dbCache.jobTechnicianMaps || []).filter(
    (m: JobTechnicianMap) => m.employee_id === employeeId
  );

  const jobIdsAssigned = techMaps.map((m: JobTechnicianMap) => m.job_id);

  // Fetch jobs assigned to this technician
  const techJobs = (dbCache.jobCards || []).filter((j: JobCard) =>
    jobIdsAssigned.includes(j.job_id)
  );

  // 1. Total Jobs Assigned (Today)
  // Jobs created or assigned today
  const assignedTodayJobs = techJobs.filter((j: JobCard) => {
    const jobDate = safeGetDateOnly(j.created_at);
    const map = techMaps.find((m: JobTechnicianMap) => m.job_id === j.job_id);
    const assignedDate = map ? safeGetDateOnly(map.assigned_at) : "";
    return jobDate === kpiDate || assignedDate === kpiDate;
  });
  const jobsAssigned = assignedTodayJobs.length;

  // 2. Total Jobs Completed (Today)
  const completedTodayJobs = techJobs.filter((j: JobCard) => {
    const isCompleted = j.status === "Completed" || j.status === "Invoiced";
    const compDate = safeGetDateOnly(j.completed_at);
    const compDateIn = j.date_completed || "";
    return isCompleted && (compDate === kpiDate || compDateIn === kpiDate);
  });
  const jobsCompleted = completedTodayJobs.length;

  // 3. Total Jobs Open (Today)
  // Jobs assigned today or previously that remain open (not completed/invoiced/cancelled)
  const openTodayJobs = techJobs.filter((j: JobCard) => {
    const isOpen = !["Completed", "Invoiced", "Cancelled"].includes(j.status);
    const createdDate = safeGetDateOnly(j.created_at);
    return isOpen && createdDate <= kpiDate;
  });
  const jobsOpen = openTodayJobs.length;

  // 4. Total Revenue Earned (Today)
  // Sum allocated amount from jobRevenueSplits created today
  const splitsToday = (dbCache.jobRevenueSplits || []).filter((s: JobRevenueSplit) => {
    const splitDate = safeGetDateOnly(s.created_at);
    return s.employee_id === employeeId && splitDate === kpiDate;
  });
  const revenueEarned = splitsToday.reduce((sum: number, s: JobRevenueSplit) => sum + Number(s.allocated_amount || 0), 0);

  // 5. Average Job Duration (mins)
  let totalDurationMins = 0;
  let durationCount = 0;

  completedTodayJobs.forEach((j: JobCard) => {
    let duration = 0;
    if (j.started_at && j.completed_at) {
      duration = Math.floor((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / (1000 * 60));
    }
    if (duration <= 0 && j.actual_time_taken) {
      duration = parseDurationToMins(j.actual_time_taken);
    }
    if (duration <= 0) {
      const sr = (dbCache.srTypes || []).find((s: SRType) => s.sr_type_id === j.sr_type_id);
      duration = sr?.default_duration_mins || 60;
    }
    totalDurationMins += duration;
    durationCount++;
  });

  const avgJobDuration = durationCount > 0 ? Math.round(totalDurationMins / durationCount) : 0;

  // 6. Job Completion Efficiency %
  const completionEfficiency = jobsAssigned > 0 ? Math.round((jobsCompleted / jobsAssigned) * 100 * 100) / 100 : 100;

  // 7. Utilization % = (Total job hours / 10 hrs) * 100
  // Sum up actual working time of all jobs worked on today (assigned today or completed today)
  let workingMinutesToday = 0;
  const workedJobs = Array.from(new Set([...assignedTodayJobs, ...completedTodayJobs]));

  workedJobs.forEach((j: JobCard) => {
    const start = j.started_at ? new Date(j.started_at) : (j.created_at ? new Date(j.created_at) : new Date(`${kpiDate}T08:00:00`));
    const end = j.completed_at ? new Date(j.completed_at) : new Date(`${kpiDate}T18:00:00`);
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    workingMinutesToday += duration > 0 ? duration : 60; // fallback to 60 mins if negative
  });

  const utilizationPercent = Math.round((workingMinutesToday / 600) * 100 * 100) / 100;

  // 8. Rework Count (Today)
  const reworksToday = (dbCache.reworkTrackings || []).filter((r: any) => {
    const rDate = safeGetDateOnly(r.rework_date);
    return r.assigned_technician_id === employeeId && rDate === kpiDate;
  });
  const reworkCount = reworksToday.length;

  // 9. Rework % = (Rework jobs / Total jobs assigned) * 100
  const reworkPercent = jobsAssigned > 0 ? Math.round((reworkCount / jobsAssigned) * 100 * 100) / 100 : 0;

  // 10. TML Warranty Claims (Today)
  const tmlTodayJobs = completedTodayJobs.filter(
    (j: JobCard) => j.warranty_status === "Approved"
  );
  const tmlClaims = tmlTodayJobs.length;

  // 11. TML Claim Rate % = (TML claims / Total jobs) * 100
  const tmlClaimRate = jobsAssigned > 0 ? Math.round((tmlClaims / jobsAssigned) * 100 * 100) / 100 : 0;

  // 12. Average Revenue Per Job = Total earned / Jobs completed
  const avgRevenuePerJob = jobsCompleted > 0 ? Math.round((revenueEarned / jobsCompleted) * 100) / 100 : 0;

  // 13. On-Time Completion %
  let onTimeCount = 0;
  completedTodayJobs.forEach((j: JobCard) => {
    if (j.completed_at && j.etd) {
      if (new Date(j.completed_at).getTime() <= new Date(j.etd).getTime()) {
        onTimeCount++;
      }
    } else {
      onTimeCount++; // assume on-time if etd or completed_at not set properly
    }
  });
  const onTimeCompletion = jobsCompleted > 0 ? Math.round((onTimeCount / jobsCompleted) * 100 * 100) / 100 : 100;

  // 14. Quality Score % = 100 - (Rework % * 2)
  const qualityScore = Math.max(0, Math.round((100 - reworkPercent * 2) * 100) / 100);

  // 15. Customer Satisfaction % - From feedback if available, otherwise default to 90%
  const customerSatisfaction = 90.00;

  // 16. Parts Used Count
  let partsUsedCount = 0;
  workedJobs.forEach((j: JobCard) => {
    if (j.parts_list) {
      if (j.parts_list.trim().startsWith("[")) {
        try {
          const list = JSON.parse(j.parts_list);
          partsUsedCount += Array.isArray(list) ? list.length : 1;
        } catch {
          partsUsedCount += j.parts_list.split(",").filter(Boolean).length;
        }
      } else {
        partsUsedCount += j.parts_list.split(",").filter(Boolean).length;
      }
    }
  });

  // 17. Spares Amount Total
  const sparesAmountTotal = workedJobs.reduce((sum: number, j: JobCard) => sum + (j.parts_price || 0), 0);

  // 18. Labour Amount Total = sum of splits today
  const laborAmountTotal = revenueEarned;

  // 19. Peak Hour Utilization (8-12, 12-3, 3-6)
  // Let's compute actual overlap minutes for each slot
  let slot1Mins = 0;
  let slot2Mins = 0;
  let slot3Mins = 0;

  workedJobs.forEach((j: JobCard) => {
    const start = j.started_at ? new Date(j.started_at) : (j.created_at ? new Date(j.created_at) : new Date(`${kpiDate}T08:00:00`));
    const end = j.completed_at ? new Date(j.completed_at) : new Date(`${kpiDate}T18:00:00`);

    slot1Mins += getOverlapMins(start, end, "08:00", "12:00", kpiDate);
    slot2Mins += getOverlapMins(start, end, "12:00", "15:00", kpiDate);
    slot3Mins += getOverlapMins(start, end, "15:00", "18:00", kpiDate);
  });

  // Convert to utilization percentages (capped at 100)
  const peak1Util = Math.min(100, Math.round((slot1Mins / 240) * 100 * 100) / 100);
  const peak2Util = Math.min(100, Math.round((slot2Mins / 180) * 100 * 100) / 100);
  const peak3Util = Math.min(100, Math.round((slot3Mins / 180) * 100 * 100) / 100);

  // 20. Idle Time (mins)
  const breakTime = 60; // 21. Break Time (mins)
  const totalShiftMins = 600; // 10 hours
  const activeMins = Math.min(totalShiftMins - breakTime, workingMinutesToday);
  const idleTime = Math.max(0, totalShiftMins - breakTime - activeMins);

  // 22. Overtime Hours (if any)
  const overtimeHours = workingMinutesToday > totalShiftMins ? Math.round(((workingMinutesToday - totalShiftMins) / 60) * 100) / 100 : 0;

  // COLOR CODING / HEALTH STATUS
  // Check conditions
  let health_status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';

  // RED conditions
  if (
    completionEfficiency < 70 ||
    utilizationPercent < 65 ||
    qualityScore < 75 ||
    tmlClaimRate < 3 ||
    jobsCompleted < 5
  ) {
    health_status = 'RED';
  }
  // AMBER conditions (if not already RED)
  else if (
    (completionEfficiency >= 70 && completionEfficiency <= 85) ||
    (utilizationPercent >= 65 && utilizationPercent <= 80) ||
    (qualityScore >= 75 && qualityScore <= 90) ||
    (tmlClaimRate >= 3 && tmlClaimRate <= 5) ||
    (jobsCompleted >= 5 && jobsCompleted <= 8)
  ) {
    health_status = 'AMBER';
  }

  return {
    employee_id: employeeId,
    kpi_date: kpiDate,
    jobs_assigned: jobsAssigned,
    jobs_completed: jobsCompleted,
    jobs_open: jobsOpen,
    revenue_earned: revenueEarned,
    avg_job_duration: avgJobDuration,
    completion_efficiency: completionEfficiency,
    utilization_percent: utilizationPercent,
    rework_count: reworkCount,
    rework_percent: reworkPercent,
    tml_claims: tmlClaims,
    tml_claim_rate: tmlClaimRate,
    avg_revenue_per_job: avgRevenuePerJob,
    on_time_completion: onTimeCompletion,
    quality_score: qualityScore,
    idle_time: idleTime,
    break_time: breakTime,
    overtime_hours: overtimeHours,
    health_status,
    created_at: new Date().toISOString()
  };
}
