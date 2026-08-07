export type TransactionType = "GRN" | "ISSUE" | "RETURN" | "TRANSFER_OUT" | "TRANSFER_IN" | "ADJUSTMENT" | "VERIFICATION";

export type ValuationMethod = "MOVING_AVERAGE" | "FIFO" | "WEIGHTED_AVERAGE";

export type FSNClassification = "F" | "S" | "N"; // Fast, Slow, Non-moving
export type ABCClassification = "A" | "B" | "C"; 

export type InventoryStatus = "ACTIVE" | "INACTIVE" | "OBSOLETE";

export type TransferStatus = "DISPATCHED" | "IN_TRANSIT" | "RECEIVED";

export interface StockReservation {
  reservationNumber: string;
  jobCardId?: string;
  partNumber: string;
  reservedQuantity: number;
  issuedQuantity: number;
  releasedQuantity: number;
  status: "OPEN" | "PARTIAL" | "CLOSED" | "CANCELLED";
}

export interface InventoryLedgerEntry {
  transactionId: string;
  transactionType: TransactionType;
  partNumber: string;
  warehouseId: string;
  binId?: string;
  quantity: number; // positive for inbound, negative for outbound
  unitCost: number;
  runningBalance: number;
  referenceId: string;
  performedBy: string;
  reason?: string;
}
