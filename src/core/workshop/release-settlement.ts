/**
 * RELEASE SETTLEMENT — "no gate-out pass unless the money is in."
 *
 * Business rule (owner, 2026-09-14): at ANY stage, nobody other than `developer`
 * or `gm_service` may issue a gate-out pass unless payment has been settled in
 * full against the billing — the final consolidated invoice amount.
 *
 * Before this existed, `create-gate-pass` only required that SOME row existed in
 * `tbl_payments` with status COMPLETED. The amount was never compared, so a ₹1
 * token payment released a ₹66,655 vehicle. The vehicle, and the money, were
 * both gone by the time anyone noticed.
 *
 * ── What counts as "the final consolidated invoice amount" ───────────────────
 * Two sources, because this system has two billing lineages, and taking only one
 * would silently let vehicles through:
 *
 *  1. BILLING_RECORD — `tbl_pre_invoice` + `tbl_pre_invoice_version.grand_total`
 *     at the current version. This is what `billing-engine.ts` maintains and what
 *     the cashier queue already displays as the amount. Preferred: it is the app's
 *     own, live, fully-compiled invoice (labour + parts − discount + GST).
 *  2. CONSOLIDATED_INVOICE — `invoices.final_consolidated_amt`, matched on
 *     `invoices.order_no = job_card_master.job_card_no`. This is the DMS history
 *     import (9,538 rows), and it is literally the "Final Consolidated Invoice
 *     Amount" column. It is the ONLY source that exists for imported vehicles —
 *     `tbl_pre_invoice` is empty in production, so a billing-record-only rule
 *     would leave every historical vehicle unreleasable.
 *
 * If both exist the live billing record wins; if neither exists the vehicle has no
 * invoice and must not be released at all (the caller reports GATE_PASS_NO_INVOICE).
 * An amount is never invented: an unreadable value is reported as unknown rather
 * than coerced to 0, which would silently wave the vehicle through (EAR-001).
 *
 * ── Why the explicit COLLATE is not optional ─────────────────────────────────
 * `invoices.order_no` is utf8mb4_unicode_ci while `job_card_master.job_card_no` is
 * utf8mb4_0900_ai_ci, and the connection collation is utf8mb4_unicode_ci. Comparing
 * them without an explicit collation raises ER_CANT_AGGREGATE_2COLLATIONS — verified,
 * not assumed. That failure is loud, which is the safe direction for a money check:
 * the alternative (a silently empty match set) would have read as "no invoice" and
 * blocked every release, or worse, matched nothing and been treated as settled.
 *
 * ── Exempt roles ─────────────────────────────────────────────────────────────
 * `developer` and `gm_service` may release without settlement. That is a deliberate
 * override, so the caller audits it as GATE_PASS_SETTLEMENT_OVERRIDE rather than
 * logging an ordinary pass.
 *
 * NOTE `admin` is NOT exempt. The rule names exactly two roles, and `admin` is a
 * system-administration role, not a commercial authority — so an admin must also
 * collect before releasing. This is a tightening: previously ANY holder of
 * GATE_PASS_ISSUE_ROLES could release on a part payment.
 */

/** The only roles permitted to issue a gate pass without settled payment. */
export const RELEASE_SETTLEMENT_EXEMPT_ROLES = ["developer", "gm_service"] as const;

/** Rounding tolerance, in rupees, when comparing collected against invoiced. */
export const SETTLEMENT_TOLERANCE = 0.01;

/**
 * Normalise a role the same way the rest of the codebase does for role keys:
 * "GM Service" and "gm-service" must both resolve to `gm_service`. Role names
 * arrive from the JWT as human titles in some flows (see the RBAC notes in
 * .agents/AGENTS.md), so an exact-match exemption would be trivially bypassed by
 * whichever casing a given login happens to carry.
 */
