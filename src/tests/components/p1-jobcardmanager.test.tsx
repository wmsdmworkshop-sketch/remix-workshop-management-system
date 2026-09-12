import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobCardManager from "../../components/JobCardManager";
import { baseProps, jobWaiting, jobSameDay, jobNoDates, stubFetch } from "./p1-fixtures";

/** The real JobCardManager is rendered in every test below. */

describe("P1/D-6 — loading, empty, error, retry", () => {
  it("shows an error (not an empty state) when the workshop-data load failed", () => {
    render(<JobCardManager {...(baseProps({ jobCards: [], dataLoadError: "Could not load workshop data." }) as any)} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Could not load workshop data/i)).toBeInTheDocument();
    // The critical assertion: a failure must never claim there are no job cards.
    expect(screen.queryByText(/No job cards yet/i)).toBeNull();
    expect(
      screen.getByText(/not the same as there being none/i)
    ).toBeInTheDocument();
  });

  it("shows an honest empty state when there genuinely are no job cards", () => {
    render(<JobCardManager {...(baseProps({ jobCards: [] }) as any)} />);
    expect(screen.getByText(/No job cards yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("distinguishes 'no matches for these filters' from 'none exist'", async () => {
    const user = userEvent.setup();
    render(<JobCardManager {...(baseProps() as any)} />);
    const search = screen.getByPlaceholderText(/Search VRN/i);
    await user.type(search, "ZZ99NOTHING");
    expect(await screen.findByText(/No job cards match these filters/i)).toBeInTheDocument();
  });

  it("invokes the retry callback when Retry is clicked", async () => {
    const user = userEvent.setup();
    const onRetryLoad = vi.fn();
    render(
      <JobCardManager
        {...(baseProps({ jobCards: [], dataLoadError: "Could not load workshop data.", onRetryLoad }) as any)}
      />
    );
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetryLoad).toHaveBeenCalledTimes(1);
  });

  it("recovers to the list after a successful retry", async () => {
    const { rerender } = render(
      <JobCardManager {...(baseProps({ jobCards: [], dataLoadError: "Could not load workshop data." }) as any)} />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // Simulates the parent clearing the error and supplying data.
    rerender(<JobCardManager {...(baseProps({ jobCards: [jobWaiting], dataLoadError: null }) as any)} />);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getAllByText("KA32AB9690").length).toBeGreaterThan(0);
  });
});

describe("P1/D-6 — complaint history states", () => {
  it("does not assert 'Version 1' when the history request fails", async () => {
    const user = userEvent.setup();
    stubFetch([{ match: "complaint-history", ok: false, status: 500 }]);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting }) as any)} />);

    await user.click(await screen.findByRole("button", { name: /complaint history/i }));

    const err = await screen.findByText(/Could not load complaint history/i);
    expect(err).toBeInTheDocument();
    // The defect being closed: a failure used to render the Version 1 claim.
    expect(screen.queryByText(/current complaint is Version 1/i)).toBeNull();
    expect(screen.getByText(/version history is unknown/i)).toBeInTheDocument();
  });

  it("shows the genuine empty message when the request succeeds with no history", async () => {
    const user = userEvent.setup();
    stubFetch([{ match: "complaint-history", ok: true, json: { success: true, history: [] } }]);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting }) as any)} />);

    await user.click(await screen.findByRole("button", { name: /complaint history/i }));
    expect(await screen.findByText(/current complaint is Version 1/i)).toBeInTheDocument();
  });

  it("renders returned history rows on success", async () => {
    const user = userEvent.setup();
    stubFetch([
      {
        match: "complaint-history",
        ok: true,
        json: {
          success: true,
          history: [
            { version: 1, complaint_text: "Original complaint text", edited_by_name: "RANJEET", edited_role: "service_advisor", created_at: "2026-09-12T09:10:00.000Z" },
          ],
        },
      },
    ]);
    render(<JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting }) as any)} />);
    await user.click(await screen.findByRole("button", { name: /complaint history/i }));
    expect(await screen.findByText(/Original complaint text/i)).toBeInTheDocument();
  });
});

describe("P1/D-7 — missing duration vs a genuine zero", () => {
  it("renders an em dash when waiting days cannot be computed", () => {
    render(<JobCardManager {...(baseProps({ jobCards: [jobNoDates], selectedJobExternal: jobNoDates }) as any)} />);
    const label = screen.getByText(/Waiting Days/i);
    const row = label.closest("div");
    expect(row?.textContent || "").toContain("—");
    expect(row?.textContent || "").not.toMatch(/\b0 days\b/);
  });

  it("renders '0 days' for a genuine same-day job", () => {
    render(<JobCardManager {...(baseProps({ jobCards: [jobSameDay], selectedJobExternal: jobSameDay }) as any)} />);
    const label = screen.getByText(/Waiting Days/i);
    expect(label.closest("div")?.textContent || "").toMatch(/0 days/);
  });

  it("never shows the literal 'Active' as an elapsed duration", () => {
    render(<JobCardManager {...(baseProps({ jobCards: [jobNoDates], selectedJobExternal: jobNoDates }) as any)} />);
    const label = screen.getByText(/Actual Time Taken/i);
    expect(label.closest("div")?.textContent || "").not.toMatch(/Active/);
  });
});

describe("P1/D-4 — the unresolved split total is absent", () => {
  it("does not render a 'Total Split Share' row", () => {
    render(
      <JobCardManager
        {...(baseProps({
          selectedJobExternal: jobWaiting,
          revenues: [{ revenue_id: 1, job_id: 9001, labour_amount: 3000, parts_amount: 1000, total_amount: 4000, split_id: 1 }] as any,
          splitDetails: [{ detail_id: 1, revenue_id: 1, employee_id: 16, tech_role: "Primary Technician", split_pct: 100, split_amount: 3000 }] as any,
        }) as any)}
      />
    );
    expect(screen.queryByText(/Total Split Share/i)).toBeNull();
  });
});
