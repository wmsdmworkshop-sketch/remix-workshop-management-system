export interface ServiceCircular {
  id: string;
  title: string;
  date: string;
  group: string;
  models: string;
  summary: string;
  warrantyRules: string;
}

export const DEFAULT_CIRCULARS: ServiceCircular[] = [
  {
    id: "SC/2023/133",
    title: "Introduction of TATA SIGNA 4830.T BSVI Phase-2 10X2 with Cummins B6.7 L BSVI 300 HP engine",
    date: "June 2023",
    group: "00",
    models: "TATA SIGNA 4830.T BSVI Phase-2 10X2",
    summary: "Introduces the TATA SIGNA 4830.T BSVI Phase-2 10X2 truck. Details technical specifications, service schedules, and warranty guidelines.",
    warrantyRules: `
- Vehicle Warranty: 3 Years or 3 Lacs Kms (whichever is earlier) from the date of sale/commissioning.
- Additional Driveline Warranty: 3 Years or 3 Lacs Kms (whichever is earlier) for engine, transmission, and rear axle.
- Total Driveline Warranty: 6 Years or 6 Lacs Kms (whichever is earlier) or 6000 Hrs.
- Warranty for Unitized bearing (THU): 6 years or 6 lakh km whichever is earlier.
- Free Service Schedule: PDI at delivery, 2nd PDI post body building. First Service at 40,000 Kms (<365 days). Second Service at 120,000 Kms (<730 days). Third Service at 200,000 Kms (<1095 days). Fourth Service at 280,000 Kms (<1460 days). Fifth Service at 360,000 Kms (<1825 days).
`
  },
  {
    id: "SC/2026/76",
    title: "WHEEL ALIGNMENT PROCEDURE FOR 30T, 37T, 44T & 49T IAS VEHICLES",
    summary: "Service circular describing standard wheel alignment procedures, tyre rotation patterns, and technical specifications for 30T, 37T, 44T and 49T IAS Trucks.",
    date: "April 2026",
    group: "02",
    models: "30T, 37T, 44T & 49T IAS Trucks",
    warrantyRules: `
- Wheel alignment and tyre rotation are recommended at every 10,000 kms to improve tyre life.
- Total Toe-In specification:
  * 30T, 37T Front Axle: +2 to +3 mm/m
  * 44T, 49T 1st Steerable Axle: +2 to +3 mm/m, 2nd Steerable Axle: +3 to +4 mm/m
- Thrust Angle (Out of Square): 1st Rear Axle Perpendicularity wrt. Vehicle Axis: -15' to +15' (or -4.4 to +4.4 mm/m).
- Parallelism (Scrub Angle): 2nd Rear Axle Parallelism wrt 1st Rear Axle: -15' to +15' (or -4.4 to +4.4 mm/m).
- KPI: 8.5° to 10.5° (Non-Adjustable)
- Caster: 
  * 30T: 0.8° to 2.8°
  * 37T: 2.5° to 4.5°
  * 44T SDL: 1.1° to 3.1°, LDL: 0.9° to 2.9°
  * 49T SDL: 1.2° to 3.2°, LDL: 1.0° to 3.0°
- Camber: 0° to 0.6° (Non-Adjustable)
`
  },
  {
    id: "SC/2026/39",
    title: "Standard procedure for cleaning of aluminium radiator and intercooler",
    date: "March 2026",
    group: "00",
    models: "All Buses",
    summary: "Prescribes standard internal and external cleaning procedures for aluminum heat exchangers (radiators and intercoolers) to avoid overheating and performance degradation.",
    warrantyRules: `
- Cleaning intervals depend on application and environment.
- Internal cleaning: Use TATA Motors Radiator Cleaner solution (SKUs 500 ml & 1000 ml). Recommended dilution ratio: Radiator Flush + Distilled Water (1:10). Fill, run engine for 10-15 minutes, drain, rinse with plain water till clear water drains.
- Intercooler cleaning: Remove from vehicle, fill with same solution, circulate under pressurized condition (0.5-1.0 Bar) for 15-20 minutes, drain and flush.
- External cleaning: Blow pressurized air at 6 bar for 2 minutes across the core, immerse in mild soap water (pH > 9) for 30 minutes, spray water jet at 50-70 psi at 2 meters.
`
  },
  {
    id: "SC/2023/167",
    title: "Clarification on Service Training Fees",
    date: "June 2023",
    group: "00",
    models: "All Models",
    summary: "Clarification on training fees for STC/RTC/RDTC training programs. Confirms there is no change in training fees since 2019, outlines instructor-based training (IBT) and virtual classroom (VCT) charges.",
    warrantyRules: `
- Virtual classroom Training (VCT): INR 300 / 90 min course per pax.
- Instructor-based Training (IBT) for Channel Partner Technicians: INR 2000 per day per pax.
- IBT for Service Advisors/Supervisors/Quality Assurance: INR 3000 per day per pax.
- IBT for Works Managers / Spare Parts Managers: INR 4000 per day per pax.
- Regional Dealer Training Centre (RDTC) without accommodations: INR 1000 per day per pax.
`
  },
  {
    id: "SC/2026/58",
    title: "Partwise warranty for BS6 Phase 2 NWKRTC LPO 1618 Cummins 5.6 engine 53 WB",
    date: "March 2026",
    group: "00",
    models: "NWKRTC LPO 1618 Cummins 5.6 BS6 Phase 2",
    summary: "Outlines detailed partwise warranty coverage, limitations up to 12 months, and exclusions for the specific fleet of 250 LPO 1618 buses supplied to NWKRTC.",
    warrantyRules: `
- Vehicle Warranty: 36 months or 4 Lac Kms (whichever is earlier) from the date of commissioning.
- EATS (Exhaust After Treatment System) Warranty: 5 Years or 8 Lac Kms (whichever is earlier).
- Engine Assembly, Cylinder Head, Cylinder Block, Crankshaft, Camshaft, Head Gasket, Water pump, Oil Pump, Oil Cooler, Flywheel Housing, Air Compressor, Radiator & Intercooler, Turbocharger, Starter Motor, Fuel Injection System (including ECU): Y (covered under 3 years/4 Lac km).
- Front & Rear Oil Seals: Y (covered).
- Fan Belt: Limited to 1 Year / 1.5 Lac Km (whichever is earlier).
- Clutch:
  * Flywheel structural failure: Covered up to 3 years or 3 lakh kms (whichever is earlier).
  * Flywheel Pilot bearing: Covered up to 2 years or 2 lakh kms (whichever is earlier).
  * Clutch Disc Structural Failure: Limited to 1.5 Year / 1.5 Lac Km (No warranty on burn cases).
  * Pressure Plate Structural parts: Limited to 2 Years / 2 lakh kms (no warranty on normal wear & tear).
  * Clutch Master Cylinder & Release Bearing: Limited to 2 Year / 2 Lac Km.
  * Clutch Booster: Y (covered under vehicle warranty).
- Gearbox Assembly & Internals, Propeller Shaft (Structural parts), Rear Axle Housing, Axle Shaft, CWP, Pinion Oil Seal, Axle Beam, Tie Rod, Drag Link: Y (covered under vehicle warranty).
- Propeller Shaft CJ Rubber/Bearing: Limited to 1 Year / 1 Lac Km.
- King Pin: Limited to 2 Year / 2 Lac Km.
- Brakes: ABS System: Y. Brake Drum and Brake Shoe: Limited to 3 years or 3 lakh kms (No warranty on wear and tear). DDU/Air Dryer, Brake Chambers/actuators, Dual Brake Valve: Limited to 3 years or 3 lakh kms.
- Electricals: Instrument Cluster, Wiper Motor, VECU, GDCU, Wiring Harness: Y (covered under vehicle warranty). Battery: Limited to 12 months from date of sale.
- Exclusions (Not covered under warranty except premature failure): Bulbs, fuses, normal wear and tear of clutch/brake linings, wiper blades, cylinder head cover gasket, axle shaft gasket, torn seat covers, windshield glass due to external damage, routine maintenance parts.
`
  },
  {
    id: "SC/2023/53",
    title: "Introduction of TATA SIGNA 2830.TK BSVI HD 6x4 RDE with G1150",
    date: "March 2023",
    group: "00",
    models: "TATA SIGNA 2830.TK BSVI HD 6x4 RDE with G1150",
    summary: "Introduces the TATA SIGNA 2830.TK BSVI HD 6x4 tipper. Details technical specifications, service schedules, and warranty guidelines.",
    warrantyRules: `
- Vehicle Warranty: 3 Years or 3 Lacs Kms or 3000 Hrs (whichever occurs earlier) from the date of sale.
- Additional Driveline Warranty: 3 Years or 3 Lacs Kms or 3000 Hrs (whichever occurs earlier) on engine, transmission, and rear axle.
- Total Driveline Warranty: 6 Years or 6 Lacs Kms or 6000 Hrs (whichever occurs earlier).
- Warranty for Unitized bearing (THU): 6 years / 6 lakh km / 4500 Hrs (whichever is earlier).
`
  },
  {
    id: "SC/2024/63",
    title: "Revised service schedule and oil change interval for BS6 Phase-2 HCV with Cummins Engine (6.7L & 5.6L)",
    date: "March 2024",
    group: "00",
    models: "ALL BS6 Phase-2 HCV with Cummins Engine (6.7L & 5.6L)",
    summary: "Defines revised service schedules and oil change intervals applicable from 1st January 2024 for Cummins 6.7L and 5.6L engine models starting with chassis cut-off MAT566011R1A00001.",
    warrantyRules: `
- Engine oil change interval: First at 40,000 Kms/1 year then every 1,00,000 Kms/1.5 years. For tippers: First 500 hrs/1 year then every 2000 hrs/1.5 year.
- Engine oil filter change interval: First at 1,40,000 Kms/2.5 years then every 1,00,000 Kms/1.5 years. For tippers: First 2500 hrs/2.5 years then every 2000 hrs/1.5 year.
- Fuel filters (both elements): First at 1,40,000 Kms/2.5 years then every 1,00,000 Kms/1.5 years. For tippers: First 2500 hrs/2.5 years then every 2000 hrs/1.5 year.
- DEF Tank (UL 2.2) Filter and Supply Unit (SU) DEF Filter kit: First at 1,40,000 Kms/2.5 years then every 1,00,000 Kms/1.5 years.
- DPF Ash cleaning: First 340,000 Kms then every 300,000 Kms. For tippers: Every 6,500 Hrs.
- Gearbox oil change (GB-1150): First 240,000 Kms then every 200,000 Kms. For Tippers: First 4500 Hrs then every 4000 Hrs.
- Rear Axle oil change: First 240,000 Kms/2 years then every 300,000 Kms/3 years.
- Front/rear hub grease change: First 140,000 Kms/1.5 years then every 200,000 Kms/2 years.
`
  },
  {
    id: "SC/2023/129",
    title: "Parts wise warranty for M&HCV BSVI Phase-II models",
    date: "May 2023",
    group: "00",
    models: "ALL M&HCV BSVI Phase-II models",
    summary: "Detailed parts wise warranty matrix for M&HCV BSVI Phase-II models including limited warranty periods and driveline boundaries.",
    warrantyRules: `
- Base Vehicle Warranty: 3 Years or 3 Lac Kms or 3000 Hrs (whichever is earlier) from date of sale.
- Driveline Warranty: 6 Years or 6 Lac Kms or 6000 Hrs (whichever is earlier).
- Engine Assemblies: Engine Assembly, Cylinder Head, Cylinder Block, Crankshaft, Camshaft, Head Gasket, Water pump, Oil Pump, Oil Cooler, Flywheel Housing, Air Compressor, Radiator are covered under 3 Years/3 Lac Km vehicle warranty.
- Oil Mist Separator Assy: Limited Warranty of 2 Year/2 Lac Km/2000 Hrs. (Not covered under vehicle or driveline warranty directly).
- Turbocharger: Limited Warranty of 2 Year / 1 Lac Km / 2000 Hrs.
- Front / Rear Oil Seals & Fan Belt: Limited Warranty of 1 Year / 1 Lac Km / 1000 Hrs.
- Engine Mounting: Limited Warranty of 2 Year / 2 Lac Kms / 2000 Hrs.
- Clutch:
  * Flywheel: Covered under vehicle warranty (3 Years/3 Lac Kms).
  * Clutch Disk Structure & Pressure Plate: Limited to 1.5 Year / 1.5 Lac Km / 1500 Hrs. (No warranty on burn cases).
  * Clutch Master Cylinder: Limited to 2 Year / 2 Lac Km / 2000 Hrs.
  * Clutch Release Bearing: Limited to 1.5 Year / 1 Lac Km / 1500 Hrs.
  * Clutch Booster: Y (covered under vehicle warranty).
- Gearbox: Y (covered under 3 years/3 Lac Km). Shifter/Selector Cable limited to 2 Year/2 Lac Km/2000 Hrs. PTO limited to 1 Year/1 Lac Km/1000 Hrs.
- Propeller Shaft / Inter Axle Shaft: Limited to 2 Year / 2 Lac Km / 3000 Hrs. UJ Cross, Yoke, CJ Rubber/Bearing limited to 1 Year / 1 Lac Km / 1000 Hrs.
- Rear Axle: Housing, Hub, Axle Shaft, CWP are covered under vehicle/driveline warranty (3 Years/6 Years). Pinion oil seal limited to 1 Year / 1 Lac Km / 1000 Hrs.
- Front Axle Axle Beam: Y. King Pin limited to 2 Year / 2 Lac Km / 2000 Hrs. Tie Rod limited to 3 Year / 2 Lac Km / 2000 Hrs. Thrust Bearing limited to 1.5 Year / 1.5 Lac Km / 1500 Hrs.
- THU Bearing: Covered up to 6 Years / 6 Lac Km / 4500 Hrs under vehicle warranty.
- Lift Axle 12.5T / 7T: Hanger, Trailing Arm, Axle: Y (covered). Lift Axle Control Valve: Covered under vehicle warranty (Y). Air Bellow: Limited to 2 Year / 2 Lacs Km / 2000 Hrs.
- Brakes ABS unit, Air Processing Unit, Pneumatic Valve: Y (covered). Brake Drum: Covered under vehicle warranty (3 Year/3 Lac Km). S Camshaft limited to 2 Year/2 Lac Km/2000 Hrs. Brake Shoe limited to 1 Year/1 Lac Km/1000 Hrs. Torque Plate limited to 2 Year/2 Lac Km/2000 Hrs. Slack Adjuster limited to 1.5 Year/1.5 Lac Km/1500 Hrs. Hand Brake Valve limited to 2 Year/2 Lac Km/2000 Hrs.
- Frame Chassis Frame: Covered under 2 Year / 2 Lac Km / 2000 Hrs.
- Suspension Leaf Spring / Bogie Spring: Semi Elliptical / Parabolic limited to 1 Year / 75K Km / 1000 Hrs. Shock Absorber limited to 1 Year / 40K Km / 1000 Hrs. Bogie Bracket limited to 2 Year / 2 Lac Km / 2000 Hrs. Bogie Trunnion, V Rod, Torque Rod limited to 2 Year / 2 Lac Km / 2000 Hrs. Levelling Valve limited to 2 Year / 2 Lac Km / 2000 Hrs. Ultimax Suspension (Tippers) limited to 4 Year / 4 Lac Km / 4000 Hrs.
- Cabin: Y (covered). Music System, Cabin Suspension, Wiper Motor, Windshield glass: Limited to 1 Year / 1 Lac Km / 1000 Hrs.
- Electricals & Electronics: Engine ECU, ECU ABS, All Sensors/Relays: Y (covered). Battery limited to 1 Year / 1 Lac Km / 1000 Hrs. DCU (5L), VECU, GDCU: Limited to 2 Year / 2 Lac Km / 2000 Hrs.
- Load Body / Load Body parts: Limited to 1 Year / 1 Lac Km / 1000 Hrs. Tipper Sub frame: Limited to 1.5 Year / 1.5 Lac Km / 1500 Hrs. Paints: Limited to 6 Months / 50K Km / 500 Hrs.
- Others Plastic Fuel Tank: Y (covered). Fuel Tank (Metallic), Oil Seals, Fifth Wheel Coupling, Wheel Rim: Limited to 1 Year/1.5 Year or 1-2 Lac Km.
`
  },
  {
    id: "FMS-2023",
    title: "Fleet Management Solutions (FMS) Coverage - (HCV - BS6 Phase-II)",
    date: "July 2023",
    group: "FMS",
    models: "ALL HCV - BS6 Phase-II",
    summary: "Defines the specific parts and labor coverage details under FMS Pack 1 and FMS Pack 2 for Heavy Commercial Vehicles.",
    warrantyRules: `
- Aggregate Type: Lift Axle
  * Part: Lift Axle control valve is covered under both Pack 1 and Pack 2 for both Parts (Y) and Labour (Y).
  * Part: Load sensing valve is covered under both Pack 1 and Pack 2 for both Parts (Y) and Labour (Y).
  * Part: Air Bellow is NOT covered under any Pack (N/N).
- Aggregate Type: Brake
  * Part: ABS Unit (ECU) is NOT covered under Pack 1 (N/N), but is covered under Pack 2 for both Parts (Y) and Labour (Y).
  * Part: Brake Drum, Slack Adjuster, Brake Shoe & Lining, Brake Valves, Brake Actuators are covered under both Pack 1 and Pack 2 (Y/Y).
`
  },
  {
    id: "AMC-2024",
    title: "Annual Maintenance Contract (AMC) Coverage - (HCV - BS6 Phase-II)",
    date: "April 2024",
    group: "AMC",
    models: "ALL HCV - BS6 Phase-II",
    summary: "Defines parts and labor coverage criteria under Silver, Platinum, and Platinum Plus AMC packages for Heavy Commercial Vehicles.",
    warrantyRules: `
- Lift Axle control valve and Load sensing valve are NOT covered under Silver (N/N), but are covered under Platinum and Platinum Plus for both Parts (Y) and Labour (Y).
- Air Bellow (Lift Axle) is NOT covered under any AMC packages (Silver, Platinum, Platinum Plus - N/N/N).
- Engine Assembly parts, Clutch Booster, Clutch Master Cylinder are covered under Platinum and Platinum Plus (Y/Y), but NOT under Silver.
- Brakes ABS Unit (ECU) is NOT covered under Silver or Platinum (N/N), but is covered under Platinum Plus (Y/Y).
`
  },
  {
    id: "SC/2025/160",
    title: "Warranty/AMC Guidelines for DEF Usage, Procurement Verification, and Claim Adjudication in BS-VI Vehicles",
    date: "September 2025",
    group: "00",
    models: "ALL BS-VI Vehicles",
    summary: "Guidelines for validating warranty claims for After Treatment System (ATS) based on DEF procurement history and quality checks.",
    warrantyRules: `
- Warranty of ATS and related systems is strictly valid ONLY if the customer has a purchase history of TATA Genuine DEF (Diesel Exhaust Fluid) for the last 3 months.
- Valid proof of purchase, genuine bills with customer's name for TGP DEF are required.
- If DEF quality check or purchase history pre-check fails, the warranty of ATS is NULL AND VOID.
- Average DEF consumption should be +4% of fuel consumed.
- Refractometer and Hanna Kit must be used to test DEF quality during troubleshooting.
`
  }
];
