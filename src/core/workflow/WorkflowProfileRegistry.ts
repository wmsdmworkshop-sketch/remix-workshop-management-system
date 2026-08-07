/**
 * DWIP Enterprise WOS - WorkflowProfileRegistry
 * Central Registry of Configurable Operational Workflow Profiles
 */

import { IWorkflowProfile } from './WorkflowProfile';
import { WorkflowCapability } from './WorkflowCapability';

export class WorkflowProfileRegistry {
  private static registry: Map<string, IWorkflowProfile> = new Map();

  static {
    WorkflowProfileRegistry.registerDefaults();
  }

  private static registerDefaults(): void {
    // 1. Standard Service Profile
    WorkflowProfileRegistry.registry.set('STANDARD_SERVICE', {
      code: 'STANDARD_SERVICE',
      name: 'Standard Workshop Service Workflow',
      description: 'Standard 9-state workshop maintenance lifecycle',
      permittedStates: [
        'GATE_IN',
        'INSPECTION',
        'ESTIMATION',
        'APPROVAL_PENDING',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['INSPECTION', 'ESTIMATION'],
        INSPECTION: ['ESTIMATION'],
        ESTIMATION: ['APPROVAL_PENDING', 'WORK_IN_PROGRESS'],
        APPROVAL_PENDING: ['WORK_IN_PROGRESS'],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: []
    });

    // 2. Breakdown Profile (Fast-Track)
    WorkflowProfileRegistry.registry.set('BREAKDOWN', {
      code: 'BREAKDOWN',
      name: 'Roadside Breakdown Emergency Workflow',
      description: 'Fast-track emergency intake skipping inspection & estimation steps',
      permittedStates: [
        'GATE_IN',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['WORK_IN_PROGRESS'],
        INSPECTION: [],
        ESTIMATION: [],
        APPROVAL_PENDING: [],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.FAST_TRACK, WorkflowCapability.SKIP_ESTIMATE, WorkflowCapability.QRT_DISPATCH]
    });

    // 3. Warranty Profile (OEM Pre-Approval)
    WorkflowProfileRegistry.registry.set('WARRANTY', {
      code: 'WARRANTY',
      name: 'OEM Warranty Claim Workflow',
      description: 'Mandatory OEM claim pre-approval before work execution',
      permittedStates: [
        'GATE_IN',
        'INSPECTION',
        'ESTIMATION',
        'APPROVAL_PENDING',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['INSPECTION'],
        INSPECTION: ['ESTIMATION'],
        ESTIMATION: ['APPROVAL_PENDING'],
        APPROVAL_PENDING: ['WORK_IN_PROGRESS'],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.OEM_PRE_APPROVAL]
    });

    // 4. AMC Profile (Pre-Paid Contract)
    WorkflowProfileRegistry.registry.set('AMC', {
      code: 'AMC',
      name: 'Annual Maintenance Contract (AMC) Workflow',
      description: 'Pre-paid fleet maintenance contract skipping approval steps',
      permittedStates: [
        'GATE_IN',
        'INSPECTION',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['INSPECTION'],
        INSPECTION: ['WORK_IN_PROGRESS'],
        ESTIMATION: [],
        APPROVAL_PENDING: [],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.PREPAID_CONTRACT, WorkflowCapability.SKIP_ESTIMATE]
    });

    // 5. Goodwill Profile (Dealer Concession)
    WorkflowProfileRegistry.registry.set('GOODWILL', {
      code: 'GOODWILL',
      name: 'Goodwill Concession Service Workflow',
      description: 'Goodwill repairs requiring General Manager concession approval',
      permittedStates: [
        'GATE_IN',
        'INSPECTION',
        'ESTIMATION',
        'APPROVAL_PENDING',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['INSPECTION'],
        INSPECTION: ['ESTIMATION'],
        ESTIMATION: ['APPROVAL_PENDING'],
        APPROVAL_PENDING: ['WORK_IN_PROGRESS'],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.GM_CONCESSION_APPROVAL]
    });

    // 6. FSB Campaign Profile
    WorkflowProfileRegistry.registry.set('FSB_CAMPAIGN', {
      code: 'FSB_CAMPAIGN',
      name: 'OEM Recall Campaign Workflow',
      description: 'OEM recall bulletin campaign fast-track repair',
      permittedStates: [
        'GATE_IN',
        'WORK_IN_PROGRESS',
        'QUALITY_CHECK',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['WORK_IN_PROGRESS'],
        INSPECTION: [],
        ESTIMATION: [],
        APPROVAL_PENDING: [],
        WORK_IN_PROGRESS: ['QUALITY_CHECK'],
        QUALITY_CHECK: ['WORK_IN_PROGRESS', 'READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.FAST_TRACK, WorkflowCapability.RECALL_CAMPAIGN_WORK]
    });

    // 7. Internal Workshop Profile
    WorkflowProfileRegistry.registry.set('INTERNAL', {
      code: 'INTERNAL',
      name: 'Internal Stock Yard Refurbishing Workflow',
      description: 'Internal vehicle refurbishing without external billing',
      permittedStates: [
        'GATE_IN',
        'WORK_IN_PROGRESS',
        'READY_FOR_DELIVERY',
        'GATE_OUT',
        'CLOSED'
      ],
      transitionGraph: {
        GATE_IN: ['WORK_IN_PROGRESS'],
        INSPECTION: [],
        ESTIMATION: [],
        APPROVAL_PENDING: [],
        WORK_IN_PROGRESS: ['READY_FOR_DELIVERY'],
        QUALITY_CHECK: [],
        READY_FOR_DELIVERY: ['GATE_OUT'],
        GATE_OUT: ['CLOSED'],
        CLOSED: []
      },
      capabilities: [WorkflowCapability.INTERNAL_DIRECT_WORK, WorkflowCapability.SKIP_ESTIMATE]
    });
  }

  public static getProfile(code: string): IWorkflowProfile | undefined {
    return WorkflowProfileRegistry.registry.get(code);
  }

  public static registerProfile(profile: IWorkflowProfile): void {
    WorkflowProfileRegistry.registry.set(profile.code, profile);
  }

  public static getAllProfiles(): IWorkflowProfile[] {
    return Array.from(WorkflowProfileRegistry.registry.values());
  }
}
