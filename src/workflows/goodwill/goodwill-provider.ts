import { ExternalProgramProvider } from "../common/provider-interface";
import { ExecutionResult } from "../../core/kernel-contracts";
import { GoodwillRequest } from "./goodwill-models";
import { providerOk } from "../common/provider-helpers";

export class GoodwillProvider implements ExternalProgramProvider<GoodwillRequest> {
  async initialize(payload: GoodwillRequest): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: GoodwillRequest): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: GoodwillRequest): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `GW-OEM-${Math.floor(Math.random() * 1000000)}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "PENDING_APPROVAL", message: "Awaiting OEM Review" });
  }

  async sync(reference: string): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async cancel(reference: string): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async close(reference: string): Promise<ExecutionResult<void>> {
    return providerOk();
  }
}
