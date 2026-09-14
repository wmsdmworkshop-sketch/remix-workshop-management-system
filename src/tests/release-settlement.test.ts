import { describe, it, expect } from "vitest";
import {
  evaluateReleaseSettlement,
  isReleaseSettlementExempt,
  normalizeReleaseRole,
  parseAmount,
  resolveFinalInvoiceAmount,
  RELEASE_SETTLEMENT_EXEMPT_ROLES,
  SETTLEMENT_TOLERANCE,
} from "../core/workshop/release-settlement";

/**
 * Owner rule (2026-09-14): at any stage, nobody other than `developer` or
 * `gm_service` may issue a gate-out pass unless payment is settled in full
 * against the final consolidated invoice amount.
 *
 * Before this, `create-gate-pass` only required SOME row in tbl_payments with
 * status COMPLETED. The amount was never compared, so a token part-payment
 * released the vehicle. These tests pin the rule so that hole cannot reopen.
 */

interface FakeData {
  /** tbl_pre_invoice + tbl_pre_invoice_version at current_version. */
  billingAmount?: number | string | null;
  /** invoices rows for this order_no. */
  consolidated?: Array<{ invoice_no: string; amount: string | null }>;
  /** SUM(tbl_payments.amount) where status='COMPLETED'. */
  paid?: number | string;
  creditApproved?: boolean;
  billingThrows?: boolean;
}

/** Minimal stand-in for the mysql2 pool, dispatching on the SQL shape. */
function fakePool(data: FakeData) {
  return {
    async execute(sql: string): Promise<any> {
      if (sql.includes("tbl_pre_invoice_version")) {
        if (data.billingThrows) throw Object.assign(new Error("boom"), { code: "ER_NO_SUCH_TABLE" });
        return [data.billingAmount == null ? [] : [{ amount: data.billingAmount, pre_invoice_id: 42 }]];
      }
      if (sql.includes("FROM invoices")) {
        return [(data.consolidated || []).map((r) => ({
          invoice_no: r.invoice_no,
          final_consolidated_amt: r.amount,
          final_consolidated_amount: r.amount,
        }))];
      }
      if (sql.includes("tbl_payments")) {
        return [[{ paid: String(data.paid ?? 0) }]];
      }
      if (sql.includes("tbl_credit_requests")) {
        return [data.creditApproved ? [{ credit_request_id: "CR-1" }] : []];
      }
      return [[]];
    },
  };
}

const evalWith = (role: string, data: FakeData) =>
  evaluateReleaseSettlement({ pool: fakePool(data) as any, role, jobId: 6774, jobCardNo: "JC-29267" });

describe("parseAmount — an unreadable amount must never become 0", () => {
  it("accepts the shapes the data actually carries", () => {
    expect(parseAmount(66655.43)).toBe(66655.43);
    expect(parseAmount("7029.00")).toBe(7029);
    expect(parseAmount("1,234.00")).toBe(1234);
    expect(parseAmount("₹500")).toBe(500);
    expect(parseAmount(0)).toBe(0);
    expect(parseAmount("0.00")).toBe(0);
  });

  it("refuses anything ambiguous rather than coercing it to zero", () => {
    // A 0 invoice would make every payment look settled and release for free.
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
    expect(parseAmount("N/A")).toBeNull();
    expect(parseAmount("TBD")).toBeNull();
    expect(parseAmount("12abc")).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount(Infinity)).toBeNull();
  });
});

