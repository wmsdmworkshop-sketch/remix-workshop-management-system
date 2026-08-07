export const FsbCampaignPriority = [
  "CRITICAL", // Do not drive
  "HIGH",     // Next service or within 30 days
  "MEDIUM",   // Next regular service
  "LOW"       // Information only / opportunistic
] as const;
