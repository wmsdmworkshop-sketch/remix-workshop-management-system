/**
 * =============================================================================
 * WOS Core Architecture: Circuit Breaker Implementation
 * Bounded Context: Core System / Resiliency Patterns
 * Description: Prevents cascading failures to remote provider channels by
 *              tripping to Open state and cooling down to Half-Open.
 * =============================================================================
 */

export class CircuitBreaker {
  private failureCount: Map<string, number> = new Map();
  private state: Map<string, "CLOSED" | "OPEN" | "HALF_OPEN"> = new Map();
  private lastStateChange: Map<string, number> = new Map();

  constructor(
    private readonly tripThreshold: number = 3,
    private readonly cooldownMs: number = 5000 // default 5 seconds for tests
  ) {}

  public getState(provider: string): "CLOSED" | "OPEN" | "HALF_OPEN" {
    this.evaluateStateTransitions(provider);
    return this.state.get(provider) || "CLOSED";
  }

  public canExecute(provider: string): boolean {
    const currentState = this.getState(provider);
    return currentState === "CLOSED" || currentState === "HALF_OPEN";
  }

  public recordSuccess(provider: string): void {
    this.failureCount.set(provider, 0);
    this.state.set(provider, "CLOSED");
    this.lastStateChange.set(provider, Date.now());
  }

  public recordFailure(provider: string): void {
    const currentFailures = (this.failureCount.get(provider) || 0) + 1;
    this.failureCount.set(provider, currentFailures);

    if (currentFailures >= this.tripThreshold) {
      this.state.set(provider, "OPEN");
      this.lastStateChange.set(provider, Date.now());
      console.warn(`[CircuitBreaker] Provider "${provider}" TRIPPED to OPEN state due to ${currentFailures} failures.`);
    }
  }

  private evaluateStateTransitions(provider: string): void {
    const currentState = this.state.get(provider) || "CLOSED";
    if (currentState === "OPEN") {
      const openTime = this.lastStateChange.get(provider) || 0;
      if (Date.now() - openTime >= this.cooldownMs) {
        this.state.set(provider, "HALF_OPEN");
        this.lastStateChange.set(provider, Date.now());
        console.log(`[CircuitBreaker] Provider "${provider}" transitioned to HALF_OPEN state (cooldown expired).`);
      }
    }
  }
}
