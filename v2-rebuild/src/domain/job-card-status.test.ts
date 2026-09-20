import { describe, expect, it } from 'vitest';

import {
  GUARDS,
  JOB_CARD_CREATION,
  JOB_CARD_STATUSES,
  JOB_CARD_SUB_STATUSES,
  JOB_CARD_TRANSITIONS,
  ROLES,
  SPEC_4_2_ENTRIES,
  SPEC_4_2_ENTRY_4_BULLETS,
  SUB_STATUS_KIND,
  SUB_STATUS_PARENT,
  TRANSITION_NODES,
  WITH_SA_INDEPENDENT_GATES,
  canTransition,
  isTerminal,
  nextNodes,
} from './job-card-status';
import type {
  GuardKey,
  JobCardNode,
  JobCardSubStatus,
  JobCardTransition,
  RoleKey,
} from './job-card-status';

const ALL_NODES: readonly JobCardNode[] = [...JOB_CARD_STATUSES, ...JOB_CARD_SUB_STATUSES];

const isSubStatus = (node: JobCardNode): node is JobCardSubStatus =>
  (JOB_CARD_SUB_STATUSES as readonly string[]).includes(node);

const transition = (id: string): JobCardTransition => {
  const found = JOB_CARD_TRANSITIONS.find((t) => t.id === id);
  if (!found) throw new Error(`No transition ${id}`);
  return found;
};

const idsWhere = (predicate: (t: JobCardTransition) => boolean): string[] =>
  JOB_CARD_TRANSITIONS.filter(predicate).map((t) => t.id).sort();

// ---------------------------------------------------------------------------
// Traceability against PROJECT_MEMORY.md §4.2
// ---------------------------------------------------------------------------

