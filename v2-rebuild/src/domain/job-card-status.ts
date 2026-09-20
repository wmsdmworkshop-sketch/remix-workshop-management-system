/**
 * Workshop ERP v2 — job-card status model.
 *
 * SOURCE OF TRUTH: `v2-rebuild/PROJECT_MEMORY.md` §4.2 (the PROPOSED v2 model),
 * with actor and guard rules taken from §5.1–§5.16 only where those sections
 * actually state them.
 *
 * ============================================================================
 * THIS IS NOT DWIP.
 * ============================================================================
 * None of these statuses exists in production. §4.1 records the measured
 * reality: `job_card_master.live_status` holds `GATE_OUT` (442 rows), `Waiting`
 * (116), `Unassigned` (85), `Assigned` (10), `FLOOR_ALLOCATED` (9),
 * `GATE_ENTRY_DONE` (7), `BILLING_IN_PROGRESS` (1) and one value containing an
 * emoji. Applying anything in this file to the live database would orphan all
 * 671 job cards. This module must never be imported by `server.ts` or anything
 * under `src/`.
 *
 * Contains no database access, no HTTP, no framework imports, and no DWIP
 * imports. Pure data plus one decision function.
 *
 * ----------------------------------------------------------------------------
 * DESIGN NOTE — where the spec is silent, this file stays silent
 * ----------------------------------------------------------------------------
 * §2.2 forbids assuming "a role has permissions merely because it is
 * operationally convenient", and §13 requires open items to be raised as
 * decisions rather than filled with generic assumptions. So every transition
 * carries an `authorityBasis`:
 *
 *   'explicit'    — the spec states who performs it.
 *   'implied'     — the spec states the action and the actor, but not that the
 *                   actor performs *this transition*. A reading, not a quote.
 *   'unspecified' — the spec does not say. `roles` is empty and
 *                   `canTransition()` refuses by default.
 *
 * The unspecified set is asserted by exact match in the test file, so it stays
 * a visible checklist rather than a quiet gap.
 */

// ---------------------------------------------------------------------------
// Status vocabulary — PROJECT_MEMORY.md §4.2
// ---------------------------------------------------------------------------

/**
 * §4.2 numbered the sequence 1–13, but annotated two of those entries
 * ("estimate-pending-customer", "waiting-for-parts") as *sub-statuses* of an
 * earlier entry. This module takes the annotation at its word: the top-level
 * machine has 11 statuses, and those two are sub-statuses. Every entry in
 * `SPEC_4_2_ENTRIES` maps to exactly one modelled element, and the test file
 * asserts that mapping is total in both directions.
 */
export const JOB_CARD_STATUSES = [
  'gated-in',
  'reception',
  'with-workshop-manager',
  'with-sa',
  'on-floor',
  'paused-vendor',
  'qc',
  'pre-invoice',
  'waiting-for-payment',
  'payment-received-invoice-generated',
  'closed',
] as const;

export type JobCardStatus = (typeof JOB_CARD_STATUSES)[number];

/**
 * Sub-statuses refine a parent status; they do not replace it. Moving between
 * them is not a status change.
 *
 * The first three come from the unnumbered bullets under §4.2 entry 4. They are
 * **independent gates, not a sequence** — §5.4 states plainly that "Customer
 * approval, OEM CRM job-card raise, and floor allocation are independent
 * gates", and §2.2 forbids assuming a sequence where the business rules define
 * independence.
 */
export const JOB_CARD_SUB_STATUSES = [
  // bullets under §4.2 entry 4 (`with-sa`)
  'estimate-building',
  'oem-job-card-raise-decision',
  'floor-allocation-decision',
  // §4.2 entry 5
  'estimate-pending-customer',
  // §4.2 entry 7
  'waiting-for-parts',
] as const;

export type JobCardSubStatus = (typeof JOB_CARD_SUB_STATUSES)[number];

export type JobCardNode = JobCardStatus | JobCardSubStatus;

/** Which parent status each sub-status refines. */
export const SUB_STATUS_PARENT: Readonly<Record<JobCardSubStatus, JobCardStatus>> = {
  'estimate-building': 'with-sa',
  'oem-job-card-raise-decision': 'with-sa',
  'floor-allocation-decision': 'with-sa',
  'estimate-pending-customer': 'with-sa',
  'waiting-for-parts': 'on-floor',
};

