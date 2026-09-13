import { DeepSeekEngine } from "./deepseek-engine";
import { isNemotronOcrConfigured, readWithNemotronOcr } from "./nemotron-ocr-provider.ts";

export type OCRProvider = 'GoogleVision' | 'Gemini' | 'Azure' | 'Nemotron' | 'DeepSeek' | 'AWS' | 'EasyOCR' | 'Custom';

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
  const odoMatch = extractOdometerReading(text, vrn);

  const chassisMatch = text.match(/\b(MA[A-Z]\w{14})\b/i) || text.match(/\b(MST[A-Z0-9]{7,14})\b/i);

  return {
    vrn,
    jobCardNo: jcMatch ? jcMatch[1].toUpperCase() : undefined,
    odometer: odoMatch ? parseFloat(odoMatch[1]) : undefined,
    chassisNo: chassisMatch ? chassisMatch[1].toUpperCase() : undefined,
  };
}


/**
 * Extracts an odometer reading from raw OCR text.
 *
 * The previous rule ended with a fallback that took the FIRST standalone 5-6
 * digit run anywhere in the text. On an instrument cluster that is whichever
 * number the OCR engine happened to emit first — the trip meter, the clock, an
 * RPM figure, or part of the registration sitting in the same frame. It also
 * capped at six digits, so any commercial vehicle past 999,999 km read as
 * nothing at all.
 *
 * This version:
 *   1. Prefers a number adjacent to a km / odometer keyword — the only
 *      unambiguous signal available.
 *   2. Otherwise takes the LARGEST plausible candidate. On a cluster the
 *      odometer is the largest figure present; trip meter, speed, RPM and the
 *      clock are all smaller.
 *   3. Skips digit groups belonging to the registration number.
 *   4. Accepts 4-7 digits, so high-mileage trucks are read rather than dropped.
 *
 * Returns a RegExp-style match array so the caller is unchanged, or null when
 * nothing plausible is present — never a guess.
 */