describe('§4.2 traceability', () => {
  it('accounts for all 13 numbered entries exactly once', () => {
    expect(SPEC_4_2_ENTRIES).toHaveLength(13);
    expect([...SPEC_4_2_ENTRIES.map((e) => e.ordinal)].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);

    const keys = SPEC_4_2_ENTRIES.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('honours the spec’s own annotation that entries 5 and 7 are sub-statuses', () => {
    const subStatusEntries = SPEC_4_2_ENTRIES.filter(
      (e): e is Extract<(typeof SPEC_4_2_ENTRIES)[number], { kind: 'sub-status' }> =>
        e.kind === 'sub-status',
    );

    expect(subStatusEntries.map((e) => e.key).sort()).toEqual([
      'estimate-pending-customer',
      'waiting-for-parts',
    ]);
    // Both carry the annotation, which is why they are not top-level statuses.
    for (const entry of subStatusEntries) {
      expect(entry.specAnnotation).toMatch(/^Sub-status under `.+`$/);
    }
  });

  it('models every status the spec numbers as a status', () => {
    const statusEntries = SPEC_4_2_ENTRIES.filter((e) => e.kind === 'status').map((e) => e.key);
    expect([...statusEntries].sort()).toEqual([...JOB_CARD_STATUSES].sort());
    expect(JOB_CARD_STATUSES).toHaveLength(11);
  });

  it('models every sub-status the spec names, and no others', () => {
    const fromAnnotations = SPEC_4_2_ENTRIES.filter((e) => e.kind === 'sub-status').map((e) => e.key);
    const fromBullets = SPEC_4_2_ENTRY_4_BULLETS.map((b) => b.key);

    expect([...fromAnnotations, ...fromBullets].sort()).toEqual([...JOB_CARD_SUB_STATUSES].sort());
    expect(SPEC_4_2_ENTRY_4_BULLETS).toHaveLength(3);
  });

  it('parents every sub-status to a real status', () => {
    for (const subStatus of JOB_CARD_SUB_STATUSES) {
      expect(JOB_CARD_STATUSES).toContain(SUB_STATUS_PARENT[subStatus]);
    }
  });

  it('classifies every sub-status as either a gate or a step', () => {
    for (const subStatus of JOB_CARD_SUB_STATUSES) {
      expect(['concurrent-gate', 'sequential-step'], subStatus).toContain(
        SUB_STATUS_KIND[subStatus],
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Table invariants
// ---------------------------------------------------------------------------

describe('transition table invariants', () => {
  it('has unique ids', () => {
    const ids = JOB_CARD_TRANSITIONS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only ever references known nodes', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      expect(ALL_NODES, `${t.id} from`).toContain(t.from);
      expect(ALL_NODES, `${t.id} to`).toContain(t.to);
    }
  });

  it('only ever references declared guards', () => {
    const declared = Object.keys(GUARDS);
    for (const t of JOB_CARD_TRANSITIONS) {
      for (const guard of t.guards) {
        expect(declared, `${t.id} → ${guard}`).toContain(guard);
      }
    }
  });

  it('only ever references declared roles', () => {
    const declared = Object.keys(ROLES);
    for (const t of JOB_CARD_TRANSITIONS) {
      for (const role of t.roles) {
        expect(declared, `${t.id} → ${role}`).toContain(role);
      }
    }
  });

  it('carries at least one spec citation on every transition', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      expect(t.citations.length, t.id).toBeGreaterThan(0);
      for (const citation of t.citations) {
        expect(citation, t.id).toMatch(/^PROJECT_MEMORY\.md §/);
      }
    }
  });

  it('has no self-transitions', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      expect(t.from, t.id).not.toBe(t.to);
    }
  });

  it('leaves roles empty exactly when authority is unspecified', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      const empty = t.roles.length === 0;
      expect(empty, `${t.id} roles/basis mismatch`).toBe(t.authorityBasis === 'unspecified');
    }
  });

  it('leaves a sub-status only via its own parent, or a sibling', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      if (!isSubStatus(t.from)) continue;

      const sameParent = isSubStatus(t.to) && SUB_STATUS_PARENT[t.to] === SUB_STATUS_PARENT[t.from];
      const toParent = t.to === SUB_STATUS_PARENT[t.from];

      expect(sameParent || toParent, `${t.id}: ${t.from} → ${t.to} escapes its parent`).toBe(true);
    }
  });

  it('enters a sub-status only from its own parent, or a sibling', () => {
    for (const t of JOB_CARD_TRANSITIONS) {
      if (!isSubStatus(t.to)) continue;

      const sameParent = isSubStatus(t.from) && SUB_STATUS_PARENT[t.from] === SUB_STATUS_PARENT[t.to];
      const fromParent = t.from === SUB_STATUS_PARENT[t.to];

      expect(sameParent || fromParent, `${t.id}: ${t.from} → ${t.to} crosses parents`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

describe('reachability', () => {
  it('treats `closed` as terminal', () => {
    expect(isTerminal('closed')).toBe(true);
    expect(nextNodes('closed')).toEqual([]);
  });

  it('reaches `closed` only from `payment-received-invoice-generated`', () => {
    expect(idsWhere((t) => t.to === 'closed')).toEqual(['T16']);
  });

  it('gives every non-terminal transition node an outgoing move', () => {
    for (const node of TRANSITION_NODES) {
      if (isTerminal(node)) continue;
      expect(nextNodes(node).length, `${node} is a dead end`).toBeGreaterThan(0);
    }
  });

  it('reaches every transition node from `gated-in`', () => {
    const seen = new Set<JobCardNode>(['gated-in']);
    const queue: JobCardNode[] = ['gated-in'];

    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined) break;
      for (const next of nextNodes(node)) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }

    expect([...seen].sort()).toEqual([...TRANSITION_NODES].sort());
  });

  it('keeps the §5.4 concurrent gates off the transition table entirely', () => {
    // They open when the job enters `with-sa`; nothing travels to them, and
    // nothing travels from them. Asserting the absence keeps a future edit from
    // quietly turning independent gates into a sequence.
    for (const gate of WITH_SA_INDEPENDENT_GATES) {
      expect(SUB_STATUS_KIND[gate], gate).toBe('concurrent-gate');
      expect(TRANSITION_NODES as readonly string[], gate).not.toContain(gate);
      expect(JOB_CARD_TRANSITIONS.some((t) => t.from === gate), `${gate} has an outgoing move`).toBe(
        false,
      );
      expect(JOB_CARD_TRANSITIONS.some((t) => t.to === gate), `${gate} has an incoming move`).toBe(
        false,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// §4.2 additional rules
// ---------------------------------------------------------------------------

describe('§4.2 additional proposed rules', () => {
  it('returns a vendor pause to `on-floor` and nowhere else', () => {
    expect(nextNodes('paused-vendor')).toEqual(['on-floor']);
    expect(transition('T10').to).toBe('on-floor');
  });

  it('routes a QC failure back to `on-floor`', () => {
    expect(transition('T12').to).toBe('on-floor');
  });

  it('requires the tool-return check before QC', () => {
    expect(transition('T11').guards).toContain('tool-return-check-complete');
  });

  it('requires both of §5.10’s independent confirmations before billing', () => {
    expect([...transition('T13').guards].sort()).toEqual([
      'parts-issued-confirmed',
      'qc-verdict-pass',
      'warranty-team-confirmed',
    ]);
  });

  it('keeps `waiting-for-parts` a sub-status of `on-floor` rather than a track of its own', () => {
    expect(SUB_STATUS_PARENT['waiting-for-parts']).toBe('on-floor');
    expect(SUB_STATUS_KIND['waiting-for-parts']).toBe('sequential-step');
    expect(JOB_CARD_STATUSES as readonly string[]).not.toContain('waiting-for-parts');
  });

  it('does not model warranty/AMC/FMS as a status, per §4.2', () => {
    for (const node of ALL_NODES) {
      expect(node).not.toMatch(/warranty|amc|fms/i);
    }
  });

  it('does not model gate-out as a job-card status, per §4.3', () => {
    expect(JOB_CARD_STATUSES as readonly string[]).not.toContain('gate-out');
  });
});

// ---------------------------------------------------------------------------
// §5.4 independent gates — the ambiguity made explicit
// ---------------------------------------------------------------------------

describe('§5.4 independent gates', () => {
  it('declares three independent `with-sa` gates', () => {
    expect(WITH_SA_INDEPENDENT_GATES).toHaveLength(3);
    for (const gate of WITH_SA_INDEPENDENT_GATES) {
      expect(SUB_STATUS_PARENT[gate]).toBe('with-sa');
      expect(SUB_STATUS_KIND[gate]).toBe('concurrent-gate');
    }
  });

  it('gates `with-sa → on-floor` on floor allocation alone, not on customer approval', () => {
    // §5.4: "Customer approval, OEM CRM job-card raise, and floor allocation are
    // independent gates." §2.2 forbids assuming a sequence where the business
    // rules define independence — so this test pins the reading down rather
    // than letting it drift into a happy-path assumption.
    const guards = transition('T04').guards;
    expect(guards).toEqual(['floor-allocation-decided']);
    expect(guards).not.toContain('customer-approval-captured');
  });

  it('permits floor allocation while the estimate is still with the customer', () => {
    const decision = canTransition({
      from: 'on-floor',
      to: 'qc',
      role: 'qc',
      satisfiedGuards: ['tool-return-check-complete'],
    });
    // Nothing in the modelled guards references customer approval, so a job can
    // reach the floor — and QC — without it. Flagged in the README as an open
    // question, not silently accepted.
    expect(decision.outcome).toBe('allowed');
    expect(GUARDS).not.toHaveProperty('customer-approval-captured');
  });
});

// ---------------------------------------------------------------------------
// Authority — the visible checklist of what the spec does not say
// ---------------------------------------------------------------------------

describe('authority gaps', () => {
  it('names the exact transitions with no authority defined', () => {
    expect(idsWhere((t) => t.authorityBasis === 'unspecified')).toEqual([
      'T01',
      'T07',
      'T08',
      'T10',
      'T14',
      'T16',
    ]);
  });

  it('names the exact transitions whose authority is only implied', () => {
    expect(idsWhere((t) => t.authorityBasis === 'implied')).toEqual([
      'T02',
      'T05',
      'T06',
      'T09',
      'T15',
    ]);
  });

  it('names the exact transitions with explicit authority', () => {
    expect(idsWhere((t) => t.authorityBasis === 'explicit')).toEqual([
      'T03',
      'T04',
      'T11',
      'T12',
      'T13',
    ]);
  });

  it('gives gate-in creation to Security alone, and create-only', () => {
    expect([...JOB_CARD_CREATION.roles]).toEqual(['security']);
    expect(JOB_CARD_CREATION.createsStatus).toBe('gated-in');
  });
});

// ---------------------------------------------------------------------------
// canTransition
// ---------------------------------------------------------------------------

describe('canTransition', () => {
  it('fails closed on an undefined move', () => {
    const decision = canTransition({ from: 'gated-in', to: 'closed', role: 'gm-service' });
    expect(decision.outcome).toBe('denied-unknown-transition');
    expect(decision.transition).toBeNull();
  });

  it('refuses a transition the spec does not assign to anybody', () => {
    const decision = canTransition({ from: 'gated-in', to: 'reception', role: 'gm-service' });
    expect(decision.outcome).toBe('denied-unspecified-authority');
    // Not a role problem — GM has blanket edit access (§5.14). The problem is
    // that no rule exists at all.
    expect(decision.reason).toContain('no authority defined');
  });

  it('reports every unmet precondition', () => {
    const decision = canTransition({ from: 'qc', to: 'pre-invoice', role: 'qc' });
    expect(decision.outcome).toBe('denied-guard');
    expect([...decision.missingGuards].sort()).toEqual([
      'parts-issued-confirmed',
      'qc-verdict-pass',
      'warranty-team-confirmed',
    ]);
  });

  it('refuses a role that is not permitted, even with every precondition met', () => {
    const decision = canTransition({
      from: 'qc',
      to: 'pre-invoice',
      role: 'reception',
      satisfiedGuards: ['qc-verdict-pass', 'parts-issued-confirmed', 'warranty-team-confirmed'],
    });
    expect(decision.outcome).toBe('denied-role');
  });

  it('allows QC to pass a job to billing once both confirmations are in', () => {
    const decision = canTransition({
      from: 'qc',
      to: 'pre-invoice',
      role: 'qc',
      satisfiedGuards: ['qc-verdict-pass', 'parts-issued-confirmed', 'warranty-team-confirmed'],
    });
    expect(decision.outcome).toBe('allowed');
    expect(decision.transition?.id).toBe('T13');
  });

  it('lets Floor In-Charge stand in for QC when no dedicated QC exists (§5.9)', () => {
    const decision = canTransition({
      from: 'on-floor',
      to: 'qc',
      role: 'floor-in-charge',
      satisfiedGuards: ['tool-return-check-complete'],
    });
    expect(decision.outcome).toBe('allowed');
  });

  it('blocks the vendor pause until the send-out reason is logged', () => {
    expect(canTransition({ from: 'on-floor', to: 'paused-vendor', role: 'service-adviser' }).outcome).toBe(
      'denied-guard',
    );
    expect(
      canTransition({
        from: 'on-floor',
        to: 'paused-vendor',
        role: 'service-adviser',
        satisfiedGuards: ['vendor-send-out-reason-logged'],
      }).outcome,
    ).toBe('allowed');
  });

  it('walks the post-reception happy path and stops exactly where the spec goes quiet', () => {
    const steps: readonly {
      from: JobCardNode;
      to: JobCardNode;
      role: RoleKey;
      guards: GuardKey[];
    }[] = [
      { from: 'reception', to: 'with-workshop-manager', role: 'reception', guards: [] },
      { from: 'with-workshop-manager', to: 'with-sa', role: 'workshop-manager', guards: [] },
      {
        from: 'with-sa',
        to: 'on-floor',
        role: 'service-adviser',
        guards: ['floor-allocation-decided'],
      },
      { from: 'on-floor', to: 'qc', role: 'qc', guards: ['tool-return-check-complete'] },
      {
        from: 'qc',
        to: 'pre-invoice',
        role: 'qc',
        guards: ['qc-verdict-pass', 'parts-issued-confirmed', 'warranty-team-confirmed'],
      },
      { from: 'pre-invoice', to: 'waiting-for-payment', role: 'billing', guards: [] },
    ];

    const outcomes = steps.map(
      (step) =>
        canTransition({
          from: step.from,
          to: step.to,
          role: step.role,
          satisfiedGuards: step.guards,
        }).outcome,
    );

    expect(outcomes).toEqual([
      'allowed',
      'allowed',
      'allowed',
      'allowed',
      'allowed',
      // T14 is 'unspecified'. Nothing in §4.2 or §5.12 says who raises the
      // invoice on the v2 model, so the walk stops here by design.
      'denied-unspecified-authority',
    ]);
  });
});
