import { OvertimeRequest, Employee, WorkforceAttendance, Shift, Workshop, JobCard, JobTechnicianMap } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  calculatedHours: number;
  compAttendanceCredit: number;
  salarySnapshot: {
    basicSalary: number;
    daysInMonth: number;
    hourlyRate: number;
    calculatedAmount: number;
    maxAllowed: number;
    finalPayable: number;
    cappingReason: string | null;
  } | null;
  fastTrackEligible: boolean;
}

// Approved overtime reasons list
export const APPROVED_OT_REASONS = [
  'Emergency Breakdown',
  'Customer Waiting',
  'Warranty',
  'PDI',
  'Campaign',
  'Service Camp',
  'Inventory',
  'Admin Work',
  'Training',
  'Body Repair',
  'Road Test',
  'Field Service',
  'Other'
];

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parses a HH:MM or HH:MM:SS time string into decimal hours
 */
export function parseTimeToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const s = parseInt(parts[2], 10) || 0;
  return h + m / 60 + s / 3600;
}

/**
 * Helper to calculate number of days in a month for a given date
 */
export function getDaysInMonth(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 30; // default fallback
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Main Overtime Validation Rules Engine
 */
export async function validateOvertimeRequest(
  request: Partial<OvertimeRequest> & { gps_lat?: number; gps_lng?: number; face_match_score?: number; ocr_confidence?: number },
  dbState: any
): Promise<ValidationResult> {
  const errors: string[] = [];
  let calculatedHours = 0;
  let compAttendanceCredit = 0;
  let salarySnapshot = null;
  let fastTrackEligible = false;

  // Lookups in cached memory database arrays
  const employees: Employee[] = dbState.employees || [];
  const workshops: Workshop[] = dbState.workshops || [];
  const shifts: Shift[] = dbState.shifts || [];
  const jobCards: JobCard[] = dbState.jobCards || [];
  const attendanceRecords: WorkforceAttendance[] = dbState.workforceAttendance || [];
  const otRequests: OvertimeRequest[] = dbState.overtimeRequests || [];
  const jobTechnicianMaps: JobTechnicianMap[] = dbState.jobTechnicianMaps || [];

  // VAL-02: Employee Active
  const employee = employees.find(e => e.employee_id === request.employee_id);
  if (!employee) {
    errors.push('Employee does not exist in Employee Directory.');
    return { valid: false, errors, calculatedHours, compAttendanceCredit, salarySnapshot, fastTrackEligible };
  }
  if (!employee.is_active) {
    errors.push('Employee profile is currently inactive.');
  }

  // Reason Category Validation
  if (!request.ot_reason_category || !APPROVED_OT_REASONS.includes(request.ot_reason_category)) {
    errors.push(`Invalid OT Reason Category. Supported: ${APPROVED_OT_REASONS.join(', ')}.`);
  }

  // Date Checks
  if (!request.date) {
    errors.push('Date is required.');
  } else {
    // VAL-10: Future Date Check
    const reqDate = new Date(request.date);
    const today = new Date();
    // Normalize to midnight for date-only comparison
    reqDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (reqDate > today) {
      errors.push('Cannot submit overtime requests for future dates.');
    }
  }

  // Shift Checks
  const shift = shifts.find(s => s.shift_id === request.shift_id);
  if (!shift) {
    errors.push('Shift ID is invalid or does not exist in Shift Master.');
  }

  // VAL-01: Attendance Exists
  const attendance = attendanceRecords.find(a => a.employee_id === request.employee_id && a.shift_date === request.date);
  if (!attendance) {
    errors.push('No attendance record found for the employee on the requested date.');
  } else {
    // VAL-04: No Approved Leave
    if (attendance.status === 'Leave' || attendance.status === 'Absent') {
      errors.push(`Cannot claim overtime on a day marked as ${attendance.status}.`);
    }
  }

  // Hours Calculation
  if (request.ot_start_time && request.ot_end_time) {
    const startHrs = parseTimeToHours(request.ot_start_time);
    const endHrs = parseTimeToHours(request.ot_end_time);
    let diff = endHrs - startHrs;
    if (diff < 0) {
      diff += 24; // Overnight shift
    }
    calculatedHours = parseFloat(diff.toFixed(2));

    // VAL-09: Daily Cap Limit
    if (calculatedHours > 16.00) {
      errors.push('Total calculated overtime hours exceed the daily maximum limit of 16 hours.');
    }

    // VAL-03: On Shift Validation
    if (shift) {
      const shiftEnd = parseTimeToHours(shift.end_time);
      const otStart = parseTimeToHours(request.ot_start_time);
      // Validate that OT start is at or after shift end (taking overnight shifts into account)
      let minDiff = otStart - shiftEnd;
      if (minDiff < -12) {
        // e.g. Shift ends at 17:00, OT starts at 01:00 next day
        minDiff += 24;
      }
      if (minDiff < 0) {
        errors.push(`Overtime start time (${request.ot_start_time}) cannot be before the assigned shift end time (${shift.end_time}).`);
      }
    }
  } else {
    errors.push('Both OT Start Time and OT End Time are required.');
  }

  // Category specific validations
  if (request.ot_category === 'WORKSHOP') {
    // VAL-05: Job Card Authenticity
    if (!request.job_card_id) {
      errors.push('Job Card ID is mandatory for Workshop category Overtime.');
    } else {
      const job = jobCards.find(jc => jc.job_id === request.job_card_id);
      if (!job) {
        errors.push('Job Card does not exist.');
      } else {
        // VAL-06: Job Card Active Status
        if (['Completed', 'Invoiced', 'Cancelled'].includes(job.status)) {
          errors.push(`Linked Job Card is currently ${job.status}. Overtime can only be requested on active cards.`);
        }
        // VAL-07: Employee Allocation
        const isAssigned = jobTechnicianMaps.some(
          map => map.job_id === request.job_card_id && map.employee_id === request.employee_id
        ) || (job.technician_assignments && job.technician_assignments.some(assign => assign.technician_id === request.employee_id));
        
        if (!isAssigned) {
          errors.push('Employee is not assigned as a technician on the linked Job Card.');
        }
      }
    }
  } else if (request.ot_category === 'ADMINISTRATIVE') {
    if (!request.department) {
      errors.push('Department is required for Administrative category Overtime.');
    }
    if (!request.work_description || request.work_description.trim() === '') {
      errors.push('Work description is required for Administrative category Overtime.');
    }
  } else {
    errors.push('Invalid OT category. Must be WORKSHOP or ADMINISTRATIVE.');
  }

  // VAL-08: No Duplicate Request
  if (request.date && request.employee_id) {
    const isDuplicate = otRequests.some(
      r => r.employee_id === request.employee_id &&
           r.date === request.date &&
           r.current_status !== 'REJECTED' &&
           r.ot_id !== request.ot_id
    );
    if (isDuplicate) {
      errors.push('An active overtime request already exists for this employee on the requested date.');
    }
  }

  // VAL-11: Location Validation
  let activeWorkshopId = request.workshop_id || employee.workshop_id;
  // If Workshop category, fallback to Job Card's workshop if available
  if (request.ot_category === 'WORKSHOP' && request.job_card_id) {
    const job = jobCards.find(jc => jc.job_id === request.job_card_id);
    if (job && job.bay_id) {
      // Find matching workshop for this job
      activeWorkshopId = job.workshop_id || activeWorkshopId;
    }
  }

  // VAL-15: Workshop Existence
  const workshop = workshops.find(w => w.workshop_id === activeWorkshopId);
  if (!workshop) {
    errors.push('Linked workshop is invalid or does not exist.');
  } else if (request.gps_lat !== undefined && request.gps_lng !== undefined) {
    const dist = getDistanceMeters(request.gps_lat, request.gps_lng, Number(workshop.latitude), Number(workshop.longitude));
    if (dist > workshop.allowed_gps_radius) {
      errors.push(`GPS check failed: Employee is ${Math.round(dist)}m away from workshop. Allowed geofence radius: ${workshop.allowed_gps_radius}m.`);
    }
  } else {
    errors.push('GPS coordinates are required to validate geofence.');
  }

  // VAL-12: Client Device Time Check
  if (request.device_time && request.server_time) {
    const dTime = new Date(request.device_time).getTime();
    const sTime = new Date(request.server_time).getTime();
    const diffSec = Math.abs(dTime - sTime) / 1000;
    if (diffSec > 300) {
      errors.push('Device clock is out of sync with the server by more than 5 minutes. Enforce device time verification.');
    }
  }

  // Fast-Track Assessment:
  // Requires: Selfie GPS Match (gps_matched), Selfie Biometric matched, and OCR matched (if Workshop category)
  let gpsMatchedFlag = false;
  if (workshop && request.gps_lat !== undefined && request.gps_lng !== undefined) {
    const dist = getDistanceMeters(request.gps_lat, request.gps_lng, Number(workshop.latitude), Number(workshop.longitude));
    gpsMatchedFlag = dist <= workshop.allowed_gps_radius;
  }
  
  const faceMatched = request.face_match_score !== undefined && request.face_match_score >= 0.85;
  const ocrMatched = request.ot_category === 'WORKSHOP' 
    ? (request.ocr_confidence !== undefined && request.ocr_confidence >= 0.90)
    : true; // Admin doesn't require OCR

  const deviceTimeMatched = request.device_time && request.server_time 
    ? (Math.abs(new Date(request.device_time).getTime() - new Date(request.server_time).getTime()) / 1000 <= 300)
    : false;

  fastTrackEligible = gpsMatchedFlag && faceMatched && ocrMatched && deviceTimeMatched;

  // Benefit Calculations
  if (errors.length === 0) {
    if (request.benefit_type === 'COMPENSATORY_ATTENDANCE_CREDIT') {
      // Compensatory Attendance Credit logic:
      // Up to 8h -> 1.00 credit
      // >8h to 11h -> 1.50 credit
      // >11h to 16h -> 2.00 credit
      if (calculatedHours <= 8) {
        compAttendanceCredit = 1.00;
      } else if (calculatedHours <= 11) {
        compAttendanceCredit = 1.50;
      } else {
        compAttendanceCredit = 2.00;
      }
    } else if (request.benefit_type === 'MONETARY') {
      // Monetary calculations
      const basicSalary = Number(employee.basic_salary || 0);
      const daysInMonth = getDaysInMonth(request.date!);
      const hourlyRate = parseFloat((basicSalary / daysInMonth / 8).toFixed(2));
      const otRate = parseFloat((hourlyRate * 1.5).toFixed(2));
      const calculatedAmt = parseFloat((calculatedHours * otRate).toFixed(2));
      const maxAllowed = parseFloat((basicSalary / daysInMonth).toFixed(2)); // Capped at One Day Salary
      
      let finalPayable = calculatedAmt;
      let cappingReason: string | null = null;
      if (calculatedAmt > maxAllowed) {
        finalPayable = maxAllowed;
        cappingReason = `Capped: Calculated OT amount (${calculatedAmt} INR) exceeded one day's basic salary limit (${maxAllowed} INR).`;
      }

      salarySnapshot = {
        basicSalary,
        daysInMonth,
        hourlyRate,
        calculatedAmount: calculatedAmt,
        maxAllowed,
        finalPayable,
        cappingReason
      };
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    calculatedHours,
    compAttendanceCredit,
    salarySnapshot,
    fastTrackEligible
  };
}
