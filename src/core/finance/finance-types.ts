export type VoucherType = 'JV' | 'RV' | 'PV' | 'SV' | 'PURV';

export type InvoiceStatus = 'DRAFT' | 'VERIFIED' | 'APPROVED' | 'POSTED' | 'CANCELLED';

export type PeriodStatus = 'OPEN' | 'LOCKED' | 'CLOSED';

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  costCenterBranch?: string;
  costCenterDept?: string;
  costCenterEntity?: string;
}

export interface InvoiceLine {
  itemType: 'LABOUR' | 'PART';
  referenceOperationId?: string;
  referencePartNumber?: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  taxableAmount: number;
  taxAmount: number;
  netAmount: number;
}