describe("role exemption", () => {
  it("exempts exactly developer and gm_service", () => {
    expect(RELEASE_SETTLEMENT_EXEMPT_ROLES).toEqual(["developer", "gm_service"]);
    expect(isReleaseSettlementExempt("developer")).toBe(true);
    expect(isReleaseSettlementExempt("gm_service")).toBe(true);
  });

  it("normalises the casing and separators a real JWT can carry", () => {
    // role names arrive as human titles in some flows; an exact-match exemption
    // would be bypassable by whatever casing a given login happens to have.
    expect(normalizeReleaseRole("GM Service")).toBe("gm_service");
    expect(normalizeReleaseRole("gm-service")).toBe("gm_service");
    expect(normalizeReleaseRole("  GM_Service  ")).toBe("gm_service");
    expect(normalizeReleaseRole("DEVELOPER")).toBe("developer");
    expect(isReleaseSettlementExempt("GM Service")).toBe(true);
    expect(isReleaseSettlementExempt("GM-Service")).toBe(true);
  });

  it("does NOT exempt admin, cashier or the manager roles", () => {
    // The rule names two roles. admin is system administration, not commercial
    // authority, so an admin must also collect before releasing.
    for (const role of ["admin", "cashier", "service_manager", "workshop_manager", "floor_supervisor", "security_agent", ""]) {
      expect(isReleaseSettlementExempt(role)).toBe(false);
    }
    expect(isReleaseSettlementExempt(undefined)).toBe(false);
    expect(isReleaseSettlementExempt(null)).toBe(false);
  });
});

