export class GoodwillBudgetEngine {
  static checkBudget(branchId: string, requestedAmount: number, currentBudgets: any): boolean {
    const branchBudget = currentBudgets[branchId];
    if (!branchBudget) return true; // Uncapped
    
    return branchBudget.remaining >= requestedAmount;
  }

  static processDeduction(branchId: string, amount: number, currentBudgets: any): any {
    if (currentBudgets[branchId]) {
      currentBudgets[branchId].remaining -= amount;
      currentBudgets[branchId].used += amount;
    }
    return currentBudgets;
  }
}
