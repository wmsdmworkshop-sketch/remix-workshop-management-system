import { DeepSeekEngine } from "./deepseek-engine";

export type OCRProvider = 'GoogleVision' | 'Gemini' | 'Azure' | 'DeepSeek' | 'AWS' | 'EasyOCR' | 'Custom';

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

type AzureAnalyzeOperationOutput = import("@azure-rest/ai-document-intelligence").AnalyzeOperationOutput;

function azureTextFromResult(analyzeResult: NonNullable<AzureAnalyzeOperationOutput["analyzeResult"]>): string {
  const content = typeof analyzeResult.content === "string" ? analyzeResult.content.trim() : "";
  if (content) return content;

  return (analyzeResult.pages || [])
    .flatMap((page) => (page.lines || []).map((line) => line.content.trim()).filter(Boolean))
    .join("\n")
    .trim();
}

function azureConfidenceFromResult(analyzeResult: NonNullable<AzureAnalyzeOperationOutput["analyzeResult"]>): number {
  const wordConfidences = (analyzeResult.pages || [])
    .flatMap((page) => page.words || [])
    .map((word) => word.confidence)
    .filter((confidence): confidence is number => Number.isFinite(confidence) && confidence >= 0 && confidence <= 1);

  return wordConfidences.length
    ? wordConfidences.reduce((sum, confidence) => sum + confidence, 0) / wordConfidences.length
    : 0.95;
}

const INDIAN_STATES = [
  "AN","AP","AR","AS","BR","CH","CG","DD","DN","DL","GA","GJ","HR","HP","JK","JH","KA",
  "KL","LA","LD","MP","MH","MN","ML","MZ","NL","OD","OR","PB","PY","RJ","SK","TN","TS",
  "TR","UP","UK","UA","WB","BH"
];

/**
 * Extracts structured commercial vehicle fields from raw OCR text.
 * Robustly handles:
 *  - 2-line painted / stenciled commercial plates (e.g., Line 1: "KA.32", Line 2: "AB.0507" -> "KA-32-AB-0507")
 *  - Dot-separated plates: "KA.32.AB.0507", "MH-12-AB-1234", "KA32AB0507"
 *  - BH Series: "24 BH 1234 AB"
 */