/**
 * Not every sub-status is a place you travel *to*.
 *
 * §5.4 makes the three gates under entry 4 independent, which means they are all
 * open the moment the job reaches `with-sa`. They are work-items inside that
 * status, not sequential steps — and so no transition targets them. §2.2 forbids
 * assuming a sequence where the business rules define independence, so the
 * distinction is modelled explicitly rather than flattened away.
 *
 * 'concurrent-gate' — opened by entering the parent status; not a transition node.
 * 'sequential-step' — entered and left by a transition.
 */
export type SubStatusKind = 'concurrent-gate' | 'sequential-step';

export const SUB_STATUS_KIND: Readonly<Record<JobCardSubStatus, SubStatusKind>> = {
  'estimate-building': 'concurrent-gate',
  'oem-job-card-raise-decision': 'concurrent-gate',
  'floor-allocation-decision': 'concurrent-gate',
  'estimate-pending-customer': 'sequential-step',
  'waiting-for-parts': 'sequential-step',
};

/** Nodes a transition can legitimately arrive at or leave. */
export const TRANSITION_NODES: readonly JobCardNode[] = [
  ...JOB_CARD_STATUSES,
  ...JOB_CARD_SUB_STATUSES.filter((subStatus) => SUB_STATUS_KIND[subStatus] === 'sequential-step'),
];

/**
 * The three independent `with-sa` gates (§5.4). Order carries no meaning.
 * `floor-allocation-decision` is the only one that gates `with-sa → on-floor`.
 */
export const WITH_SA_INDEPENDENT_GATES = [
  'estimate-building',
  'oem-job-card-raise-decision',
  'floor-allocation-decision',
] as const satisfies readonly JobCardSubStatus[];

/** A job card is finished when it leaves this set. §4.3 tracks the vehicle on. */
export const TERMINAL_STATUSES = ['closed'] as const satisfies readonly JobCardStatus[];

// ---------------------------------------------------------------------------
// Roles — labels only, NOT identifiers
// ---------------------------------------------------------------------------

/**
 * §13 lists "Exact role list and role identifiers in the production database"
 * as an open item that agents "must not fill … with generic assumptions".
 *
 * So these keys are **kebab-case labels derived from §5's section headings** —
 * a naming of what the spec names, not an invention of database identifiers.
 * Binding them to real IDs is a decision the owner still owes.
 *
 * Deliberately excluded, because §5 does not describe them as actors:
 *   - §5.10 "Ready-for-billing" is a check performed by Spare Parts and the
 *     Warranty Team, not a role.
 *   - §5.13 "Gate-Out" is a process; §5.13 assigns the phone-confirmation
 *     fallback to Security, which is already listed.
 *   - §5.16 "Vendors" is an external party category, not an internal role.
 *   - §5.20 "Housekeeping is an attendance record only, not an operational
 *     entity", and "No separate plain-driver role" exists.
 */
export const ROLES = {
  'security': { label: 'Security', specSection: '5.1' },
  'reception': { label: 'Reception', specSection: '5.2' },
  'workshop-manager': { label: 'Workshop Manager', specSection: '5.3' },
  'service-adviser': { label: 'Service Adviser (SA)', specSection: '5.4' },
  'floor-in-charge': { label: 'Floor In-Charge', specSection: '5.5' },
  'technician': { label: 'Technician', specSection: '5.6' },
  'spare-parts': { label: 'Spare Parts', specSection: '5.8' },
  'qc': { label: 'QC', specSection: '5.9' },
  'warranty-team': { label: 'Warranty Team', specSection: '5.11' },
  'billing': { label: 'Billing', specSection: '5.12' },
  'gm-service': { label: 'GM Service', specSection: '5.14' },
  'breakdown-in-charge': { label: 'Breakdown In-Charge', specSection: '5.17' },
  'tools-in-charge': { label: 'Tools In-Charge', specSection: '5.18' },
  'csc-cro': { label: 'CSC/CRO', specSection: '5.19' },
} as const;

export type RoleKey = keyof typeof ROLES;

// ---------------------------------------------------------------------------
// Guards — facts the caller asserts, never computed here
// ---------------------------------------------------------------------------

export interface GuardDefinition {
  readonly description: string;
  readonly citation: string;
}

