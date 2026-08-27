import { pool as db } from "../db/index.ts";
import { DEFAULT_CIRCULARS, ServiceCircular } from "../lib/circularsData.ts";
import vehiclePassportFacade from "../engines/vehicle-passport/index.ts";

export interface ScheduleEligibilityResult {
  vrn: string;
  chassisNo: string;
  productLine: string;
  model: string;
  dateOfSale: string;
  ageYears: number;
  ageMonths: number;
  currentOdometer: number;
  lastOdometer: number | null;
  serviceVisitsCount: number;
  
  // Free Service (FSV) & Periodic Service
  serviceEligibility: {
    title: string;
    isEligible: boolean;
    serviceName: string;
    dueIntervalKm: number;
    dueIntervalDays: number;
    circularReference: string;
    description: string;
    statusBadge: "FSV_ELIGIBLE" | "PAID_PMS_DUE" | "OVERDUE" | "UP_TO_DATE";
  };

  // Warranty Pre-Screen
  warrantyPreScreen: {
    status: "ACTIVE" | "EXPIRED" | "EXTENDED_DRIVELINE_ONLY";
    baseWarrantyLimit: string;
    drivelineWarrantyLimit: string;
    circularReference: string;
    description: string;
    expiryDate: string;
    expiryKm: number;
  };

  // Repeat Failure Intelligence
  repeatFailureIntelligence: {
    hasRepeatIssue: boolean;
    description: string;
    lastComplaintDate?: string;
    lastComplaintKm?: number;
    kmSinceLastComplaint?: number;
    matchedKeyword?: string;
  };
}

export class ServiceScheduleEvaluator {
  /**
   * Evaluates service circulars and warranty schedule based on vehicle's Date of Sale,
   * Product Line (PPL), and current odometer against official TATA service circulars.
   */
  async evaluate(
    vrnOrChassis: string,
    currentOdometer: number,
    complaintText: string = "",
    customCirculars?: ServiceCircular[]
  ): Promise<ScheduleEligibilityResult> {
    const rawSearch = (vrnOrChassis || "").trim().toUpperCase();
    const cleanSearch = rawSearch.replace(/[^A-Z0-9]/g, "");

    // 1. Fetch vehicle aggregate from single source of truth (DB + TSV fallback)
    const aggregate = await vehiclePassportFacade.getVehiclePassportAggregate(cleanSearch || rawSearch);
    
    const passport = aggregate?.passport;
    const lifetime = aggregate?.lifetimeSummary;
    const visitLedger = aggregate?.visitLedger || [];

    const vrn = passport?.registrationNo || rawSearch;
    const chassisNo = passport?.vin || rawSearch;
    const productLine = passport?.productLine || passport?.model || "M&HCV BS6 Phase-II";
    const model = passport?.model || productLine;
    const dateOfSaleStr = passport?.originalSaleDate || passport?.dateOfRegistration || "";

    // Calculate vehicle age from Date of Sale
    let dateOfSale = dateOfSaleStr;
    let ageMonths = 0;
    let ageYears = 0;

    if (dateOfSaleStr) {
      const saleDate = new Date(dateOfSaleStr);
      if (!isNaN(saleDate.getTime())) {
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - saleDate.getTime());
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        ageMonths = Math.floor(diffDays / 30.4375);
        ageYears = parseFloat((diffDays / 365.25).toFixed(1));
      }
    }

    const previousVisits = lifetime?.totalVisits || visitLedger.length || 0;
    let lastOdometer: number | null = null;
    if (visitLedger.length > 0) {
      lastOdometer = visitLedger[0].odometerKm || null;
    }

    // 2. Identify applicable service circular rules based on PPL / Model
    // TATA M&HCV Service Circulars (SC/2023/133, SC/2024/63, SC/2023/129)
    const isHeavyCommercial = /SIGNA|PRIMA|4830|2830|3518|5530|10X2|6X4|4X2|HCV|M&HCV|LPO|NWKRTC|COMMERCIAL/i.test(productLine) ||
                             /SIGNA|PRIMA|4830|2830|3518|5530|HCV|M&HCV/i.test(model);