export function extractJobCardFields(text: string): {
  vrn?: string;
  jobCardNo?: string;
  odometer?: number;
  chassisNo?: string;
} {
  if (!text) return {};

  // 1. Direct regex on raw text (clean standard formats with 0, 1, 2, or 3 series letters)
  const singleLinePattern = /\b([A-Z]{2}[-\s\.]?\d{1,2}[-\s\.]?[A-Z]{0,3}[-\s\.]?\d{1,4})\b/i;
  const bhPattern = /\b(\d{2}[-\s\.]?BH[-\s\.]?\d{4}[-\s\.]?[A-Z]{1,2})\b/i;

  let vrn: string | undefined;
  
  const m1 = text.match(singleLinePattern);
  if (m1 && INDIAN_STATES.includes(m1[1].slice(0, 2).toUpperCase())) {
    vrn = m1[1].toUpperCase();
  }

  const mBh = text.match(bhPattern);
  if (!vrn && mBh) {
    vrn = mBh[1].toUpperCase();
  }

  // 2. Multi-line / Stenciled Indian Commercial Vehicle Plate Parser
  // Handles painted plates:
  // - Line 1: State + RTO code (e.g. KA.32, KA 32, KA-32)
  // - Line 2: Series + Number (e.g. AB.0307, AB 0307, C 1234, 1234, 0307)
  if (!vrn) {
    const lines = text
      .split(/[\r\n]+/)
      .map(l => l.trim().toUpperCase().replace(/[^A-Z0-9\.\-\s]/g, ''))
      .filter(l => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match line 1: state code (2 chars) + digits (1-2 chars)
      const stateMatch = line.match(/^([A-Z]{2})[\s\.\-]?(\d{1,2})$/i) || line.match(/\b([A-Z]{2})[\s\.\-]?(\d{1,2})\b/i);
      if (stateMatch && INDIAN_STATES.includes(stateMatch[1].toUpperCase())) {
        const state = stateMatch[1].toUpperCase();
        const rto = stateMatch[2].padStart(2, '0');

        // Look at current line or next line for remainder. Must slice from
        // right after where the match actually occurred — not from the start
        // of the line — or unrelated text earlier in the line (e.g. a job
        // card number) gets misread as the plate series/number.
        const restOfCurrent = line.substring((stateMatch.index ?? 0) + stateMatch[0].length).trim();
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
        const candidateRemainder = restOfCurrent || nextLine;

        // Series (0-3 letters) + Number (1-4 digits), e.g. AB.0307, AB 0307, C 1234, 1234, 0307
        const remMatch = candidateRemainder.match(/([A-Z]{1,3})?[\s\.\-]?(\d{1,4})/i);
        if (remMatch) {
          const series = (remMatch[1] || "").toUpperCase();
          const num = remMatch[2].padStart(4, '0');
          vrn = series ? `${state}-${rto}-${series}-${num}` : `${state}-${rto}-${num}`;
          break;
        }
      }
    }
  }

  // 3. Fallback: Strip all whitespace/dots/hyphens and match compact string
  if (!vrn) {
    const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // With 1-3 series letters: KA32AB0307 / KA32C1234 / KA32CAB1234
    const compactMatchWithSeries = compact.match(/([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})/);
    if (compactMatchWithSeries && INDIAN_STATES.includes(compactMatchWithSeries[1])) {
      const state = compactMatchWithSeries[1];
      const rto = compactMatchWithSeries[2].padStart(2, '0');
      const series = compactMatchWithSeries[3];
      const num = compactMatchWithSeries[4].padStart(4, '0');
      vrn = `${state}-${rto}-${series}-${num}`;
    } else {
      // Without series letters: KA321234
      const compactMatchNoSeries = compact.match(/([A-Z]{2})(\d{1,2})(\d{1,4})/);
      if (compactMatchNoSeries && INDIAN_STATES.includes(compactMatchNoSeries[1])) {
        const state = compactMatchNoSeries[1];
        const rto = compactMatchNoSeries[2].padStart(2, '0');
        const num = compactMatchNoSeries[3].padStart(4, '0');
        vrn = `${state}-${rto}-${num}`;
      }
    }
  }

  // Standardize VRN to canonical format (e.g. KA-32-AB-0307 or KA-32-C-1234 or KA-32-1234)
  if (vrn) {
    const raw = vrn.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const stdWithSeries = raw.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
    const stdNoSeries = raw.match(/^([A-Z]{2})(\d{1,2})(\d{1,4})$/);

    if (stdWithSeries && INDIAN_STATES.includes(stdWithSeries[1])) {
      const state = stdWithSeries[1];
      const rto = stdWithSeries[2].padStart(2, '0');
      const series = stdWithSeries[3];
      const num = stdWithSeries[4].padStart(4, '0');
      vrn = `${state}-${rto}-${series}-${num}`;
    } else if (stdNoSeries && INDIAN_STATES.includes(stdNoSeries[1])) {
      const state = stdNoSeries[1];
      const rto = stdNoSeries[2].padStart(2, '0');
      const num = stdNoSeries[3].padStart(4, '0');
      vrn = `${state}-${rto}-${num}`;
    } else {
      vrn = vrn.toUpperCase().replace(/[\s\.]+/g, '-').replace(/-+/g, '-');
    }
  }

  const jcMatch = text.match(/\b(JC[-]?\d{3,7})\b/i);
  // Many Tata truck instrument clusters show the last digit as tenths of a
  // km in a separate small window (e.g. "173559" + "4" = 173559.4 km).
  // Capture that optional decimal digit instead of dropping it.
  const odoMatch =
    text.match(/\b(\d{4,6}(?:\.\d)?)[ \t]*(?:km|kms|kilometers|odometer)\b/i) ||
    text.match(/odometer\s*[:\-]?\s*(\d{4,6}(?:\.\d)?)/i) ||
    // Instrument cluster photos: Azure returns bare numbers without "km" keyword.
    // Only match 5-6 digit standalone numbers (4-digit could be the VRN tail).
    text.match(/\b(\d{5,6}(?:\.\d)?)\b/);

  const chassisMatch = text.match(/\b(MA[A-Z]\w{14})\b/i) || text.match(/\b(MST[A-Z0-9]{7,14})\b/i);

  return {
    vrn,
    jobCardNo: jcMatch ? jcMatch[1].toUpperCase() : undefined,
    odometer: odoMatch ? parseFloat(odoMatch[1]) : undefined,
    chassisNo: chassisMatch ? chassisMatch[1].toUpperCase() : undefined,
  };
}