export const GUARDS = {
  'floor-allocation-decided': {
    description: 'SA has made the independent floor-allocation decision for this job card.',
    citation: 'PROJECT_MEMORY.md §5.4, §5.5',
  },
  'tool-return-check-complete': {
    description: 'Tool-return and similar checks are complete.',
    citation: 'PROJECT_MEMORY.md §4.2 ("Tool-return and similar checks occur before QC")',
  },
  'qc-verdict-pass': {
    description: 'QC has recorded a pass verdict.',
    citation: 'PROJECT_MEMORY.md §5.9 ("Marks ready for billing")',
  },
  'qc-verdict-fail': {
    description: 'QC has recorded a fail/rework verdict.',
    citation: 'PROJECT_MEMORY.md §5.9 ("QC failure routes back to on-floor")',
  },
  'parts-issued-confirmed': {
    description:
      'Spare Parts confirmation: parts issued, and warranty parts shipped where applicable.',
    citation: 'PROJECT_MEMORY.md §5.10 (confirmation 1 of 2)',
  },
  'warranty-team-confirmed': {
    description: 'Warranty Team confirmation: indent raised, evidence captured, approvals where applicable.',
    citation: 'PROJECT_MEMORY.md §5.10 (confirmation 2 of 2)',
  },
  'vendor-send-out-reason-logged': {
    description: 'Floor In-Charge has logged the send-out reason.',
    citation: 'PROJECT_MEMORY.md §5.16',
  },
} as const satisfies Readonly<Record<string, GuardDefinition>>;

export type GuardKey = keyof typeof GUARDS;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export type AuthorityBasis = 'explicit' | 'implied' | 'unspecified';

export interface JobCardTransition {
  readonly id: string;
  readonly from: JobCardNode;
  readonly to: JobCardNode;
  readonly trigger: string;
  /** Empty exactly when `authorityBasis` is 'unspecified'. Asserted in tests. */
  readonly roles: readonly RoleKey[];
  readonly authorityBasis: AuthorityBasis;
  readonly guards: readonly GuardKey[];
  readonly citations: readonly string[];
}

/**
 * The legal moves, and nothing else.
 *
 * Not modelled here, deliberately:
 *  - Warranty/AMC/FMS classification changes and parts requisition. §4.2 is
 *    explicit that these are "parallel tracks, not separate primary job-card
 *    statuses", so they must not appear as transitions.
 *  - Gate-out. §4.3 puts the vehicle on its own status axis which continues
 *    *after* job-card closure, so it is a separate machine, not a status here.
 *  - Technician/bay assignment. §5.5 makes that Floor In-Charge's exclusive
 *    call, but §4.2 gives it no status of its own.
 */
