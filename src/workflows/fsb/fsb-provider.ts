import { ExternalProgramProvider } from "../common/provider-interface";
import { ExecutionResult } from "../../core/kernel-contracts";
import { FsbCampaign } from "./campaign-models";
import { providerOk } from "../common/provider-helpers";

export class FsbProvider implements ExternalProgramProvider<FsbCampaign> {
  async initialize(payload: FsbCampaign): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: FsbCampaign): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: FsbCampaign): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `FSB-OEM-${Math.floor(Math.random() * 1000000)}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "ACTIVE", message: "Campaign Active in OEM Portal" });
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