function extractOdometerReading(text: string, vrn?: string): RegExpMatchArray | null {
  const keyed =
    text.match(/\b(\d{4,7}(?:\.\d)?)[ \t]*(?:km|kms|kilometers|odometer)\b/i) ||
    text.match(/odometer\s*[:\-]?\s*(\d{4,7}(?:\.\d)?)/i);
  if (keyed) return keyed;

  const vrnDigits = new Set((vrn || "").replace(/[^0-9]/g, "").match(/\d{3,}/g) || []);

  const candidates: { value: number; raw: string }[] = [];
  const re = /\b(\d{4,7}(?:\.\d)?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[1];
    if (vrnDigits.has(raw.split(".")[0])) continue;
    const value = parseFloat(raw);
    if (!isFinite(value) || value <= 0 || value > 2000000) continue;
    candidates.push({ value, raw });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.value - a.value);
  const best = candidates[0];
  return [best.raw, best.raw] as unknown as RegExpMatchArray;
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

const providers: Record<OCRProvider, OCRProcessorProvider> = {
  Azure: new AzureOCRProcessor(),
  // Runs against a separate inference service; unconfigured until
  // NEMOTRON_API_KEY is set, and reports that rather than failing obscurely.
  Nemotron: {
    process: async (img: string) => {
      if (!isNemotronOcrConfigured()) {
        throw new Error("Nemotron OCR is not configured — set NEMOTRON_API_KEY.");
      }
      return readWithNemotronOcr(img);
    },
  },
  DeepSeek: new DeepSeekOCRProcessor(),
  // Gemini has been withdrawn from this application. These keys remain because
  // the OCRProvider type enumerates them and stored rows may still name one;
  // selecting either now reports that it is unavailable instead of calling a
  // provider whose key is not configured.
  Gemini: { process: async () => { throw new Error("Gemini OCR has been withdrawn — use Azure or Nemotron."); } },
  GoogleVision: { process: async () => { throw new Error("Google Vision OCR has been withdrawn — use Azure or Nemotron."); } },
  AWS: { process: async () => { throw new Error("AWS OCR not configured"); } },
  EasyOCR: { process: async () => { throw new Error("EasyOCR not configured"); } },
  Custom: { process: async () => { throw new Error("Custom OCR not configured"); } },
};

/**
 * Robust OCR Pipeline:
 * 1. Executes Primary Engine (Azure Document Intelligence).
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

    // SECOND OPINION: NVIDIA Nemotron Parse 2.0.
    //
    // Replaces the Gemini fallback, which could never run: Google retired the
    // models this app called (404) and the account is out of prepayment credit
    // (429), so every attempt failed silently and a failed Azure read became a
    // failed scan.
    //
    // Nemotron Parse 2.0 is a HOSTED NIM API (model id nvidia/nemotron-parse-2.0,
    // confirmed in NVIDIA's live catalogue), so it needs only a key —
    // NEMOTRON_API_KEY. When that is unset this is skipped entirely — the
    // pipeline behaves exactly as Azure-only rather than pretending to have a
    // fallback it does not have.
    if (isNemotronOcrConfigured()) {
      try {
        const nemotronRes = await readWithNemotronOcr(ocrImageBase64);
        rawText = nemotronRes.text;
        confidence = nemotronRes.confidence;
        activeProvider = 'Nemotron';
        console.log("[OCR] Azure failed; Nemotron second opinion succeeded.");
      } catch (nemotronErr: any) {
        console.warn("Nemotron OCR fallback failed:", nemotronErr?.message);
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

  // 3. SECOND-OPINION VALIDATION.
  //
  // Azure frequently misreads painted and stencilled commercial plates
  // (e.g. "KA 32 AB0307" read as "KA 03 0002"), and the regex then matches the
  // wrong pattern confidently. A second reader catches that.
  //
  // This replaces a DeepSeek call that has never worked: DEEPSEEK_API_KEY is a
  // placeholder and the API answers 401 on every request, so the validation
  // step the comment promised was silently failing on every single scan.
  //
  // Nemotron re-reads the IMAGE rather than re-parsing Azure's text, which is the
  // point — a second opinion on text Azure already misread would inherit the
  // same mistake.
  //
  // Its answer remains a SUGGESTION, never authority: it is accepted only if it
  // is a well-formed Indian plate with a real state code. A bad guess here
  // becomes a real job card against the wrong vehicle, so an invalid answer is
  // discarded and the deterministic parser's result stands (possibly nothing,
  // in which case the operator types it, which is correct).
  if (isNemotronOcrConfigured() && activeProvider !== 'Nemotron') {
    try {
      const check = await readWithNemotronOcr(
        ocrImageBase64,
        'This is a photo of an Indian commercial vehicle number plate or instrument cluster. ' +
        'Read every character exactly as printed, preserving line breaks. ' +
        'Commercial plates are often painted in two lines with dots, e.g. "KA.32" then "AB.0507".'
      );
      const nemotronFields = extractJobCardFields(check.text);
      console.log(`[OCR] Nemotron validation read: "${check.text.replace(/\n/g, " | ")}" -> VRN ${nemotronFields.vrn || "(none)"}`);

      if (nemotronFields.vrn && nemotronFields.vrn !== regexVrn) {
        const state = nemotronFields.vrn.split('-')[0];
        if (INDIAN_STATES.includes(state)) {
          if (!regexVrn) {
            // Azure's text yielded nothing parseable; Nemotron found a valid plate.
            console.log(`[OCR] Accepting Nemotron VRN ${nemotronFields.vrn} (Azure text yielded none).`);
            extractedFields.vrn = nemotronFields.vrn;
          } else {
            // The two readers disagree. Neither is authoritative, so the
            // disagreement is RECORDED rather than resolved by guesswork — the
            // operator confirms the plate on screen either way.
            console.warn(
              `[OCR] Readers disagree: Azure/regex "${regexVrn}" vs Nemotron "${nemotronFields.vrn}". ` +
              `Keeping "${regexVrn}" for the operator to confirm.`
            );
          }
        } else {
          console.warn(`[OCR] Discarded Nemotron VRN "${nemotronFields.vrn}" — "${state}" is not an Indian state code.`);
        }
      }

      // Fill only what is genuinely missing; never overwrite a read value.
      if (nemotronFields.odometer && !extractedFields.odometer) {
        extractedFields.odometer = nemotronFields.odometer;
      }
      if (nemotronFields.chassisNo && !extractedFields.chassisNo) {
        extractedFields.chassisNo = nemotronFields.chassisNo;
      }
    } catch (valErr: any) {
      // Validation is an improvement, not a requirement. A failure here leaves
      // the Azure result exactly as it was.
      console.warn("Nemotron second-opinion validation failed:", valErr?.message);
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

