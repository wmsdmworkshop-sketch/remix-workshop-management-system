import { CustomerFeedback } from "./feedback-models";

export class FeedbackEngine {
  static submitFeedback(jobCardId: string, customerId: string, nps: number, csat: number, comments: string): CustomerFeedback {
    const escalation = nps <= 6 || csat <= 3;
    
    return {
      feedback_id: `FB-${Math.floor(Math.random() * 10000)}`,
      job_card_id: jobCardId,
      customer_id: customerId,
      nps,
      csat,
      comments,
      complaints: [],
      escalation_required: escalation,
      status: "SUBMITTED"
    };
  }

  static resolveFeedback(feedback: CustomerFeedback): CustomerFeedback {
    return { ...feedback, status: "RESOLVED" };
  }
}
