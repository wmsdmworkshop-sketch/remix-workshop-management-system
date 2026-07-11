/**
 * =============================================================================
 * WOS Core Architecture: Queue Policies
 * Bounded Context: Core System / Queue Platform
 * Description: Registers supported queue types and rules.
 * =============================================================================
 */

export type QueueName =
  | "GATE"
  | "RECEPTION"
  | "ADVISOR"
  | "SUPERVISOR"
  | "BAY"
  | "TECHNICIAN"
  | "QC"
  | "PARTS"
  | "BILLING"
  | "CASHIER"
  | "DELIVERY"
  | "MANAGEMENT";

export interface QueueConfig {
  name: QueueName;
  ordering: "FIFO" | "LIFO" | "PRIORITY";
  maxLimit: number;
}

export class QueuePolicy {
  private configs: Map<QueueName, QueueConfig> = new Map();

  constructor() {
    this.configs.set("GATE", { name: "GATE", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("RECEPTION", { name: "RECEPTION", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("ADVISOR", { name: "ADVISOR", ordering: "PRIORITY", maxLimit: 100 });
    this.configs.set("SUPERVISOR", { name: "SUPERVISOR", ordering: "PRIORITY", maxLimit: 100 });
    this.configs.set("BAY", { name: "BAY", ordering: "PRIORITY", maxLimit: 200 });
    this.configs.set("TECHNICIAN", { name: "TECHNICIAN", ordering: "PRIORITY", maxLimit: 150 });
    this.configs.set("QC", { name: "QC", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("PARTS", { name: "PARTS", ordering: "PRIORITY", maxLimit: 100 });
    this.configs.set("BILLING", { name: "BILLING", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("CASHIER", { name: "CASHIER", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("DELIVERY", { name: "DELIVERY", ordering: "FIFO", maxLimit: 50 });
    this.configs.set("MANAGEMENT", { name: "MANAGEMENT", ordering: "PRIORITY", maxLimit: 100 });
  }

  public getConfig(name: QueueName): QueueConfig {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Queue configuration not found for: ${name}`);
    }
    return config;
  }
}
