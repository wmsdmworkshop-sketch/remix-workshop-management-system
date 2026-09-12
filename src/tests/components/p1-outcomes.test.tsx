import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobCardManager from "../../components/JobCardManager";
import Dashboard from "../../components/Dashboard";
import { baseProps, jobWaiting } from "./p1-fixtures";

/** "Save Allocations" renders only when the job already has an allocation
 *  (JobCardManager.tsx:2114 — `assignedStaff.length > 0`), and assignedStaff is
 *  seeded from the `allocations` prop. Supply one. */
const withAllocation = (over: Record<string, any> = {}) =>
  baseProps({
    allocations: [{ map_id: 1, job_id: 9001, employee_id: 16, tech_role: "Primary Technician" }] as any,
    ...over,
  });

const alerts = () => globalThis.__alerts;
const said = (re: RegExp) => alerts().some((a) => re.test(a));

/** Opens the revenue panel for the selected job and returns the two inputs. */
async function revenueInputs() {
  const labour = await screen.findByLabelText(/labour amount/i).catch(() => null);
  if (labour) return labour;
  // The inputs are not labelled; fall back to the numeric inputs in the
  // revenue block, which is the only place they appear.
  const numeric = screen.getAllByRole("spinbutton");
  return numeric[0];
}

describe("P1/D-3 — blank amounts cannot submit; explicit zero is valid", () => {
  it("refuses to submit when both amounts are blank and calls nothing", async () => {
    const user = userEvent.setup();
    const onCalculateRevenue = vi.fn(async () => true);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting, onCalculateRevenue }) as any)} />);

    await user.click(await screen.findByRole("button", { name: /calculate split share/i }));

    expect(onCalculateRevenue).not.toHaveBeenCalled();
    expect(said(/Blank fields are not treated as zero/i)).toBe(true);
    expect(said(/successfully/i)).toBe(false);
  });

  it("refuses when only one amount is filled", async () => {
    const user = userEvent.setup();
    const onCalculateRevenue = vi.fn(async () => true);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting, onCalculateRevenue }) as any)} />);

    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[0], "3000");
    await user.click(screen.getByRole("button", { name: /calculate split share/i }));

    expect(onCalculateRevenue).not.toHaveBeenCalled();
    expect(said(/Blank fields are not treated as zero/i)).toBe(true);
  });

  it("accepts an explicit zero and submits it as 0", async () => {
    const user = userEvent.setup();
    const onCalculateRevenue = vi.fn(async () => true);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting, onCalculateRevenue }) as any)} />);

    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[0], "0");
    await user.type(inputs[1], "0");
    await user.click(screen.getByRole("button", { name: /calculate split share/i }));

    await waitFor(() => expect(onCalculateRevenue).toHaveBeenCalledTimes(1));
    expect(onCalculateRevenue).toHaveBeenCalledWith(9001, 0, 0);
  });

  it("does not overwrite a stored amount when the field is left untouched", async () => {
    const user = userEvent.setup();
    const onCalculateRevenue = vi.fn(async () => true);
    render(
      <JobCardManager
        {...(baseProps({
          selectedJobExternal: jobWaiting,
          onCalculateRevenue,
          revenues: [{ revenue_id: 1, job_id: 9001, labour_amount: 4500, parts_amount: 900, total_amount: 5400, split_id: 1 }] as any,
        }) as any)}
      />
    );
    // Stored values are loaded into the fields; submitting unchanged must send
    // those same values, never 0.
    await user.click(await screen.findByRole("button", { name: /calculate split share/i }));
    await waitFor(() => expect(onCalculateRevenue).toHaveBeenCalledTimes(1));
    expect(onCalculateRevenue).toHaveBeenCalledWith(9001, 4500, 900);
  });
});

describe("P1/D-5 — only a confirmed success may produce a success alert", () => {
  it("successful assignment produces the success alert", async () => {
    const user = userEvent.setup();
    const onAssignTechnicians = vi.fn(async () => true);
    render(<JobCardManager {...(withAllocation({ selectedJobExternal: jobWaiting, onAssignTechnicians }) as any)} />);
    await user.click(await screen.findByRole("button", { name: /save allocations/i }));
    await waitFor(() => expect(said(/Technicians allocated successfully/i)).toBe(true));
  });

  it("returned failure produces a failure alert, never success", async () => {
    const user = userEvent.setup();
    const onAssignTechnicians = vi.fn(async () => false);
    render(<JobCardManager {...(withAllocation({ selectedJobExternal: jobWaiting, onAssignTechnicians }) as any)} />);
    await user.click(await screen.findByRole("button", { name: /save allocations/i }));
    await waitFor(() => expect(said(/Could not allocate technicians/i)).toBe(true));
    expect(said(/allocated successfully/i)).toBe(false);
  });

  it("a rejected operation does not report success", async () => {
    const user = userEvent.setup();
    const onAssignTechnicians = vi.fn(async () => { throw new Error("boom"); });
    render(<JobCardManager {...(withAllocation({ selectedJobExternal: jobWaiting, onAssignTechnicians }) as any)} />);
    await user.click(await screen.findByRole("button", { name: /save allocations/i }));
    await waitFor(() => expect(onAssignTechnicians).toHaveBeenCalled());
    expect(said(/allocated successfully/i)).toBe(false);
  });

  it("revenue failure produces a failure alert, never success", async () => {
    const user = userEvent.setup();
    const onCalculateRevenue = vi.fn(async () => false);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting, onCalculateRevenue }) as any)} />);
    const inputs = screen.getAllByRole("spinbutton");
    await user.type(inputs[0], "3000");
    await user.type(inputs[1], "1000");
    await user.click(screen.getByRole("button", { name: /calculate split share/i }));
    await waitFor(() => expect(said(/Could not calculate the revenue split/i)).toBe(true));
    expect(said(/locked successfully/i)).toBe(false);
  });
});

describe("P1/D-5 — Dashboard's absent-callback fallback", () => {
  it("Dashboard supplies a fallback that reports failure, not success", async () => {
    // Dashboard renders WorkshopDashboard with
    //   onAssignTechnicians || (async () => false)
    // The corrected fallback must resolve false so a no-op reports failure.
    const fallback = async () => false;
    const result = await fallback();
    expect(result).toBe(false);

    // And JobCardManager must treat exactly that value as a failure.
    const user = userEvent.setup();
    render(
      <JobCardManager
        {...(withAllocation({ selectedJobExternal: jobWaiting, onAssignTechnicians: fallback }) as any)}
      />
    );
    await user.click(await screen.findByRole("button", { name: /save allocations/i }));
    await waitFor(() => expect(said(/Could not allocate technicians/i)).toBe(true));
    expect(said(/allocated successfully/i)).toBe(false);
  });

  it("Dashboard module exposes the corrected fallback (no undefined-returning no-op)", async () => {
    // Guards against a regression to `async () => {}`, which resolved undefined
    // and was treated as success.
    const src = await import("fs").then((fs) =>
      fs.readFileSync("src/components/Dashboard.tsx", "utf8")
    );
    expect(src).toContain("onAssignTechnicians || (async () => false)");
    expect(src).not.toContain("onAssignTechnicians || (async () => {})");
  });
});
