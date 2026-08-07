import { BaseWorkflowStrategy } from "./base-workflow-strategy";

/**
 * Registry to hold specialized workflow strategies.
 * Provides a decoupling mechanism so the BusinessCaseEngine can delegate 
 * to domain logic without statically importing it.
 */
export class WorkflowStrategyRegistry {
  private strategies: Map<string, BaseWorkflowStrategy> = new Map();

  /**
   * Registers a specialized workflow strategy.
   */
  public registerStrategy(strategy: BaseWorkflowStrategy): void {
    const type = strategy.getWorkflowType();
    if (this.strategies.has(type)) {
      throw new Error(`Strategy for workflow type '${type}' is already registered.`);
    }
    this.strategies.set(type, strategy);
  }

  /**
   * Retrieves a strategy by workflow type.
   * Returns undefined if no strategy is registered, indicating no custom hooks are needed.
   */
  public getStrategy(workflowType: string): BaseWorkflowStrategy | undefined {
    return this.strategies.get(workflowType);
  }
}
