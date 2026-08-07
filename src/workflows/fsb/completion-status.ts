export const FsbVehicleCompletionStatus = [
  "NOT_STARTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "INSPECTED_OK", // No action needed
  "FAILED_INSPECTION" // Action required
] as const;
