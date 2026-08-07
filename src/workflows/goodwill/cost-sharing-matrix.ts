export interface CostSharingRule {
  category: string;
  customer_percent: number;
  dealer_percent: number;
  oem_percent: number;
  vendor_percent: number;
  insurance_percent: number;
}

export const GoodwillCostSharingMatrix: CostSharingRule[] = [
  {
    category: "DEALER_ERROR",
    customer_percent: 0,
    dealer_percent: 100,
    oem_percent: 0,
    vendor_percent: 0,
    insurance_percent: 0
  },
  {
    category: "OEM_DEFECT",
    customer_percent: 0,
    dealer_percent: 0,
    oem_percent: 100,
    vendor_percent: 0,
    insurance_percent: 0
  },
  {
    category: "CUSTOMER_RETENTION",
    customer_percent: 25,
    dealer_percent: 25,
    oem_percent: 50,
    vendor_percent: 0,
    insurance_percent: 0
  }
];
