import { randomUUID } from "crypto";
import { BusinessContext, ExecutionResult, BusinessContextFactory } from "./business-context";
import { IStorageProvider } from "./storage-provider";
import { IEventBus } from "./event-bus";
import { WorkflowRegistry } from "./workflow-registry";

export interface EvidenceRecord {
  evidence_id: string;
  entity_type: string;
  entity_id: string;
  workflow_type: string;
  evidence_type: string;
  storage_provider: string;
  storage_path: string;
  version: number;
  parent_version_id?: string;
  revision_reason?: string;
  lifecycle_status: "Created" | "Uploaded" | "Validated" | "Approved" | "Locked" | "Archived" | "Purged";
  is_locked: boolean;
  correlation_id: string;
  
  // Rich Metadata & AI Fields
  mime_type?: string;
  file_size?: number;
  original_name?: string;
  user_id?: string;
  gps_latitude?: string;
  gps_longitude?: string;
  device?: string;
  
  ai_review_status?: string;
  ai_classification?: string;
  ai_confidence?: number;
  duplicate_detected?: boolean;
}

export interface UploadEvidenceCommand {
  readonly evidence_type: string;
  readonly workflow_type: string;
  readonly fileBuffer: Buffer;
  readonly metadata?: any;
  readonly parent_version_id?: string;
  readonly revision_reason?: string;
}

export interface ValidationCommand {
  readonly evidence_id: string;
  readonly status: "Validated" | "Rejected";
  readonly reason?: string;
}

export interface CompletenessCommand {
  readonly workflow_type: string;
  readonly target_state: string;
}

export interface CompletenessScore {
  total_required: number;
  uploaded: number;
  missing: string[];
  completion_percentage: number;
}

export class EvidenceManagementEngine {
  constructor(
    private storage: IStorageProvider,
    private eventBus: IEventBus,
    private registry: WorkflowRegistry,
    private getDBState: () => any,
    private saveDBState: (state: any) => Promise<void>
  ) {}

  public async uploadEvidence(
    context: BusinessContext,
    command: UploadEvidenceCommand
  ): Promise<ExecutionResult<EvidenceRecord>> {
    const evidenceId = randomUUID();
    const uploadResult = await this.storage.upload(command.fileBuffer, command.metadata || {} as any);
    const storagePath = uploadResult.storage_path;

    const db = this.getDBState();
    let version = 1;

    // Handle immutable versioning
    if (command.parent_version_id) {
      const parent = db.evidence?.find((e: any) => e.evidence_id === command.parent_version_id);
      if (parent) {
        version = parent.version + 1;
        parent.lifecycle_status = "Archived"; // Parent is superseded
      }
    }

    const newEvidence: EvidenceRecord = {
      evidence_id: evidenceId,
      entity_type: context.identity.entity_type,
      entity_id: context.identity.entity_id,
      workflow_type: command.workflow_type,
      evidence_type: command.evidence_type,
      storage_provider: this.storage.provider_name,
      storage_path: storagePath,
      version,
      parent_version_id: command.parent_version_id,
      revision_reason: command.revision_reason,
      lifecycle_status: "Uploaded",
      is_locked: false,
      correlation_id: context.traceability.correlation_id,
      ...command.metadata,
      user_id: context.actor.user_id
    };

    if (!db.evidence) db.evidence = [];
    db.evidence.push(newEvidence);
    await this.saveDBState(db);

    const topic = version > 1 ? "EvidenceVersionCreated" : "EvidenceUploaded";
    await this.eventBus.publish(
      topic,
      newEvidence,
      context
    );

    return BusinessContextFactory.success(context, newEvidence);
  }

  public async validateEvidence(context: BusinessContext, command: ValidationCommand): Promise<ExecutionResult<void>> {
    const db = this.getDBState();
    const evidence = db.evidence?.find((e: any) => e.evidence_id === command.evidence_id);
    if (!evidence) {
      return BusinessContextFactory.failure(context, "Evidence not found");
    }

    evidence.lifecycle_status = command.status;
    await this.saveDBState(db);

    const topic = command.status === "Validated" ? "EvidenceValidated" : "EvidenceRejected";
    await this.eventBus.publish(
      topic,
      { evidence_id: command.evidence_id, reason: command.reason },
      context
    );

    return BusinessContextFactory.success(context, undefined);
  }

  public async lockEvidence(context: BusinessContext, evidenceId: string): Promise<ExecutionResult<void>> {
    const db = this.getDBState();
    const evidence = db.evidence?.find((e: any) => e.evidence_id === evidenceId);
    if (!evidence) {
      return BusinessContextFactory.failure(context, "Evidence not found");
    }

    evidence.is_locked = true;
    evidence.lifecycle_status = "Locked";
    await this.saveDBState(db);

    await this.eventBus.publish(
      "EvidenceLocked",
      { evidence_id: evidenceId },
      context
    );
    
    return BusinessContextFactory.success(context, undefined);
  }

  public calculateCompleteness(context: BusinessContext, command: CompletenessCommand): CompletenessScore {
    const workflow = this.registry.getWorkflow(command.workflow_type);
    if (!workflow || !workflow.evidence_profile) {
      return { total_required: 0, uploaded: 0, missing: [], completion_percentage: 100 };
    }

    const requirements = workflow.evidence_profile[command.target_state] || [];
    
    const db = this.getDBState();
    const uploadedForEntity = (db.evidence || []).filter(
      (e: any) => e.entity_type === context.identity.entity_type && 
                  e.entity_id === context.identity.entity_id && 
                  e.lifecycle_status !== "Archived" && 
                  e.lifecycle_status !== "Rejected"
    );

    let uploadedCount = 0;
    const missing: string[] = [];

    const mandatoryReqs = requirements.filter(r => r.is_mandatory);
    for (const req of mandatoryReqs) {
      const matchCount = uploadedForEntity.filter((e: any) => e.evidence_type === req.evidence_type).length;
      if (matchCount >= (req.min_quantity || 1)) {
        uploadedCount++;
      } else {
        missing.push(req.evidence_type);
      }
    }

    const totalRequired = mandatoryReqs.length;
    const completionPercentage = totalRequired === 0 ? 100 : Math.round((uploadedCount / totalRequired) * 100);

    return {
      total_required: totalRequired,
      uploaded: uploadedCount,
      missing,
      completion_percentage: completionPercentage
    };
  }
}
