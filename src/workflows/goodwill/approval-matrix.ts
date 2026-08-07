export interface ApprovalLevel {
  role: string;
  max_amount: number;
}

export const GoodwillApprovalMatrix: Record<string, ApprovalLevel[]> = {
  "FLEET": [
    { role: "SERVICE_MANAGER", max_amount: 1000 },
    { role: "GOODWILL_MANAGER", max_amount: 5000 },
    { role: "OEM", max_amount: Infinity }
  ],
  "RETAIL": [
    { role: "WORKSHOP_CONTROLLER", max_amount: 500 },
    { role: "SERVICE_MANAGER", max_amount: 2000 },
    { role: "DEALER_PRINCIPAL", max_amount: 5000 },
    { role: "OEM", max_amount: Infinity }
  ]
};