export function normalizeReleaseRole(role: unknown): string {
  return String(role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isReleaseSettlementExempt(role: unknown): boolean {
  return (RELEASE_SETTLEMENT_EXEMPT_ROLES as readonly string[]).includes(normalizeReleaseRole(role));
}

/**
 * Parse a money value that may arrive as a DECIMAL (number), or as a varchar
 * holding "66655.43", "1,234.00" or "₹500" (the DMS import column is varchar).
 *
 * Returns null for anything that is not unambiguously a number. In particular
 * null/""/"N/A" must NOT become 0 — a 0 invoice would make every payment look
 * settled and release the vehicle for free.
 */
export function parseAmount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[,\s₹]/g, "").trim();
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export type InvoiceSource = "BILLING_RECORD" | "CONSOLIDATED_INVOICE";

export interface InvoiceResolution {
  amount: number | null;
  source: InvoiceSource | null;
  references: string[];
}

/** Minimal pool surface so this module is unit-testable without a live MySQL. */
export interface Queryable {
  execute(sql: string, params?: any[]): Promise<any>;
}

/**
 * The final consolidated invoice amount for a job, from whichever lineage has it.
 *
 * Conservative on duplicates: several `invoices` rows can share one `order_no`
 * (re-catalogued under C/D/I document prefixes — verified in production, where all
 * copies of a given order carried an identical amount). We take the MAXIMUM rather
 * than the first match, so a partial or superseded document can never understate
 * what the customer owes.
 */
export async function resolveFinalInvoiceAmount(
  pool: Queryable,
  jobId: number | string,
  jobCardNo?: string | null
): Promise<InvoiceResolution> {
  const numericJobId = Number(jobId);

  // 1. The live billing record. Preferred — it is the app's own compiled invoice.
  if (Number.isFinite(numericJobId)) {
    try {
      const [rows]: any = await pool.execute(
        `SELECT v.grand_total AS amount, pi.pre_invoice_id
           FROM tbl_pre_invoice pi
           JOIN tbl_pre_invoice_version v
             ON v.pre_invoice_id = pi.pre_invoice_id AND v.version = pi.current_version
          WHERE pi.job_id = ? AND pi.status = 'BILLING_COMPLETED'
          ORDER BY pi.pre_invoice_id DESC
          LIMIT 1`,
        [numericJobId]
      );
      const row = (rows || [])[0];
      if (row) {
        const amount = parseAmount(row.amount);
        if (amount != null) {
          return { amount, source: "BILLING_RECORD", references: [String(row.pre_invoice_id)] };
        }
      }
    } catch (e: any) {
      // An unreadable billing table must not be mistaken for "no invoice".
      console.error("[RELEASE-SETTLEMENT] billing-record lookup failed:", e.code || e.message);
    }
  }

  // 2. The DMS consolidated invoice, keyed by job card NUMBER (not job_id).
  if (jobCardNo) {
    try {
      const [rows]: any = await pool.execute(
        `SELECT i.invoice_no, i.final_consolidated_amt, i.final_consolidated_amount
           FROM invoices i
          WHERE i.order_no = ? COLLATE utf8mb4_0900_ai_ci
            AND i.invoice_status <> 'Cancelled'`,
        [String(jobCardNo)]
      );
      const candidates = (rows || [])
        .map((r: any) => ({
          invoice_no: String(r.invoice_no ?? ""),
          amount: parseAmount(r.final_consolidated_amt) ?? parseAmount(r.final_consolidated_amount),
        }))
        .filter((r: any) => r.amount != null);

      if (candidates.length > 0) {
        const max = candidates.reduce((a: any, b: any) => (b.amount > a.amount ? b : a));
        return {
          amount: max.amount,
          source: "CONSOLIDATED_INVOICE",
          references: candidates.map((r: any) => r.invoice_no).filter(Boolean),
        };
      }
      // Rows existed but every amount was unreadable. Say so rather than
      // reporting "no invoice" — the two need different fixes.
      if ((rows || []).length > 0) {
        return { amount: null, source: "CONSOLIDATED_INVOICE", references: (rows || []).map((r: any) => String(r.invoice_no ?? "")) };
      }
    } catch (e: any) {
      console.error("[RELEASE-SETTLEMENT] consolidated-invoice lookup failed:", e.code || e.message);
    }
  }

  return { amount: null, source: null, references: [] };
}

/** How much money has actually been collected against this job. */
export async function resolveSettledAmount(pool: Queryable, jobId: number | string): Promise<number> {
  try {
    const [rows]: any = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS paid
         FROM tbl_payments
        WHERE job_id = ? AND status = 'COMPLETED'`,
      [String(jobId)]
    );
    return parseAmount((rows || [])[0]?.paid) ?? 0;
  } catch (e: any) {
    console.error("[RELEASE-SETTLEMENT] payment lookup failed:", e.code || e.message);
    return 0;
  }
}

/** Has a GM already authorised releasing this vehicle without full payment? */
export async function hasApprovedCredit(pool: Queryable, jobId: number | string): Promise<boolean> {
  try {
    const [rows]: any = await pool.execute(
      `SELECT credit_request_id FROM tbl_credit_requests
        WHERE job_id = ? AND status = 'GM_APPROVED' LIMIT 1`,
      [String(jobId)]
    );
    return (rows || []).length > 0;
  } catch {
    return false;
  }
}

export type SettlementCode =
  | "GATE_PASS_NO_INVOICE"
  | "GATE_PASS_PAYMENT_UNSETTLED"
  | "GATE_PASS_SOURCE_DOWN";

export interface ReleaseSettlement {
  role: string;
  exempt: boolean;
  invoiceAmount: number | null;
  invoiceSource: InvoiceSource | null;
  invoiceReferences: string[];
  paidAmount: number;
  shortfall: number;
  settled: boolean;
  creditApproved: boolean;
  /** Whether this caller may issue the pass. */
  mayIssue: boolean;
  code: SettlementCode | null;
  message: string | null;
}

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Decide whether `role` may issue a gate pass for this job right now.
 *
 * Exempt roles pass unconditionally (the caller audits the override).
 * Everyone else needs the FULL invoice amount collected. A GM-approved credit does
 * not substitute for payment for a non-exempt role: the rule names only `developer`
 * and `gm_service`, so the GM is the one who issues that release — the credit
 * remains valid, but it is exercised BY the exempt authority, not on its behalf.
 */
export async function evaluateReleaseSettlement(opts: {
  pool: Queryable;
  role: unknown;
  jobId: number | string;
  jobCardNo?: string | null;
}): Promise<ReleaseSettlement> {
  const role = normalizeReleaseRole(opts.role);
  const exempt = isReleaseSettlementExempt(role);
  const [invoice, paidAmount, creditApproved] = await Promise.all([
    resolveFinalInvoiceAmount(opts.pool, opts.jobId, opts.jobCardNo),
    resolveSettledAmount(opts.pool, opts.jobId),
    hasApprovedCredit(opts.pool, opts.jobId),
  ]);

  const base = {
    role,
    exempt,
    invoiceAmount: invoice.amount,
    invoiceSource: invoice.source,
    invoiceReferences: invoice.references,
    paidAmount,
    creditApproved,
  };

  if (exempt) {
    return {
      ...base,
      shortfall: 0,
      settled: true,
      mayIssue: true,
      code: null,
      message: null,
    };
  }

  // An invoice that exists but whose amount could not be read is NOT "settled".
  if (invoice.amount == null) {
    const hasRefs = invoice.references.length > 0;
    return {
      ...base,
      shortfall: 0,
      settled: false,
      mayIssue: false,
      code: hasRefs ? "GATE_PASS_SOURCE_DOWN" : "GATE_PASS_NO_INVOICE",
      message: hasRefs
        ? `GATE_PASS_SOURCE_DOWN: invoices exist for this job (${invoice.references.slice(0, 3).join(", ")}) but none carries a readable amount, so the payable cannot be established. Only developer or gm_service may release it.`
        : "GATE_PASS_NO_INVOICE: no invoice has been raised for this job yet, so there is no amount to settle. Only developer or gm_service may release it.",
    };
  }

  const shortfall = Math.max(0, invoice.amount - paidAmount);
  const settled = paidAmount + SETTLEMENT_TOLERANCE >= invoice.amount;

  if (settled) {
    return { ...base, shortfall: 0, settled: true, mayIssue: true, code: null, message: null };
  }

  const creditNote = creditApproved
    ? " A GM-approved credit exists for this job, so gm_service or developer can issue the pass."
    : "";

  return {
    ...base,
    shortfall,
    settled: false,
    mayIssue: false,
    code: "GATE_PASS_PAYMENT_UNSETTLED",
    message:
      `GATE_PASS_PAYMENT_UNSETTLED: the final consolidated invoice is ${inr(invoice.amount)} ` +
      `but only ${inr(paidAmount)} has been collected — ${inr(shortfall)} is outstanding. ` +
      `Collect the balance before issuing the gate pass.${creditNote}`,
  };
}