    // M&HCV Free Service Schedule according to Circular SC/2023/133 & SC/2024/63:
    // 1st Service: 40,000 km (<365 days / 1 Year)
    // 2nd Service: 120,000 km (<730 days / 2 Years)
    // 3rd Service: 200,000 km (<1095 days / 3 Years)
    // 4th Service: 280,000 km (<1460 days / 4 Years)
    // 5th Service: 360,000 km (<1825 days / 5 Years)
    const mhcvSchedules = [
      { name: "1st Free Service (PDI-1 / First Run)", km: 40000, days: 365, years: 1, circular: "SC/2023/133" },
      { name: "2nd Free Service (Major Service)", km: 120000, days: 730, years: 2, circular: "SC/2023/133" },
      { name: "3rd Free Service", km: 200000, days: 1095, years: 3, circular: "SC/2023/133" },
      { name: "4th Free Service", km: 280000, days: 1460, years: 4, circular: "SC/2023/133" },
      { name: "5th Free Service", km: 360000, days: 1825, years: 5, circular: "SC/2023/133" },
    ];

    // LCV / SCV schedule fallback (if small commercial)
    const lcvSchedules = [
      { name: "1st Free Service", km: 10000, days: 180, years: 0.5, circular: "SC/2023/129" },
      { name: "2nd Free Service", km: 20000, days: 365, years: 1, circular: "SC/2023/129" },
      { name: "3rd Free Service", km: 30000, days: 545, years: 1.5, circular: "SC/2023/129" },
      { name: "4th Periodic Service (Paid PMS)", km: 40000, days: 730, years: 2, circular: "SC/2023/129" },
    ];

    const activeSchedules = isHeavyCommercial ? mhcvSchedules : lcvSchedules;

    // Determine current schedule stage based on odometer and completed visits
    let selectedSchedule = activeSchedules[0];
    let isFsvEligible = false;
    let statusBadge: "FSV_ELIGIBLE" | "PAID_PMS_DUE" | "OVERDUE" | "UP_TO_DATE" = "FSV_ELIGIBLE";
    let serviceDesc = "";

    for (let i = 0; i < activeSchedules.length; i++) {
      const sched = activeSchedules[i];
      // If vehicle KM is within range of this service stage
      if (currentOdometer <= sched.km + 10000) {
        selectedSchedule = sched;
        break;
      }
      if (i === activeSchedules.length - 1) {
        selectedSchedule = sched;
      }
    }

    if (currentOdometer <= selectedSchedule.km + 5000 && ageYears <= selectedSchedule.years + 0.5) {
      isFsvEligible = true;
      statusBadge = "FSV_ELIGIBLE";
      serviceDesc = `Eligible for ${selectedSchedule.name} (${selectedSchedule.km.toLocaleString()} km / ${selectedSchedule.years} Year${selectedSchedule.years > 1 ? 's' : ''}) as per circular ${selectedSchedule.circular}.`;
    } else if (currentOdometer > 360000 || ageYears > 5) {
      isFsvEligible = false;
      statusBadge = "PAID_PMS_DUE";
      serviceDesc = `Free service coupon window expired. Due for Paid Periodic Maintenance Service (PMS) at ${currentOdometer.toLocaleString()} km as per revised interval circular SC/2024/63.`;
    } else {
      isFsvEligible = false;
      statusBadge = "PAID_PMS_DUE";
      serviceDesc = `Scheduled ${selectedSchedule.name} (${selectedSchedule.km.toLocaleString()} km interval) as per circular ${selectedSchedule.circular}.`;
    }

    // 3. Warranty Pre-Screen Evaluation (SC/2023/129 & SC/2023/133)
    // Heavy commercial: 3 Years / 3,00,000 km Base Vehicle Warranty
    // Driveline: 6 Years / 6,00,000 km (Engine, Transmission, Rear Axle)
    const baseWarrantyYears = 3;
    const baseWarrantyKm = passport?.warrantyExpiryKm || 300000;
    const drivelineWarrantyYears = 6;
    const drivelineWarrantyKm = 600000;

    let warrantyStatus: "ACTIVE" | "EXPIRED" | "EXTENDED_DRIVELINE_ONLY" = "ACTIVE";
    let warrantyDesc = "";

