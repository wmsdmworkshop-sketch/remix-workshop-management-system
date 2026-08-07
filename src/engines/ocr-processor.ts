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

const providers: Record<OCRProvider, OCRProcessorProvider> = {
  GoogleVision: new MockOCRProcessor(),
  Gemini: new MockOCRProcessor(),
  Azure: new MockOCRProcessor(),
  AWS: new MockOCRProcessor(),
  EasyOCR: new MockOCRProcessor(),
  Custom: new MockOCRProcessor(),
};

/**
 * Processes job card photo and extracts OCR fields.
 */
export async function verifyJobCard(
  ocrImageBase64: string,
  provider: OCRProvider = 'GoogleVision'
): Promise<OCRResult> {
  const processor = providers[provider] || providers.GoogleVision;
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