describe("evaluateReleaseSettlement — the gate-out payment rule", () => {
  const PARTIAL: FakeData = { billingAmount: 66655.43, paid: 5000 };

  it("REFUSES a non-exempt role while the invoice is only part paid", async () => {
    for (const role of ["cashier", "admin", "service_manager", "workshop_manager"]) {
      const r = await evalWith(role, PARTIAL);
      expect(r.mayIssue, `${role} must not release on a part payment`).toBe(false);
      expect(r.code).toBe("GATE_PASS_PAYMENT_UNSETTLED");
      expect(r.settled).toBe(false);
      expect(r.shortfall).toBeCloseTo(61655.43, 2);
      // The message must name the amount, the collected total and the balance.
      expect(r.message).toContain("GATE_PASS_PAYMENT_UNSETTLED");
      expect(r.message).toContain("66,655.43");
      expect(r.message).toContain("5,000.00");
      expect(r.message).toContain("61,655.43");
    }
  });

  it("ALLOWS a non-exempt role once the invoice is exactly settled", async () => {
    const r = await evalWith("cashier", { billingAmount: 66655.43, paid: 66655.43 });
    expect(r.mayIssue).toBe(true);
    expect(r.settled).toBe(true);
    expect(r.shortfall).toBe(0);
    expect(r.code).toBeNull();
  });

  it("ALLOWS overpayment", async () => {
    const r = await evalWith("cashier", { billingAmount: 1000, paid: 1050 });
    expect(r.mayIssue).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("tolerates rounding noise but not a missing rupee", async () => {
    const justUnder = await evalWith("cashier", {
      billingAmount: 1000,
      paid: 1000 - SETTLEMENT_TOLERANCE,
    });
    expect(justUnder.mayIssue).toBe(true);

    const missingRupee = await evalWith("cashier", { billingAmount: 1000, paid: 999 });
    expect(missingRupee.mayIssue).toBe(false);
    expect(missingRupee.shortfall).toBeCloseTo(1, 2);
  });

  it("ALLOWS an exempt role to override, and reports it as exempt", async () => {
    for (const role of ["developer", "gm_service", "GM Service"]) {
      const r = await evalWith(role, PARTIAL);
      expect(r.mayIssue, `${role} may override`).toBe(true);
      expect(r.exempt).toBe(true);
      expect(r.code).toBeNull();
      // Still reports the truth about the money, so the override is auditable.
      expect(r.invoiceAmount).toBe(66655.43);
      expect(r.paidAmount).toBe(5000);
    }
  });

  it("ALLOWS an exempt role even when there is no invoice at all", async () => {
    const r = await evalWith("gm_service", { paid: 0 });
    expect(r.mayIssue).toBe(true);
    expect(r.exempt).toBe(true);
  });

  it("REFUSES when no invoice exists, with a distinct code from a part payment", async () => {
    const r = await evalWith("cashier", { paid: 0 });
    expect(r.mayIssue).toBe(false);
    expect(r.code).toBe("GATE_PASS_NO_INVOICE");
    expect(r.shortfall).toBe(0);
    expect(r.message).toContain("no invoice has been raised");
  });

  it("treats a zero-value invoice as settled (warranty / free-of-charge)", async () => {
    const r = await evalWith("cashier", { billingAmount: 0, paid: 0 });
    expect(r.mayIssue).toBe(true);
    expect(r.settled).toBe(true);
  });

  it("REFUSES — never waves through — when the invoice amount is unreadable", async () => {
    // The dangerous failure: an unparseable amount coerced to 0 reads as "settled".
    const r = await evalWith("cashier", { consolidated: [{ invoice_no: "IDEVAN1", amount: "N/A" }], paid: 0 });
    expect(r.mayIssue).toBe(false);
    expect(r.code).toBe("GATE_PASS_SOURCE_DOWN");
    expect(r.invoiceAmount).toBeNull();
    expect(r.message).toContain("IDEVAN1");
  });

  it("does not let a GM-approved credit substitute for payment for a non-exempt role", async () => {
    // Only developer/gm_service may release without payment; the credit is still
    // valid but is exercised BY the exempt authority, not on its behalf.
    const r = await evalWith("cashier", { ...PARTIAL, creditApproved: true });
    expect(r.mayIssue).toBe(false);
    expect(r.code).toBe("GATE_PASS_PAYMENT_UNSETTLED");
    expect(r.creditApproved).toBe(true);
    expect(r.message).toContain("gm_service or developer can issue the pass");
  });
});

describe("invoice amount resolution — two billing lineages", () => {
  it("prefers the live billing record over the DMS consolidated invoice", async () => {
    const r = await resolveFinalInvoiceAmount(
      fakePool({ billingAmount: 1234.56, consolidated: [{ invoice_no: "IDEVAN1", amount: "999.00" }] }) as any,
      6774,
      "JC-29267"
    );
    expect(r.source).toBe("BILLING_RECORD");
    expect(r.amount).toBe(1234.56);
  });

  it("falls back to the consolidated invoice when no billing record exists", async () => {
    // tbl_pre_invoice is EMPTY in production; without this fallback every imported
    // vehicle would be unreleasable.
    const r = await resolveFinalInvoiceAmount(
      fakePool({ consolidated: [{ invoice_no: "IDEVAN2627003376", amount: "66655.43" }] }) as any,
      6774,
      "JC-29267"
    );
    expect(r.source).toBe("CONSOLIDATED_INVOICE");
    expect(r.amount).toBe(66655.43);
    expect(r.references).toEqual(["IDEVAN2627003376"]);
  });

  it("takes the MAXIMUM across duplicate order_no rows, never the first", async () => {
    // Production has up to 4 invoices sharing one order_no (re-catalogued under
    // C/D/I prefixes). Taking an arbitrary one could understate what is owed.
    const r = await resolveFinalInvoiceAmount(
      fakePool({
        consolidated: [
          { invoice_no: "CDEVAN1", amount: "7029.00" },
          { invoice_no: "IDEVAN2", amount: "9000.00" },
          { invoice_no: "DDEVAN3", amount: "500.00" },
        ],
      }) as any,
      6774,
      "JC-29267"
    );
    expect(r.amount).toBe(9000);
    expect(r.references).toHaveLength(3);
  });

  it("reports no source at all when neither lineage has an invoice", async () => {
    const r = await resolveFinalInvoiceAmount(fakePool({}) as any, 6774, "JC-29267");
    expect(r.amount).toBeNull();
    expect(r.source).toBeNull();
    expect(r.references).toEqual([]);
  });

  it("falls through to the consolidated invoice if the billing table is unreadable", async () => {
    const r = await resolveFinalInvoiceAmount(
      fakePool({ billingThrows: true, consolidated: [{ invoice_no: "IDEVAN9", amount: "750.00" }] }) as any,
      6774,
      "JC-29267"
    );
    expect(r.source).toBe("CONSOLIDATED_INVOICE");
    expect(r.amount).toBe(750);
  });
});
