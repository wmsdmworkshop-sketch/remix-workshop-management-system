import { ExternalProgramProvider } from "../common/provider-interface";
import { ExecutionResult } from "../../core/kernel-contracts";
import { AmcContract } from "./contract-models";
import { providerOk } from "../common/provider-helpers";

export class AmcProvider implements ExternalProgramProvider<AmcContract> {
  async initialize(payload: AmcContract): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: AmcContract): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: AmcContract): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `AMC-EXT-${Math.random()}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "ACTIVE", message: "Tracked externally" });
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