export class AzureOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim();
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim();
    if (!endpoint || !key) {
      throw new Error("Azure Document Intelligence credentials are not configured.");
    }

    const base64Source = ocrImageBase64.replace(/^data:image\/[^;]+;base64,/i, "");

    try {
      const { default: DocumentIntelligence, isUnexpected, getLongRunningPoller } =
        await import("@azure-rest/ai-document-intelligence");
      const client = DocumentIntelligence(endpoint, { key });
      const initialResponse = await client
        .path("/documentModels/{modelId}:analyze", "prebuilt-read")
        .post({
          contentType: "application/json",
          body: { base64Source },
        });

      if (isUnexpected(initialResponse)) {
        throw new Error("Azure OCR analysis request failed.");
      }

      const poller = getLongRunningPoller(client, initialResponse);
      const completedResponse = await poller.pollUntilDone();
      const operation = completedResponse.body as AzureAnalyzeOperationOutput;
      const analyzeResult = operation.analyzeResult;
      const text = analyzeResult ? azureTextFromResult(analyzeResult) : "";

      if (!text) {
        throw new Error("Azure OCR returned no text.");
      }

      return {
        text,
        confidence: analyzeResult ? azureConfidenceFromResult(analyzeResult) : 0.95,
      };
    } catch (error: any) {
      throw new Error(error?.message || "Azure OCR analysis request failed.");
    }
  }
}

export class DeepSeekOCRProcessor implements OCRProcessorProvider {
  async process(rawTextOrContext: string): Promise<{ text: string; confidence: number }> {
    const prompt = [
      "You are an expert AI parser for Indian commercial vehicles, trucks, tippers, and buses.",
      "Given the OCR text below from a vehicle number plate or dashboard photo, extract the Vehicle Registration Number (VRN) and Odometer reading.",
      "Note: Indian commercial vehicle number plates are often painted or stenciled in 2 lines with dots (e.g. Line 1: 'KA.32', Line 2: 'AB.0507' -> 'KA-32-AB-0507').",
      "",
      `OCR Text:\n${rawTextOrContext}`,
      "",
      "Return ONLY a JSON object with this exact schema:",
      '{"vrn": "KA-32-AB-0507", "odometer": 12345, "chassis_no": "...", "confidence": 0.98}'
    ].join("\n");

    const reply = await DeepSeekEngine.chat([
      { role: "system", content: "You are an automated OCR semantic normalizer. Respond ONLY with valid JSON." },
      { role: "user", content: prompt }
    ], { model: "deepseek-chat", temperature: 0.1 });

    return { text: reply, confidence: 0.98 };
  }
}

class GeminiOCRProcessor implements OCRProcessorProvider {
  async process(ocrImageBase64: string): Promise<{ text: string; confidence: number }> {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = ocrImageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = [
      "You are an OCR engine for Indian commercial vehicles (trucks, tippers, buses, tempos).",
      "Extract the Vehicle Registration Number (VRN) exactly as painted or embossed.",
      "Commercial plates in India are often painted in two lines with dots, e.g. Line 1: 'KA.32', Line 2: 'AB.0507' which means 'KA-32-AB-0507'.",
      "Also extract Odometer and Chassis Number if visible.",
      "Return ALL extracted lines and the full standard VRN."
    ].join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    if (!text) throw new Error("No text detected in image.");
    return { text, confidence: 0.98 };
  }
}

