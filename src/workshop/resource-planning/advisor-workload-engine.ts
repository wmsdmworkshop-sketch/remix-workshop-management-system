import { AdvisorCapacity } from "./advisor-capacity-models";

export class AdvisorWorkloadEngine {
  static canAssignJob(advisor: AdvisorCapacity, maxJobs: number): boolean {
    return advisor.open_job_cards < maxJobs;
  }

  static assignJob(advisor: AdvisorCapacity, jobCardId: string): AdvisorCapacity {
    return {
      ...advisor,
      assigned_job_cards: [...advisor.assigned_job_cards, jobCardId],
      open_job_cards: advisor.open_job_cards + 1
    };
  }

  static closeJob(advisor: AdvisorCapacity, jobCardId: string): AdvisorCapacity {
    return {
      ...advisor,
      open_job_cards: Math.max(0, advisor.open_job_cards - 1)
    };
  }
}
