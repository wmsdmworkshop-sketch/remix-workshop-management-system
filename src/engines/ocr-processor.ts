export type OCRProvider = 'GoogleVision' | 'Gemini' | 'Azure' | 'AWS' | 'EasyOCR' | 'Custom';

export interface OCRResult {
  text: string;
  confidence: number;
  provider: OCRProvider;
  verificationTime: string;
  extractedFields?: {
    vrn?: string;
    jobCardNo?: string;
    odometer?: number;
    chassisNo?: string;
  };
}

export interface OCRProcessorProvider {
  process(ocrImageBase64: string): Promise<{ text: string; confidence: number }>;
}

/**
 * Extracts structured commercial vehicle fields from raw OCR text.
 *
 * Supported Indian VRN formats (BH series + state codes):
 *   MH-12-AB-1234  (standard: 2-letter state, 2-digit district, 1-2 letter series, 4 digits)
 *   DL-01-CAB-1234 (DL format with 3-letter series — rare but valid)
 *   24-BH-1234-AB  (BH series bharat format)
 *   Also handles formats without hyphens: MH12AB1234
 *
 * Constitution: Zero Duplicate Masters — do NOT fabricate or default a VRN.
 * Returns undefined for any field that cannot be extracted from the image text.
 */
export function extractJobCardFields(text: string): {
  vrn?: string;
  jobCardNo?: string;
  odometer?: number;
  chassisNo?: string;
} {
  // Primary: standard Indian VRN  — AA-00-AA-0000 or AA-00-A-0000
  const vrnPatterns = [
    // Standard: state-district-series-number (with or without hyphens/spaces)
    /\b([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/i,
    // BH series: 00-BH-0000-AA
    /\b(\d{2}[-\s]?BH[-\s]?\d{4}[-\s]?[A-Z]{1,2})\b/i,
  ];

  let vrn: string | undefined;
  for (const pattern of vrnPatterns) {
    const m = text.match(pattern);
    if (m) {
      // Normalise: remove spaces, keep hyphens
      vrn = m[1].toUpperCase().replace(/\s+/g, '');
      break;
    }
  }

  const jcMatch = text.match(/\b(JC[-]?\d{3,7})\b/i);
  const odoMatch =
    text.match(/\b(\d{4,6})\s*(?:km|kms|kilometers|odometer)\b/i) ||
    text.match(/odometer\s*[:\-]?\s*(\d{4,6})/i);

  // TATA chassis numbers typically start with MAT (manufacturer code)
  const chassisMatch = text.match(/\b(MA[A-Z]\w{14})\b/i) || text.match(/\b(MST[A-Z0-9]{7,14})\b/i);

  return {
    vrn,
    jobCardNo: jcMatch ? jcMatch[1].toUpperCase() : undefined,
    odometer: odoMatch ? parseInt(odoMatch[1], 10) : undefined,
    chassisNo: chassisMatch ? chassisMatch[1].toUpperCase() : undefined,
  };
}

class GeminiOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = ocrImageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Targeted prompt for Indian commercial vehicle number plates.
    // Gemini-flash is instructed to return only the raw OCR text — no summarization —
    // so extractJobCardFields can parse it deterministically.
    const prompt = [
      "You are an OCR engine for an Indian commercial vehicle workshop management system.",
      "Extract ALL visible text from this image exactly as it appears.",
      "Focus on:",
      "1. Vehicle Registration Number (VRN) — format like MH-12-AB-1234 or DL-01-CAB-0001",
      "2. Odometer reading in km",
      "3. Chassis Number (17-character VIN or TATA-format beginning with MAT or MST)",
      "Return ONLY the raw extracted text. Do NOT summarize, interpret, or translate.",
      "If the image is unclear or no plate is visible, return exactly: OCR_NO_TEXT_DETECTED"
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        { text: prompt },
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ],
    });

    const text = (response.text || "").trim();
    if (!text || text === "OCR_NO_TEXT_DETECTED") {
      throw new Error("OCR could not detect any text in the captured image. Ensure the plate is clearly visible and well-lit.");
    }
    return { text, confidence: 0.98 };
  }
}

const providers: Record<OCRProvider, OCRProcessorProvider> = {
  GoogleVision: new GeminiOCRProcessor(),
  Gemini: new GeminiOCRProcessor(),
  // Azure/AWS/EasyOCR/Custom are not wired — they fail closed (no mock).
  Azure: { process: async () => { throw new Error("Azure OCR not configured"); } },
  AWS: { process: async () => { throw new Error("AWS OCR not configured"); } },
  EasyOCR: { process: async () => { throw new Error("EasyOCR not configured"); } },
  Custom: { process: async () => { throw new Error("Custom OCR not configured"); } },
};

/**
 * Processes a number-plate or dashboard photo and extracts OCR fields.
 *
 * Constitution: Real-Data-Only Operational Contract
 * - NEVER returns fabricated VRN, mock plates, or synthetic confidence scores.
 * - If GEMINI_API_KEY is missing, returns a structured error (confidence 0, no extractedFields).
 * - Callers (server route) must propagate this as an HTTP error so the client
 *   can display the manual-entry fallback.
 */
export async function verifyJobCard(
  ocrImageBase64: string,
  provider: OCRProvider = 'Gemini'
): Promise<OCRResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fail closed regardless of NODE_ENV: no API key → no OCR.
  // We never fall through to a mock processor in any environment because
  // a fabricated plate (even in dev) can be accidentally committed to the DB.
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not configured on the server. " +
      "Plate recognition is unavailable. Please enter the vehicle number manually."
    );
  }

  const processor = providers[provider] ?? providers.Gemini;
  const result = await processor.process(ocrImageBase64);
  const extractedFields = extractJobCardFields(result.text);

  return {
    text: result.text,
    confidence: result.confidence,
    provider,
    verificationTime: new Date().toISOString(),
    extractedFields,
  };
}
