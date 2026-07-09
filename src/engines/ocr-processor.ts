export type OCRProvider = 'GoogleVision' | 'Gemini' | 'Azure' | 'AWS' | 'EasyOCR' | 'Custom';

export interface OCRResult {
  text: string;
  confidence: number;
  provider: OCRProvider;
  verificationTime: string;
}

export interface OCRProcessorProvider {
  process(ocrImageBase64: string): Promise<{ text: string; confidence: number }>;
}

// Mock implementation of OCRProcessorProvider
class MockOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    // Generate a mock confidence score between 0.90 and 0.99
    const confidence = parseFloat((0.90 + Math.random() * 0.09).toFixed(3));
    // Return a simulated mock text payload representing extracted job card details
    return {
      text: "Job Card Code: JC001, VRN: MH-12-AB-1234, Chassis: MST9982421",
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
 * Abstract interface with Manual/Mock implementation only.
 */
export async function verifyJobCard(
  ocrImageBase64: string,
  provider: OCRProvider = 'GoogleVision'
): Promise<OCRResult> {
  const processor = providers[provider] || providers.GoogleVision;
  const result = await processor.process(ocrImageBase64);
  return {
    text: result.text,
    confidence: result.confidence,
    provider,
    verificationTime: new Date().toISOString(),
  };
}