    if (ageYears <= baseWarrantyYears && currentOdometer <= baseWarrantyKm) {
      warrantyStatus = "ACTIVE";
      warrantyDesc = `Active under Base OEM Vehicle Warranty (${baseWarrantyYears} Years / ${baseWarrantyKm.toLocaleString()} km) per circular SC/2023/129. (Final claim adjudication by Warranty Team).`;
    } else if (ageYears <= drivelineWarrantyYears && currentOdometer <= drivelineWarrantyKm) {
      warrantyStatus = "EXTENDED_DRIVELINE_ONLY";
      warrantyDesc = `Base vehicle warranty expired (${ageYears} yrs / ${currentOdometer.toLocaleString()} km). Driveline (Engine, Gearbox, Rear Axle) covered up to ${drivelineWarrantyYears} Years / ${drivelineWarrantyKm.toLocaleString()} km per circular SC/2023/133.`;
    } else {
      warrantyStatus = "EXPIRED";
      warrantyDesc = `Standard warranty expired (${ageYears} yrs / ${currentOdometer.toLocaleString()} km). Check for active AMC/FMS coverage packages (FMS-2023 / AMC-2024).`;
    }

    // 4. Repeat Failure Intelligence Check
    let hasRepeatIssue = false;
    let repeatDesc = "No repeat complaints recorded in recent service history.";
    let lastComplaintDate: string | undefined;
    let lastComplaintKm: number | undefined;
    let kmSinceLastComplaint: number | undefined;
    let matchedKeyword: string | undefined;

    const keywords = ["clutch", "brake", "leak", "coolant", "overheat", "starting", "oil pressure", "hub", "steering", "gear", "sensor", "def", "smoke", "vibration", "noise"];
    const searchTarget = (complaintText || "").toLowerCase();

    // Check recent visits
    for (const visit of visitLedger) {
      const pastComplaints = (visit.complaints || []).join(" ").toLowerCase();
      for (const kw of keywords) {
        if ((searchTarget.includes(kw) || !complaintText) && pastComplaints.includes(kw)) {
          hasRepeatIssue = true;
          matchedKeyword = kw;
          lastComplaintDate = visit.gateInTime;
          lastComplaintKm = visit.odometerKm;
          if (lastComplaintKm && currentOdometer > lastComplaintKm) {
            kmSinceLastComplaint = currentOdometer - lastComplaintKm;
          }
          repeatDesc = `Similar ${kw} complaint recorded in Job Card #${visit.jobCardNo} at ${lastComplaintKm ? lastComplaintKm.toLocaleString() + ' km' : 'previous visit'}${kmSinceLastComplaint ? ` (${kmSinceLastComplaint.toLocaleString()} km ago)` : ''}. Review previous job card for part warranty & rework eligibility.`;
          break;
        }
      }
      if (hasRepeatIssue) break;
    }

    return {
      vrn,
      chassisNo,
      productLine,
      model,
      dateOfSale: dateOfSale || "Not Recorded",
      ageYears,
      ageMonths,
      currentOdometer,
      lastOdometer,
      serviceVisitsCount: previousVisits,
      serviceEligibility: {
        title: "FSV / SERVICE ELIGIBILITY",
        isEligible: isFsvEligible,
        serviceName: selectedSchedule.name,
        dueIntervalKm: selectedSchedule.km,
        dueIntervalDays: selectedSchedule.days,
        circularReference: selectedSchedule.circular,
        description: serviceDesc,
        statusBadge
      },
      warrantyPreScreen: {
        status: warrantyStatus,
        baseWarrantyLimit: `${baseWarrantyYears} Years / ${baseWarrantyKm.toLocaleString()} km`,
        drivelineWarrantyLimit: `${drivelineWarrantyYears} Years / ${drivelineWarrantyKm.toLocaleString()} km`,
        circularReference: "SC/2023/129",
        description: warrantyDesc,
        expiryDate: passport?.warrantyExpiryDate || "",
        expiryKm: baseWarrantyKm
      },
      repeatFailureIntelligence: {
        hasRepeatIssue,
        description: repeatDesc,
        lastComplaintDate,
        lastComplaintKm,
        kmSinceLastComplaint,
        matchedKeyword
      }
    };
  }
}

export const serviceScheduleEvaluator = new ServiceScheduleEvaluator();
export default serviceScheduleEvaluator;
