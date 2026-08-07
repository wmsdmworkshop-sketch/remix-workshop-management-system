import { globalEventBus, DomainEventEnvelope } from "./event-bus.ts";
import { EkgEngine } from "../engines/ekg-engine.ts";

export function initializeEkgEventListeners(): void {
  console.log("=== EKG Engine: Binding EventBus listeners ===");

  // Wildcard subscription to capture all domain events
  globalEventBus.subscribe("*", async (envelope: DomainEventEnvelope) => {
    try {
      const { topic, payload } = envelope;
      if (!payload) return;

      switch (topic) {
        case "JOB_CARD_CREATED":
        case "JOB_CREATED": {
          const { job_id, vin, vrn, customer_name, customer_mobile } = payload;
          if (!job_id) return;

          // 1. Build Nodes
          if (vin) {
            await EkgEngine.addNode(vin, "Vehicle", `Vehicle ${vin}`, { vin, vrn });
          }
          if (customer_mobile) {
            await EkgEngine.addNode(customer_mobile, "Customer", customer_name || `Customer ${customer_mobile}`, {
              contact_phone: customer_mobile
            });
          }
          const jobIdStr = String(job_id);
          await EkgEngine.addNode(jobIdStr, "JobCard", `Job Card #${job_id}`, { job_id });

          // 2. Build Edges
          if (customer_mobile && vin) {
            await EkgEngine.addEdge(customer_mobile, vin, "OWNS");
          }
          if (vin) {
            await EkgEngine.addEdge(vin, jobIdStr, "GENERATED");
          }
          break;
        }

        case "VEHICLE_RECEIVED":
        case "VEHICLE_ARRIVED": {
          const { vin, vrn, workshop_id } = payload;
          if (vin) {
            await EkgEngine.addNode(vin, "Vehicle", `Vehicle ${vin}`, { vin, vrn });
            if (workshop_id) {
              const workshopIdStr = `WORKSHOP-${workshop_id}`;
              await EkgEngine.addNode(workshopIdStr, "Workshop", `Workshop #${workshop_id}`, { workshop_id });
              await EkgEngine.addEdge(vin, workshopIdStr, "VISITED");
            }
          }
          break;
        }

        case "WORKFLOW_TRANSITIONED":
        case "JOB_STATE_TRANSITION_Ready":
        case "JOB_STATE_TRANSITION_Delivered": {
          const { jobId, newState, actorId, actorRole } = payload;
          if (jobId) {
            const jobIdStr = String(jobId);
            await EkgEngine.addNode(jobIdStr, "JobCard", `Job Card #${jobId}`, { status: newState });

            if (actorId && actorRole === "Technician") {
              const techIdStr = `TECH-${actorId}`;
              await EkgEngine.addNode(techIdStr, "Technician", `Technician #${actorId}`, { technician_id: actorId });
              await EkgEngine.addEdge(techIdStr, jobIdStr, "PERFORMED");
            }
          }
          break;
        }

        case "WARRANTY_CLAIM_SUBMITTED":
        case "WARRANTY_APPROVED":
        case "WARRANTY_REJECTED": {
          const { claim_id, claim_no, vin, status, causal_part_no } = payload;
          if (claim_id) {
            const claimIdStr = String(claim_id);
            await EkgEngine.addNode(claimIdStr, "WarrantyClaim", claim_no || `Claim ${claimIdStr}`, { status });

            if (vin) {
              await EkgEngine.addEdge(vin, claimIdStr, "GENERATED");
            }
            if (causal_part_no) {
              const partId = `PART-${causal_part_no}`;
              await EkgEngine.addNode(partId, "Part", `Part ${causal_part_no}`, { part_number: causal_part_no });
              await EkgEngine.addEdge(claimIdStr, partId, "USED_PART");
            }
          }
          break;
        }

        case "BREAKDOWN_LOGGED": {
          const { breakdown_id, vehicle_vin, location, causal_part_no } = payload;
          if (breakdown_id) {
            const bdIdStr = String(breakdown_id);
            await EkgEngine.addNode(bdIdStr, "Breakdown", `Breakdown ${bdIdStr}`, { location });

            if (vehicle_vin) {
              await EkgEngine.addNode(vehicle_vin, "Vehicle", `Vehicle ${vehicle_vin}`);
              await EkgEngine.addEdge(vehicle_vin, bdIdStr, "GENERATED");
            }
            if (causal_part_no) {
              const partId = `PART-${causal_part_no}`;
              await EkgEngine.addNode(partId, "Part", `Part ${causal_part_no}`, { part_number: causal_part_no });
              await EkgEngine.addEdge(bdIdStr, partId, "USED_PART");
            }
          }
          break;
        }

        case "AMC_RENEWED": {
          const { contract_id, fleet_passport_id, renewal_prediction } = payload;
          if (contract_id) {
            const contractIdStr = String(contract_id);
            await EkgEngine.addNode(contractIdStr, "AMCContract", `AMC Contract ${contractIdStr}`, { renewal_prediction });

            if (fleet_passport_id) {
              await EkgEngine.addEdge(fleet_passport_id, contractIdStr, "CONTAINS");
            }
          }
          break;
        }

        case "KNOWLEDGE_CREATED": {
          const { article_id, title, circular_reference } = payload;
          if (article_id) {
            const artIdStr = String(article_id);
            await EkgEngine.addNode(artIdStr, "KnowledgeArticle", title || `Article ${artIdStr}`, { circular_reference });

            if (circular_reference) {
              const circId = `CIRC-${circular_reference}`;
              await EkgEngine.addNode(circId, "ServiceCircular", `Circular ${circular_reference}`, { circular_code: circular_reference });
              await EkgEngine.addEdge(artIdStr, circId, "REFERENCED_CIRCULAR");
            }
          }
          break;
        }

        case "RECOMMENDATION_APPROVED": {
          const { recommendation_id, recommendation_type, details } = payload;
          if (recommendation_id) {
            const recNodeId = String(recommendation_id);
            await EkgEngine.addNode(recNodeId, "AIRecommendation", `AI Recommendation ${recNodeId}`, { recommendation_type, status: "APPROVED" });
            
            const targetId = details?.vin || details?.partNo || details?.customerId || details?.claimNo || details?.jobCardId;
            if (targetId) {
              const targetNodeId = String(targetId);
              await EkgEngine.addNode(targetNodeId, details?.vin ? "Vehicle" : details?.partNo ? "Part" : details?.customerId ? "Customer" : "JobCard", targetNodeId);
              await EkgEngine.addEdge(recNodeId, targetNodeId, "STRENGTHENS");
            }
          }
          break;
        }

        case "RECOMMENDATION_REJECTED": {
          const { recommendation_id, recommendation_type, details } = payload;
          if (recommendation_id) {
            const recNodeId = String(recommendation_id);
            await EkgEngine.addNode(recNodeId, "AIRecommendation", `AI Recommendation ${recNodeId}`, { recommendation_type, status: "REJECTED" });
            
            const targetId = details?.vin || details?.partNo || details?.customerId || details?.claimNo || details?.jobCardId;
            if (targetId) {
              const targetNodeId = String(targetId);
              await EkgEngine.addNode(targetNodeId, details?.vin ? "Vehicle" : details?.partNo ? "Part" : details?.customerId ? "Customer" : "JobCard", targetNodeId);
              await EkgEngine.addEdge(recNodeId, targetNodeId, "REJECTED_CASE");
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      console.warn(`[EKG Listener] Failed processing event topic "${envelope.topic}":`, err.message);
    }
  });
}
