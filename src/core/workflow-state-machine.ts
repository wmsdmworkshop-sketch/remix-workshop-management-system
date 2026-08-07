import { BusinessContext, BusinessContextFactory, ExecutionResult } from "./business-context";

export interface TransitionCommand {
  readonly current_state: string;
  readonly target_state: string;
  readonly remarks?: string;
  readonly payload?: any;
}

export interface StateMachineConfig {
  workflow_type: string;
  states: string[];
  initial_state: string;
  transitions: Record<string, string[]>;
  validation_rules?: Record<string, (context: BusinessContext, cmd: TransitionCommand) => Promise<boolean | string>>;
}

export class InvalidStateTransitionError extends Error {
  constructor(message: string, public context: BusinessContext, public command: TransitionCommand) {
    super(message);
    this.name = "InvalidStateTransitionError";
  }
}

export class StateValidationError extends Error {
  constructor(message: string, public context: BusinessContext, public command: TransitionCommand) {
    super(message);
    this.name = "StateValidationError";
  }
}

export interface TransitionResult {
  from: string;
  to: string;
}

/**
 * Generic Reusable Workflow State Machine (DWIP Principle #7)
 */
export class WorkflowStateMachine {
  constructor(private config: StateMachineConfig) {
    this.validateConfig();
  }

  private validateConfig() {
    if (!this.config.states.includes(this.config.initial_state)) {
      throw new Error(`Initial state '${this.config.initial_state}' is not in the list of valid states.`);
    }
    
    // Ensure all transitions point to valid states
    for (const [state, targets] of Object.entries(this.config.transitions)) {
      if (!this.config.states.includes(state)) {
        throw new Error(`Transition origin state '${state}' is not defined.`);
      }
      for (const target of targets) {
        if (!this.config.states.includes(target)) {
          throw new Error(`Transition target state '${target}' is not defined.`);
        }
      }
    }
  }

  /**
   * Attempts to transition the state machine from current_state to target_state.
   * Enforces rules, generates events, and guarantees Correlation ID presence.
   */
  async transition(context: BusinessContext, command: TransitionCommand): Promise<ExecutionResult<TransitionResult>> {
    if (!command.target_state) {
      return BusinessContextFactory.failure(context, "Target state must be provided.");
    }

    // 1. Validate Transition Matrix
    const allowedNext = this.config.transitions[command.current_state];
    if (!allowedNext || !allowedNext.includes(command.target_state)) {
      return BusinessContextFactory.failure(context, `Invalid transition from '${command.current_state}' to '${command.target_state}' for workflow '${this.config.workflow_type}'.`);
    }

    // 2. Execute Custom Validation Rules if defined
    if (this.config.validation_rules && this.config.validation_rules[command.target_state]) {
      const rule = this.config.validation_rules[command.target_state];
      const validationResult = await rule(context, command);
      
      if (validationResult !== true) {
        const errorMsg = typeof validationResult === 'string' ? validationResult : "State validation failed.";
        return BusinessContextFactory.failure(context, errorMsg);
      }
    }

    // Return the successful transition result wrapped in an immutable ExecutionResult
    return BusinessContextFactory.success(context, {
      from: command.current_state,
      to: command.target_state
    });
  }
}
