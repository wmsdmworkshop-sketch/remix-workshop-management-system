import { Estimate } from "./estimate-models";

export class EstimateEngine {
  static createEstimate(jobCardId: string, labour: number, parts: number, outside: number, consumables: number): Estimate {
    const total = labour + parts + outside + consumables;
    const taxes = total * 0.18; // Mock 18% tax
    
    return {
      estimate_id: `EST-${Math.floor(Math.random() * 10000)}`,
      job_card_id: jobCardId,
      labour_estimate: labour,
      parts_estimate: parts,
      outside_labour: outside,
      consumables,
      taxes,
      discount: 0,
      total_amount: total + taxes,
      approval_status: "PENDING",
      revision_history: []
    };
  }

  static reviseEstimate(estimate: Estimate, newLabour: number, newParts: number): Estimate {
    const newTotal = newLabour + newParts + estimate.outside_labour + estimate.consumables;
    const taxes = newTotal * 0.18;
    const revisedAmount = newTotal + taxes;

    return {
      ...estimate,
      labour_estimate: newLabour,
      parts_estimate: newParts,
      taxes,
      total_amount: revisedAmount,
      revision_history: [
        ...estimate.revision_history,
        { revision: estimate.revision_history.length + 1, amount: revisedAmount, timestamp: new Date().toISOString() }
      ]
    };
  }
}
