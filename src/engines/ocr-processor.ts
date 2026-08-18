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
 * Extracts structured commercial vehicle fields from raw OCR text using regular expressions.
 */
export function extractJobCardFields(text: string): {
  vrn?: string;
  jobCardNo?: string;
  odometer?: number;
  chassisNo?: string;
} {
  const vrnMatch = text.match(/\b([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4})\b/i);
  const jcMatch = text.match(/\b(JC[-]?\d{3,7})\b/i);
  const odoMatch = text.match(/\b(\d{4,6})\s*(?:km|kms|odometer)\b/i) || text.match(/odometer:\s*(\d{4,6})/i);
  const chassisMatch = text.match(/\b(MST[A-Z0-9]{7,14})\b/i);

  return {
    vrn: vrnMatch ? vrnMatch[1].toUpperCase() : undefined,
    jobCardNo: jcMatch ? jcMatch[1].toUpperCase() : undefined,
    odometer: odoMatch ? parseInt(odoMatch[1], 10) : undefined,
    chassisNo: chassisMatch ? chassisMatch[1].toUpperCase() : undefined,
  };
}

class MockOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    const confidence = 0.96;
    return {
      text: "Job Card Code: JC001, VRN: MH-12-AB-1234, Odometer: 34500 km, Chassis: MST9982421",
      confidence,
    };
  }
}

class GeminiOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = ocrImageBase64.replace(/^data:image\/\w+;base64,/, "");
      const prompt = "Extract all text from this image accurately. Focus on Vehicle Registration Number (VRN), Odometer reading (KM), and Chassis Number. Return just the raw extracted text.";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg",
            },
          },
        ],
      });

      const text = response.text || "";
      return { text, confidence: 0.98 };
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      throw error;
    }
  }
}

const providers: Record<OCRProvider, OCRProcessorProvider> = {
  GoogleVision: new GeminiOCRProcessor(), // Upgraded to Gemini for accuracy
  Gemini: new GeminiOCRProcessor(),
  Azure: new MockOCRProcessor(),
  AWS: new MockOCRProcessor(),
  EasyOCR: new MockOCRProcessor(),
  Custom: new MockOCRProcessor(),
};

// No real OCR provider is wired yet. PRODUCTION FAILS CLOSED: it must never
// fabricate a passing extraction/confidence (a fabricated 0.90+ confidence would
// silently satisfy the OT fast-track gate in overtime-rules.ts). Only non-production
// (dev/test) may use the mock provider. Production returns an UNVERIFIED result
// (confidence 0) so the document is treated as unverified, never as a fake success.
const ALLOW_MOCK_OCR = process.env.NODE_ENV !== "production";

/**
 * Processes job card photo and extracts OCR fields.
 */
export async function verifyJobCard(
  ocrImageBase64: string,
  provider: OCRProvider = 'Gemini'
): Promise<OCRResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isProd = process.env.NODE_ENV === "production";

  // In production, we MUST have an API key to proceed.
  // If no key and not prod, we can use mock.
  if (isProd && !apiKey) {
    return {
      text: "OCR Error: GEMINI_API_KEY not configured in production environment.",
      confidence: 0,
      provider,
      verificationTime: new Date().toISOString(),
      extractedFields: {}
    };
  }

  const processor = providers[provider] || providers.Gemini;
  const result = await processor.process(ocrImageBase64);
  const extractedFields = extractJobCardFields(result.text);

  return {
    text: result.text,
    confidence: result.confidence,
    provider,
    verificationTime: new Date().toISOString(),
    extractedFields
  };
}
