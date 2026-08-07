import { ExternalProgramProvider } from "../common/provider-interface";
import { ExecutionResult } from "../../core/kernel-contracts";
import { BreakdownIncident } from "./incident-models";
import { providerOk } from "../common/provider-helpers";

export class BreakdownProvider implements ExternalProgramProvider<BreakdownIncident> {
  async initialize(payload: BreakdownIncident): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: BreakdownIncident): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: BreakdownIncident): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `BRK-REF-${Math.floor(Math.random() * 1000000)}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "ACTIVE", message: "Incident Tracking Active" });
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