export const JOB_CARD_TRANSITIONS: readonly JobCardTransition[] = [
  {
    id: 'T01',
    from: 'gated-in',
    to: 'reception',
    trigger: 'Vehicle handed from the gate to reception.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §4.2'],
  },
  {
    id: 'T02',
    from: 'reception',
    to: 'with-workshop-manager',
    trigger:
      'Reception hand-off after complaint capture and SA suggestion. Starts the Workshop Manager 5-minute SLA.',
    roles: ['reception'],
    authorityBasis: 'implied',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.2', 'PROJECT_MEMORY.md §4.2'],
  },
  {
    id: 'T03',
    from: 'with-workshop-manager',
    to: 'with-sa',
    trigger: 'Workshop Manager confirms, or overrides and reassigns, the suggested SA.',
    roles: ['workshop-manager'],
    authorityBasis: 'explicit',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.3', 'PROJECT_MEMORY.md §5.4'],
  },
  {
    id: 'T04',
    from: 'with-sa',
    to: 'on-floor',
    trigger: 'SA makes the independent floor-allocation decision.',
    roles: ['service-adviser'],
    authorityBasis: 'explicit',
    guards: ['floor-allocation-decided'],
    citations: ['PROJECT_MEMORY.md §5.4', 'PROJECT_MEMORY.md §5.5'],
  },
  {
    id: 'T05',
    from: 'with-sa',
    to: 'estimate-pending-customer',
    trigger: 'Estimate shared with the customer and awaiting approval.',
    roles: ['service-adviser'],
    authorityBasis: 'implied',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.4', 'PROJECT_MEMORY.md §4.2'],
  },
  {
    id: 'T06',
    from: 'estimate-pending-customer',
    to: 'with-sa',
    trigger: 'Customer approval captured (WhatsApp, call, in-person, or via driver).',
    roles: ['service-adviser'],
    authorityBasis: 'implied',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.4'],
  },
  {
    id: 'T07',
    from: 'on-floor',
    to: 'waiting-for-parts',
    trigger: 'Parts requested and not yet issued.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.6', 'PROJECT_MEMORY.md §5.8'],
  },
  {
    id: 'T08',
    from: 'waiting-for-parts',
    to: 'on-floor',
    trigger: 'Parts issued; work resumes.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.6'],
  },
  {
    id: 'T09',
    from: 'on-floor',
    to: 'paused-vendor',
    trigger: 'SA initiates vendor send-out; job card pauses.',
    roles: ['service-adviser'],
    authorityBasis: 'implied',
    guards: ['vendor-send-out-reason-logged'],
    citations: ['PROJECT_MEMORY.md §5.16', 'PROJECT_MEMORY.md §4.2'],
  },
  {
    id: 'T10',
    from: 'paused-vendor',
    to: 'on-floor',
    trigger: 'Vendor returns the work; the same technician resumes.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §4.2', 'PROJECT_MEMORY.md §5.16'],
  },
  {
    id: 'T11',
    from: 'on-floor',
    to: 'qc',
    trigger: 'Work complete and pre-QC checks passed.',
    roles: ['qc', 'floor-in-charge'],
    authorityBasis: 'explicit',
    guards: ['tool-return-check-complete'],
    citations: ['PROJECT_MEMORY.md §4.2', 'PROJECT_MEMORY.md §5.9'],
  },
  {
    id: 'T12',
    from: 'qc',
    to: 'on-floor',
    trigger: 'QC failure — routes back to the floor for rework.',
    roles: ['qc'],
    authorityBasis: 'explicit',
    guards: ['qc-verdict-fail'],
    citations: ['PROJECT_MEMORY.md §4.2', 'PROJECT_MEMORY.md §5.9'],
  },
  {
    id: 'T13',
    from: 'qc',
    to: 'pre-invoice',
    trigger: 'QC passes and marks the vehicle ready for billing.',
    roles: ['qc'],
    authorityBasis: 'explicit',
    guards: ['qc-verdict-pass', 'parts-issued-confirmed', 'warranty-team-confirmed'],
    citations: ['PROJECT_MEMORY.md §5.9', 'PROJECT_MEMORY.md §5.10'],
  },
  {
    id: 'T14',
    from: 'pre-invoice',
    to: 'waiting-for-payment',
    trigger: 'Invoice raised and payment awaited.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §4.2', 'PROJECT_MEMORY.md §5.12'],
  },
  {
    id: 'T15',
    from: 'waiting-for-payment',
    to: 'payment-received-invoice-generated',
    trigger: 'Payment received and final invoice generated.',
    roles: ['billing'],
    authorityBasis: 'implied',
    guards: [],
    citations: ['PROJECT_MEMORY.md §5.12', 'PROJECT_MEMORY.md §4.2'],
  },
  {
    id: 'T16',
    from: 'payment-received-invoice-generated',
    to: 'closed',
    trigger:
      'Job card closed at invoice generation. Independent of the vehicle, which §4.3 tracks separately until it exits.',
    roles: [],
    authorityBasis: 'unspecified',
    guards: [],
    citations: ['PROJECT_MEMORY.md §4.2', 'PROJECT_MEMORY.md §4.3'],
  },
];

/**
 * Creation is not a transition — there is no source status — so it lives
 * outside the table. §5.1: "Security has create-only access to gate-in data and
 * no edit rights", and "Security creates an internal/temporary job-card ID at
 * gate-in."
 */
export const JOB_CARD_CREATION = {
  createsStatus: 'gated-in',
  roles: ['security'],
  authorityBasis: 'explicit',
  citations: ['PROJECT_MEMORY.md §5.1'],
} as const satisfies {
  createsStatus: JobCardStatus;
  roles: readonly RoleKey[];
  authorityBasis: AuthorityBasis;
  citations: readonly string[];
};

// ---------------------------------------------------------------------------
// §4.2 traceability table
// ---------------------------------------------------------------------------

/**
 * The 13 numbered entries of §4.2, mapped to what this module models. Exists so
 * a reader can diff the code against the spec by eye, and so the test file can
 * assert the mapping is total.
 */
