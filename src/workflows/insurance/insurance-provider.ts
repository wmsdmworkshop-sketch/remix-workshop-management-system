import { ExternalProgramProvider } from "../common/provider-interface";
import { ExecutionResult } from "../../core/kernel-contracts";
import { InsurancePolicy } from "./policy-models";
import { FleetContract } from "./fleet-contract-models";
import { providerOk } from "../common/provider-helpers";

export class InsuranceProvider implements ExternalProgramProvider<InsurancePolicy> {
  async initialize(payload: InsurancePolicy): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: InsurancePolicy): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: InsurancePolicy): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `INS-POL-${Math.floor(Math.random() * 1000000)}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "ACTIVE", message: "Policy Active" });
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

export class FleetContractProvider implements ExternalProgramProvider<FleetContract> {
  async initialize(payload: FleetContract): Promise<ExecutionResult<any>> {
    return providerOk();
  }

  async validate(payload: FleetContract): Promise<ExecutionResult<void>> {
    return providerOk();
  }

  async submit(payload: FleetContract): Promise<ExecutionResult<{ reference: string }>> {
    return providerOk({ reference: `FLT-CTR-${Math.floor(Math.random() * 1000000)}` });
  }

  async track(reference: string): Promise<ExecutionResult<{ status: string; message: string }>> {
    return providerOk({ status: "ACTIVE", message: "Contract Active" });
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
