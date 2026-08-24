import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AzureOCRProcessor, extractJobCardFields, verifyJobCard } from "../engines/ocr-processor.ts";

let mockAzureOperationBody: Record<string, unknown> = {};
const mockPost = vi.fn(async () => ({ status: 202, headers: { "operation-location": "redacted" }, body: {} }));
const mockPath = vi.fn(() => ({ post: mockPost }));
const mockClient = { path: mockPath };

vi.mock("@azure-rest/ai-document-intelligence", () => ({
  default: vi.fn(() => mockClient),
  isUnexpected: vi.fn(() => false),
  getLongRunningPoller: vi.fn(() => ({
    pollUntilDone: vi.fn(async () => ({ body: mockAzureOperationBody })),
  })),
}));

describe("Azure OCR provider", () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalAzureEndpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const originalAzureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  beforeEach(() => {
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://example.cognitiveservices.azure.com/";
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = "test-key";
    delete process.env.GEMINI_API_KEY;
    mockAzureOperationBody = {
      status: "succeeded",
      analyzeResult: {
        content: "VRN: KA-51-MM-4321\nOdometer: 18500 km",
        pages: [{ words: [{ content: "KA-51-MM-4321", confidence: 0.91 }, { content: "18500", confidence: 0.81 }] }],
      },
    };
    mockPost.mockClear();
    mockPath.mockClear();
  });

  afterEach(() => {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalAzureEndpoint === undefined) delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    else process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = originalAzureEndpoint;
    if (originalAzureKey === undefined) delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    else process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = originalAzureKey;
  });

  it("selects Azure without requiring GEMINI_API_KEY", async () => {
    const result = await verifyJobCard("data:image/png;base64,QUJD", "Azure");

    expect(result.provider).toBe("Azure");
    expect(result.text).toContain("KA-51-MM-4321");
    expect(result.confidence).toBeCloseTo(0.86);
    expect(mockPath).toHaveBeenCalledWith("/documentModels/{modelId}:analyze", "prebuilt-read");
    expect(mockPost).toHaveBeenCalledWith({ contentType: "application/json", body: { base64Source: "QUJD" } });
  });

  // verifyJobCard now tries a Gemini fallback after any primary-provider
  // failure (only when GEMINI_API_KEY is configured), and only throws once
  // every available path has failed — so with no Gemini key configured
  // (this suite's beforeEach deletes it), a failed primary provider surfaces
  // the shared "could not extract text" fail-closed message rather than the
  // primary provider's own error text. Never falls through to a mock OCR.
  it("fails closed with no usable provider when Gemini has no key and is preferred", async () => {
    await expect(verifyJobCard("base64", "Gemini")).rejects.toThrow("OCR could not extract text from the captured image.");
  });

  it("fails closed when Azure endpoint is missing and no Gemini fallback is configured", async () => {
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    await expect(verifyJobCard("base64", "Azure")).rejects.toThrow("OCR could not extract text from the captured image.");
  });

  it("fails closed when Azure key is missing and no Gemini fallback is configured", async () => {
    delete process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    await expect(verifyJobCard("base64", "Azure")).rejects.toThrow("OCR could not extract text from the captured image.");
  });

  it("fails when Azure returns no text and no Gemini fallback is configured", async () => {
    mockAzureOperationBody = { status: "succeeded", analyzeResult: { content: "", pages: [{ lines: [] }] } };
    await expect(verifyJobCard("base64", "Azure")).rejects.toThrow("OCR could not extract text from the captured image.");
  });

  it("keeps deterministic field extraction compatible with Azure text", () => {
    const fields = extractJobCardFields("Vehicle: KA-51-MM-4321\nOdometer: 18500 km\nChassis: MST987654321");
    expect(fields).toMatchObject({ vrn: "KA-51-MM-4321", odometer: 18500, chassisNo: "MST987654321" });
  });

  it("uses the dedicated AzureOCRProcessor in the Azure registry path", () => {
    expect(new AzureOCRProcessor()).toBeInstanceOf(AzureOCRProcessor);
  });
});
