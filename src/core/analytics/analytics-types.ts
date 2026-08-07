export type DashboardRole = 'DEALER_PRINCIPAL' | 'CEO' | 'SERVICE_MANAGER' | 'PARTS_MANAGER' | 'FINANCE_MANAGER';

export type ChartType = 'BAR' | 'LINE' | 'PIE' | 'NUMBER_CARD' | 'TABLE';

export type KPITrend = 'UP' | 'DOWN' | 'FLAT';

export type RefreshPolicy = 'EVENT' | 'SCHEDULED';

export interface KPICatalogEntry {
  kpiId: string;
  kpiName: string;
  formula: string;
  ownerModule: string;
  refreshPolicy: RefreshPolicy;
  unit: string;
  defaultTarget: number;
}
