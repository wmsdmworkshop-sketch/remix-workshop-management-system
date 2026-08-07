import { ExecutionResult } from "../../core/kernel-contracts";

const NOW = () => new Date().toISOString();
const CID = () => `SYS-${Date.now()}`;

/** Typed ok helper for ExternalProgramProvider implementations */
export function providerOk<T>(data?: T): ExecutionResult<T> {
  return Object.freeze({ success: true, data, timestamp: NOW(), correlation_id: CID() } as ExecutionResult<T>);
}

/** Typed fail helper for ExternalProgramProvider implementations */
export function providerFail<T>(error: string, error_code?: string): ExecutionResult<T> {
  return Object.freeze({ success: false, error, error_code: error_code as any, timestamp: NOW(), correlation_id: CID() } as ExecutionResult<T>);
}
