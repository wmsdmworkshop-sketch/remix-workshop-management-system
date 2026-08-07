import { ExecutionResult } from "../../core";

export interface ExternalProgramProvider<T = any> {
  initialize(payload: T): Promise<ExecutionResult<any>>;
  validate(payload: T): Promise<ExecutionResult<void>>;
  submit(payload: T): Promise<ExecutionResult<{ reference: string }>>;
  track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>>;
  sync(reference: string): Promise<ExecutionResult<void>>;
  cancel(reference: string): Promise<ExecutionResult<void>>;
  close(reference: string): Promise<ExecutionResult<void>>;
}