const providers: Record<OCRProvider, OCRProcessorProvider> = {
  Azure: new AzureOCRProcessor(),
  DeepSeek: new DeepSeekOCRProcessor(),
  Gemini: new GeminiOCRProcessor(),
  GoogleVision: new GeminiOCRProcessor(),
  AWS: { process: async () => { throw new Error("AWS OCR not configured"); } },
  EasyOCR: { process: async () => { throw new Error("EasyOCR not configured"); } },
  Custom: { process: async () => { throw new Error("Custom OCR not configured"); } },
};

/**
 * Robust OCR Pipeline:
 * 1. Executes Primary Engine (Azure Document Intelligence or Gemini).
 * 2. Applies intelligent multi-line & dot normalization for 2-line Indian commercial plates.
 * 3. ALWAYS invokes DeepSeek AI Semantic Parser for validation & correction —
 *    not just when VRN is missing, but also when regex found a VRN that might
 *    be wrong (Azure frequently misreads painted/stenciled commercial plates).
 */
export async function verifyJobCard(
  ocrImageBase64: string,
  preferredProvider: OCRProvider = 'Azure'
): Promise<OCRResult> {
  let rawText = "";
  let confidence = 0.95;
  let activeProvider: OCRProvider = preferredProvider;

  // 1. Try Primary Engine (Azure Document Intelligence)
  try {
    const processor = providers[preferredProvider] || providers.Azure;
    const res = await processor.process(ocrImageBase64);
    rawText = res.text;
    confidence = res.confidence;
  } catch (primaryErr: any) {
    console.warn(`Primary OCR (${preferredProvider}) failed:`, primaryErr?.message);

    // Fallback to Gemini if configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await providers.Gemini.process(ocrImageBase64);
        rawText = geminiRes.text;
        confidence = geminiRes.confidence;
        activeProvider = 'Gemini';
      } catch (gemErr: any) {
        console.warn("Gemini OCR fallback failed:", gemErr?.message);
      }
    }
  }

  if (!rawText) {
    throw new Error("OCR could not extract text from the captured image. Please ensure the vehicle plate is clearly visible.");
  }

  console.log(`[OCR] Raw text from ${activeProvider}:\n${rawText}`);

  // 2. Rule-based Extraction
  let extractedFields = extractJobCardFields(rawText);
  const regexVrn = extractedFields.vrn;
  console.log(`[OCR] Regex-extracted VRN: ${regexVrn || "(none)"}`);

  // 3. ALWAYS invoke DeepSeek AI Semantic Parser for validation & correction.
  //    Previously DeepSeek was only called when VRN was null. But Azure
  //    frequently misreads painted commercial plates (e.g. "KA 32 AB0307" →
  //    Azure reads "KA 03 0002"), the regex matches the wrong pattern, and
  //    DeepSeek was never consulted. Now we always ask DeepSeek to validate.
  if (rawText.length > 2) {
    try {
      const deepseekPrompt = regexVrn
        ? `The OCR engine returned this raw text from an Indian vehicle number plate photo:\n\n${rawText}\n\nOur regex parser extracted: "${regexVrn}"\nBut this might be wrong because OCR engines often misread painted/stenciled commercial vehicle plates.\nPlease analyze the raw OCR text and determine the CORRECT Vehicle Registration Number.\nIndian VRN formats: AB-12-CD-1234 (state-district-series-number), AB-12-C-1234, AB-12-1234, or BH series 24-BH-1234-AB.\nAlso extract odometer and chassis number if visible.`
        : `The OCR engine returned this raw text from an Indian vehicle number plate photo:\n\n${rawText}\n\nPlease extract the Vehicle Registration Number (VRN).\nIndian VRN formats: AB-12-CD-1234 (state-district-series-number), AB-12-C-1234, AB-12-1234, or BH series 24-BH-1234-AB.\nCommercial plates are often painted in 2 lines with dots (e.g. Line 1: "KA.32", Line 2: "AB.0507" → "KA-32-AB-0507").\nAlso extract odometer and chassis number if visible.`;

      const deepseekRes = await DeepSeekEngine.chat([
        { role: "system", content: "You are an expert Indian vehicle number plate parser. Respond ONLY with valid JSON matching this schema: {\"vrn\": \"KA-32-AB-0307\", \"odometer\": 12345, \"chassis_no\": \"...\", \"confidence\": 0.98}. If you cannot determine a field, set it to null." },
        { role: "user", content: deepseekPrompt }
      ], { model: "deepseek-chat", temperature: 0.1 });

      const cleaned = deepseekRes.replace(/```json\n?|\n?```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[OCR] DeepSeek parsed VRN: ${parsed.vrn}, regex VRN: ${regexVrn}`);
        if (parsed.vrn) {
          // Normalize DeepSeek's VRN to canonical format.
          const dsRaw = String(parsed.vrn).toUpperCase().replace(/[^A-Z0-9]/g, '');
          const dsWithSeries = dsRaw.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
          const dsNoSeries = dsRaw.match(/^([A-Z]{2})(\d{1,2})(\d{1,4})$/);
          const dsBh = dsRaw.match(/^(\d{2})BH(\d{4})([A-Z]{1,2})$/);

          // Real-Data-Only: the model's answer is a SUGGESTION, never authority.
          // Accept it only if it is genuinely a well-formed Indian plate with a
          // real state code. Previously this assignment sat outside these
          // branches, so an unparseable model answer (e.g. "AA 54 57" — "AA" is
          // not an Indian state code) was written through anyway AND clobbered a
          // correct regex result. A bad guess here becomes a real job card
          // against the wrong vehicle, so an invalid answer is discarded.
          let validated: string | null = null;
          if (dsWithSeries && INDIAN_STATES.includes(dsWithSeries[1])) {
            validated = `${dsWithSeries[1]}-${dsWithSeries[2].padStart(2, '0')}-${dsWithSeries[3]}-${dsWithSeries[4].padStart(4, '0')}`;
          } else if (dsNoSeries && INDIAN_STATES.includes(dsNoSeries[1])) {
            validated = `${dsNoSeries[1]}-${dsNoSeries[2].padStart(2, '0')}-${dsNoSeries[3].padStart(4, '0')}`;
          } else if (dsBh) {
            validated = `${dsBh[1]}-BH-${dsBh[2]}-${dsBh[3]}`;
          }

          if (validated) {
            extractedFields.vrn = validated;
          } else {
            // Keep whatever the deterministic parser found (possibly nothing —
            // in which case the operator enters it manually, which is correct).
            console.warn(`[OCR] Discarded invalid DeepSeek VRN "${parsed.vrn}" — not a valid Indian plate. Keeping regex result: ${regexVrn || "(none)"}`);
            extractedFields.vrn = regexVrn;
          }
        }
        if (parsed.odometer && !extractedFields.odometer) {
          extractedFields.odometer = Number(parsed.odometer);
        }
        if (parsed.chassis_no && !extractedFields.chassisNo) {
          extractedFields.chassisNo = String(parsed.chassis_no);
        }
      }
    } catch (aiErr: any) {
      console.warn("DeepSeek semantic plate validation failed:", aiErr?.message);
      // Keep the regex result if DeepSeek fails
    }
  }

  console.log(`[OCR] Final VRN: ${extractedFields.vrn || "(none)"}, Odometer: ${extractedFields.odometer || "(none)"}`);

  return {
    text: rawText,
    confidence,
    provider: activeProvider,
    verificationTime: new Date().toISOString(),
    extractedFields,
  };
}

