import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import JobCardPreview, { PreviewData } from "../../components/reception/JobCardPreview";

/**
 * P1 / D-1 + D-2 — the REAL JobCardPreview component is rendered.
 *
 * Before P1 this screen showed warranty terms, a field service bulletin number
 * and a recall campaign chosen by whether the model name contained "ev", plus
 * invented people and a confidence figure that was the string literal "96%".
 */

/** Synthetic fixture: a real vehicle, but NO warranty/FSB/campaign source and
 *  NO AI run — exactly the case that used to invent content. */
const noFacts: PreviewData = {
  customerName: "Devanand Logistics",
  customerMobile: "9845000000",
  vrn: "KA32AB9690",
  make: "TATA",
  model: "Tata 1109g EV",           // contains "ev" — the old trigger
  complaint: "Clutch slipping",
  advisor: "RANJEET",
  priority: "Normal",
  estimatedTat: "4h",
  suggestedBay: "B-01",
  suggestedTechnician: "MD GOUSE",
  queue: "Floor",
  estimatedDelivery: "2026-09-12 17:00",
  previousHistory: "No prior visit history recorded in database.",
  repeatComplaint: "NO (Clean service trail)",
  predictedTat: "4h",
  // Everything P1 made optional is absent:
  warranty: null,
  fsb: null,
  campaign: null,
  advisorRecommendation: null,
  technicianRecommendation: null,
  bayRecommendation: null,
  confidence: null,
  explainability: null,
  overrideStatus: null,
};

const INVENTED = [
  "Arnaud Kumar",
  "Sanjay Patel",
  "Bay 3 (EV specialized)",
  "FSB-2026-03",
  "FSB-2025-01",
  "DEF Quality Sensor",
  "8 Years / 150k km",
  "3 Years / 100k km",
  "96%",
  "91%",
  "Gemma-4 prediction model",
];

describe("P1/D-1 — missing facts never become invented content", () => {
  it("renders 'Not recorded' for every absent fact", () => {
    render(<JobCardPreview data={noFacts} />);
    // Six optional facts -> six explicit absences.
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThanOrEqual(6);
  });

  it("contains none of the previously fabricated strings, even for an 'ev' model", () => {
    const { container } = render(<JobCardPreview data={noFacts} />);
    const text = container.textContent || "";
    const found = INVENTED.filter((s) => text.includes(s));
    expect(found).toEqual([]);
  });
});

describe("P1/D-2 — absent AI output suppresses confidence and generated explanation", () => {
  it("renders no confidence badge when the AI returned none", () => {
    render(<JobCardPreview data={noFacts} />);
    expect(screen.queryByText(/Confidence:/i)).toBeNull();
  });

  it("renders no explainability block when no analysis ran", () => {
    render(<JobCardPreview data={noFacts} />);
    expect(screen.queryByText(/Explainability Justification/i)).toBeNull();
  });

  it("shows a real confidence only when the response actually carries one", () => {
    render(<JobCardPreview data={{ ...noFacts, confidence: "88%", explainability: "Real model output." }} />);
    expect(screen.getByText(/Confidence:/i)).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("Real model output.")).toBeInTheDocument();
  });

  it("renders a genuine value rather than 'Not recorded' when one is supplied", () => {
    render(<JobCardPreview data={{ ...noFacts, warranty: "Warranty valid to 2027-03-01" }} />);
    expect(screen.getByText("Warranty valid to 2027-03-01")).toBeInTheDocument();
  });
});
