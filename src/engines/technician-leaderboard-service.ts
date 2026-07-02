import { Employee, TechnicianKPIDaily } from "../types";

export interface LeaderboardEntry {
  rank: number;
  employee_id: number;
  full_name: string;
  role: string;
  earned_amount: number;
  jobs_completed: number;
  efficiency_percent: number;
  utilization_percent: number;
  quality_score: number;
  health_status: string; // "🟢" | "🟡" | "🔴"
  trend: "UP" | "DOWN" | "STABLE";
}

// Helper to filter dates within a range
function getKpisInDateRange(
  dbCache: any,
  employeeId: number,
  startDateStr: string,
  endDateStr: string
): TechnicianKPIDaily[] {
  const kpis = dbCache.technicianKpiDailies || [];
  return kpis.filter((k: TechnicianKPIDaily) => {
    return k.employee_id === employeeId && k.kpi_date >= startDateStr && k.kpi_date <= endDateStr;
  });
}

// Helper to format Date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getLeaderboardData(
  timeframe: "daily" | "weekly" | "monthly",
  sortBy: keyof Omit<LeaderboardEntry, "rank" | "full_name" | "role" | "health_status" | "trend">,
  dbCache: any,
  targetDateStr?: string // optional current date (defaults to today)
): LeaderboardEntry[] {
  const today = targetDateStr ? new Date(targetDateStr) : new Date();
  const todayStr = formatDate(today);

  // Define date ranges for current and previous period (for trend calculation)
  let currentStartStr = todayStr;
  let currentEndStr = todayStr;
  let prevStartStr = todayStr;
  let prevEndStr = todayStr;

  if (timeframe === "daily") {
    currentStartStr = todayStr;
    currentEndStr = todayStr;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    prevStartStr = formatDate(yesterday);
    prevEndStr = formatDate(yesterday);
  } else if (timeframe === "weekly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6); // Last 7 days
    currentStartStr = formatDate(start);
    currentEndStr = todayStr;

    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 6);
    prevStartStr = formatDate(prevStart);
    prevEndStr = formatDate(prevEnd);
  } else if (timeframe === "monthly") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29); // Last 30 days
    currentStartStr = formatDate(start);
    currentEndStr = todayStr;

    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 29);
    prevStartStr = formatDate(prevStart);
    prevEndStr = formatDate(prevEnd);
  }

  // Get active technicians
  const technicians = (dbCache.employees || []).filter((e: Employee) => e.is_active);

  const entries: LeaderboardEntry[] = [];

  technicians.forEach((tech: Employee) => {
    const currentKpis = getKpisInDateRange(dbCache, tech.employee_id, currentStartStr, currentEndStr);
    const prevKpis = getKpisInDateRange(dbCache, tech.employee_id, prevStartStr, prevEndStr);

    if (currentKpis.length === 0) {
      // If daily and no snapshot exists yet, let's calculate a live transient snapshot for today!
      // This is crucial if the job hasn't run yet.
      return;
    }

    // Aggregates
    const earned_amount = currentKpis.reduce((sum, k) => sum + Number(k.revenue_earned || 0), 0);
    const jobs_completed = currentKpis.reduce((sum, k) => sum + k.jobs_completed, 0);
    const total_assigned = currentKpis.reduce((sum, k) => sum + k.jobs_assigned, 0);
    const total_duration = currentKpis.reduce((sum, k) => sum + k.avg_job_duration, 0);

    const avg_efficiency = currentKpis.reduce((sum, k) => sum + Number(k.completion_efficiency || 0), 0) / currentKpis.length;
    const avg_utilization = currentKpis.reduce((sum, k) => sum + Number(k.utilization_percent || 0), 0) / currentKpis.length;
    const avg_quality = currentKpis.reduce((sum, k) => sum + Number(k.quality_score || 0), 0) / currentKpis.length;

    // Previous aggregates for trend
    const prev_earned = prevKpis.reduce((sum, k) => sum + Number(k.revenue_earned || 0), 0);

    // Health status (we take the most recent health status)
    const latestKpi = [...currentKpis].sort((a, b) => b.kpi_date.localeCompare(a.kpi_date))[0];
    let health_emoji = "🟢";
    if (latestKpi.health_status === "AMBER") health_emoji = "🟡";
    if (latestKpi.health_status === "RED") health_emoji = "🔴";

    let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
    if (prevKpis.length > 0) {
      if (earned_amount > prev_earned) trend = "UP";
      else if (earned_amount < prev_earned) trend = "DOWN";
    }

    entries.push({
      rank: 0, // Assigned later
      employee_id: tech.employee_id,
      full_name: tech.full_name,
      role: tech.role,
      earned_amount: Math.round(earned_amount * 100) / 100,
      jobs_completed,
      efficiency_percent: Math.round(avg_efficiency * 100) / 100,
      utilization_percent: Math.round(avg_utilization * 100) / 100,
      quality_score: Math.round(avg_quality * 100) / 100,
      health_status: health_emoji,
      trend
    });
  });

  // Sort entries
  entries.sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (typeof valA === "number" && typeof valB === "number") {
      return valB - valA; // Descending order
    }
    return 0;
  });

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // Return Top 10
  return entries.slice(0, 10);
}
