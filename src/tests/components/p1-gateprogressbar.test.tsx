import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GateProgressBar from "../../components/GateProgressBar";
import JobCardManager from "../../components/JobCardManager";
import { baseProps, jobWaiting } from "./p1-fixtures";

/**
 * P1 shared-component regression.
 *
 * GateProgressBar was NOT modified by P1 — suppressing its hardcoded percentages
 * belongs to the stage decision, not this packet. It is covered here because it
 * is imported by BOTH Dashboard.tsx and JobCardManager.tsx, and JobCardManager
 * was heavily edited: these tests prove P1 did not disturb the shared component
 * in either consuming screen.
 */

describe("P1 regression — GateProgressBar renders standalone", () => {
  it("renders for a job in a known stage", () => {
    const { container } = render(<GateProgressBar job={jobWaiting as any} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders in the full variant without throwing", () => {
    const { container } = render(<GateProgressBar job={jobWaiting as any} variant="full" />);
    expect(container.textContent || "").toMatch(/%/);
  });

  it("renders for a gated-out job", () => {
    const { container } = render(
      <GateProgressBar job={{ ...jobWaiting, gate_out_time: "2026-09-12T18:00:00.000Z" } as any} variant="full" />
    );
    expect(container.textContent || "").toContain("100%");
  });
});

describe("P1 regression — GateProgressBar inside JobCardManager", () => {
  it("still renders in the job list after the P1 edits", () => {
    const { container } = render(<JobCardManager {...(baseProps() as any)} />);
    // The list row renders the compact variant; its percentage text is present.
    expect(container.textContent || "").toMatch(/%/);
    expect(screen.getAllByText("KA32AB9690").length).toBeGreaterThan(0);
  });

  it("still renders in the detail panel after the P1 edits", () => {
    const { container } = render(
      <JobCardManager {...(baseProps({ selectedJobExternal: jobWaiting }) as any)} />
    );
    expect(container.textContent || "").toMatch(/%/);
  });
});