export const SPEC_4_2_ENTRIES = [
  { ordinal: 1, specName: 'gated-in', kind: 'status', key: 'gated-in' },
  { ordinal: 2, specName: 'reception', kind: 'status', key: 'reception' },
  { ordinal: 3, specName: 'with-workshop-manager', kind: 'status', key: 'with-workshop-manager' },
  { ordinal: 4, specName: 'with-sa', kind: 'status', key: 'with-sa' },
  {
    ordinal: 5,
    specName: 'estimate-pending-customer',
    kind: 'sub-status',
    key: 'estimate-pending-customer',
    specAnnotation: 'Sub-status under `with-sa`',
  },
  { ordinal: 6, specName: 'on-floor', kind: 'status', key: 'on-floor' },
  {
    ordinal: 7,
    specName: 'waiting-for-parts',
    kind: 'sub-status',
    key: 'waiting-for-parts',
    specAnnotation: 'Sub-status under `on-floor`',
  },
  { ordinal: 8, specName: 'paused-vendor', kind: 'status', key: 'paused-vendor' },
  { ordinal: 9, specName: 'qc', kind: 'status', key: 'qc' },
  { ordinal: 10, specName: 'pre-invoice', kind: 'status', key: 'pre-invoice' },
  { ordinal: 11, specName: 'waiting-for-payment', kind: 'status', key: 'waiting-for-payment' },
  {
    ordinal: 12,
    specName: 'payment-received-invoice-generated',
    kind: 'status',
    key: 'payment-received-invoice-generated',
  },
  { ordinal: 13, specName: 'closed', kind: 'status', key: 'closed' },
] as const satisfies readonly {
  ordinal: number;
  specName: string;
  kind: 'status' | 'sub-status';
  key: JobCardNode;
  specAnnotation?: string;
}[];

/** Unnumbered bullets under §4.2 entry 4 — the remaining `with-sa` gates. */
export const SPEC_4_2_ENTRY_4_BULLETS = [
  { specName: 'Estimate building', key: 'estimate-building' },
  { specName: 'OEM job-card raise decision', key: 'oem-job-card-raise-decision' },
  { specName: 'Floor-allocation decision', key: 'floor-allocation-decision' },
] as const satisfies readonly { specName: string; key: JobCardSubStatus }[];

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

export interface TransitionRequest {
  readonly from: JobCardNode;
  readonly to: JobCardNode;
  /** Required. §6: "Backend must enforce permissions." */
  readonly role: RoleKey;
  /** Facts the caller asserts. This module never computes them. */
  readonly satisfiedGuards?: Iterable<GuardKey>;
}

export type TransitionOutcome =
  | 'allowed'
  | 'denied-unknown-transition'
  | 'denied-unspecified-authority'
  | 'denied-guard'
  | 'denied-role';

export interface TransitionDecision {
  readonly outcome: TransitionOutcome;
  readonly transition: JobCardTransition | null;
  /** Guards the caller did not assert. Empty unless outcome is 'denied-guard'. */
  readonly missingGuards: readonly GuardKey[];
  readonly reason: string;
}

function findTransition(from: JobCardNode, to: JobCardNode): JobCardTransition | undefined {
  return JOB_CARD_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

/**
 * Decide whether one transition may proceed.
 *
 * Fails closed. An `'unspecified'` authority is refused rather than permitted:
 * the spec does not say who may perform it, and §2.2 forbids inventing a role
 * because it is operationally convenient.
 */
export function canTransition(request: TransitionRequest): TransitionDecision {
  const transition = findTransition(request.from, request.to);

  if (!transition) {
    return {
      outcome: 'denied-unknown-transition',
      transition: null,
      missingGuards: [],
      reason: `§4.2 defines no legal move from "${request.from}" to "${request.to}".`,
    };
  }

  if (transition.authorityBasis === 'unspecified') {
    return {
      outcome: 'denied-unspecified-authority',
      transition,
      missingGuards: [],
      reason:
        `${transition.id} (${transition.from} → ${transition.to}) has no authority defined in ` +
        'PROJECT_MEMORY.md. §13 requires this to be raised as a decision, not assumed.',
    };
  }

  const satisfied = new Set(request.satisfiedGuards ?? []);
  const missingGuards = transition.guards.filter((guard) => !satisfied.has(guard));

  if (missingGuards.length > 0) {
    return {
      outcome: 'denied-guard',
      transition,
      missingGuards,
      reason: `${transition.id} is blocked by unmet preconditions: ${missingGuards.join(', ')}.`,
    };
  }

  if (!transition.roles.includes(request.role)) {
    return {
      outcome: 'denied-role',
      transition,
      missingGuards: [],
      reason:
        `${transition.id} is restricted to ${transition.roles.join(', ') || 'nobody'}; ` +
        `"${request.role}" may not perform it.`,
    };
  }

  return {
    outcome: 'allowed',
    transition,
    missingGuards: [],
    reason: `${transition.id} allowed for "${request.role}".`,
  };
}

/** Every target reachable from a node by a transition of any authority basis. */
export function nextNodes(from: JobCardNode): readonly JobCardNode[] {
  return JOB_CARD_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

/** True when the node is `closed`, which has no outgoing transitions. */
export function isTerminal(node: JobCardNode): boolean {
  return (TERMINAL_STATUSES as readonly JobCardNode[]).includes(node);
}
