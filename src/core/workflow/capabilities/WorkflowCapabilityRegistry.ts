/**
 * DWIP Enterprise WOS - WorkflowCapabilityRegistry
 * Centralized Metadata, Dependencies & Conflict Declarations for 12 Capabilities
 */

import { WorkflowCapability } from '../WorkflowCapability';

export interface CapabilityMetadata {
  capability: WorkflowCapability;
  name: string;
  description: string;
  dependencies: WorkflowCapability[];
  conflictsWith: WorkflowCapability[];
}

export class WorkflowCapabilityRegistry {
  private static registry: Map<WorkflowCapability, CapabilityMetadata> = new Map();

  static {
    WorkflowCapabilityRegistry.registerDefaults();
  }

  private static registerDefaults(): void {
    const caps: CapabilityMetadata[] = [
      {
        capability: WorkflowCapability.FAST_TRACK,
        name: 'Fast-Track Intake & Processing',
        description: 'Bypasses standard multi-phase inspection steps for urgent intake',
        dependencies: [],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.SKIP_ESTIMATE,
        name: 'Skip Cost Estimation Approval',
        description: 'Bypasses customer/insurance estimate approval before starting work',
        dependencies: [],
        conflictsWith: [WorkflowCapability.CUSTOMER_APPROVAL_REQUIRED]
      },
      {
        capability: WorkflowCapability.OEM_PRE_APPROVAL,
        name: 'OEM Pre-Approval Verification',
        description: 'Requires mandatory OEM warranty claim authorization before work starts',
        dependencies: [],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.GM_CONCESSION_APPROVAL,
        name: 'GM Goodwill Concession Approval',
        description: 'Requires General Manager authorization for goodwill expense waiver',
        dependencies: [],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.PREPAID_CONTRACT,
        name: 'Prepaid Fleet Contract Processing',
        description: 'Pre-paid contract maintenance processing without gate payment collection',
        dependencies: [WorkflowCapability.SKIP_ESTIMATE],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.INTERNAL_DIRECT_WORK,
        name: 'Internal Stock Yard Direct Work',
        description: 'Internal vehicle refurbishing without customer billing',
        dependencies: [WorkflowCapability.SKIP_ESTIMATE],
        conflictsWith: [WorkflowCapability.CUSTOMER_APPROVAL_REQUIRED]
      },
      {
        capability: WorkflowCapability.QRT_DISPATCH,
        name: 'Quick Response Team (QRT) Breakdown Dispatch',
        description: 'Roadside assistance emergency response dispatch capability',
        dependencies: [WorkflowCapability.FAST_TRACK],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.RECALL_CAMPAIGN_WORK,
        name: 'OEM Recall Campaign Work Execution',
        description: 'Specialized OEM safety bulletin recall repair execution',
        dependencies: [WorkflowCapability.FAST_TRACK],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.DIRECT_BAY_ASSIGNMENT,
        name: 'Direct Workshop Bay Allocation',
        description: 'Allocates vehicle directly to repair bay at Gate In',
        dependencies: [WorkflowCapability.FAST_TRACK],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.CUSTOMER_APPROVAL_REQUIRED,
        name: 'Mandatory Customer Approval',
        description: 'Enforces mandatory customer estimate sign-off before work start',
        dependencies: [],
        conflictsWith: [WorkflowCapability.SKIP_ESTIMATE]
      },
      {
        capability: WorkflowCapability.ALLOW_PARTIAL_DELIVERY,
        name: 'Partial Vehicle Delivery Handover',
        description: 'Permits vehicle release prior to secondary accessory job completion',
        dependencies: [],
        conflictsWith: []
      },
      {
        capability: WorkflowCapability.MULTI_STAGE_APPROVAL,
        name: 'Multi-Stage Commercial Sign-off',
        description: 'Requires multi-level advisor and manager commercial sign-off',
        dependencies: [WorkflowCapability.CUSTOMER_APPROVAL_REQUIRED],
        conflictsWith: [WorkflowCapability.SKIP_ESTIMATE]
      }
    ];

    for (const c of caps) {
      WorkflowCapabilityRegistry.registry.set(c.capability, c);
    }
  }

  public static getMetadata(capability: WorkflowCapability): CapabilityMetadata | undefined {
    return WorkflowCapabilityRegistry.registry.get(capability);
  }

  public static isRegistered(capability: WorkflowCapability): boolean {
    return WorkflowCapabilityRegistry.registry.has(capability);
  }

  public static getAllCapabilities(): CapabilityMetadata[] {
    return Array.from(WorkflowCapabilityRegistry.registry.values());
  }
}
