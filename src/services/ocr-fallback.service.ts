/**
 * =============================================================================
 * DWIP Enterprise Platform — OCR Fallback Service
 * Bounded Context: Core Operations / Multi-Provider OCR Resilience
 * Description: Unified two-tier OCR processing engine that executes Gemini 3.1
 *              as the primary extractor and seamlessly falls back to Azure
 *              Document Intelligence when Gemini fails or returns confidence
 *              below threshold.
 * =============================================================================
 */

import { AzureOCRProcessor, extractJobCardFields } from "../engines/ocr-processor.ts";
import { DeepSeekEngine } from "../engines/deepseek-engine.ts";
import { StructuredLogger } from "../core/vos/utils/StructuredLogger.ts";

export type OcrContext = "numberplate" | "manual-jobcard" | "invoice" | "parts-photo";

export interface OcrFallbackOptions {
  threshold?: number;
  mimeType?: string;
  textInput?: string;
  jobCardNo?: string;
  vrn?: string;
  branchId?: string;
  capturedBy?: number;
}

export interface OcrFallbackResult<T = any> {
  provider: "Gemini" | "Azure";
  extractedFields: T;
  confidence: number;
  raw: any;
  text?: string;
  verificationTime: string;
}

export class OcrFallbackService {
  private static instance: OcrFallbackService;
  private azureProcessor: AzureOCRProcessor;
  private defaultThreshold: number;

  private constructor() {
    this.azureProcessor = new AzureOCRProcessor();
    this.defaultThreshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || "0.7");
  }

  public static getInstance(): OcrFallbackService {
    if (!OcrFallbackService.instance) {
      OcrFallbackService.instance = new OcrFallbackService();
    }
    return OcrFallbackService.instance;
  }

  /**
   * Helper to clean base64 image data and extract pure base64 payload
   */
  private cleanBase64(dataUrlOrBase64: string): { base64Data: string; mimeType: string } {
    let clean = dataUrlOrBase64;
    let mimeType = "image/jpeg";

    if (dataUrlOrBase64.startsWith("data:")) {
      const match = dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        clean = match[2];
      }
    }

    return { base64Data: clean, mimeType };
  }

  /**
   * Primary Entry Point: Attempts Gemini first; if failure or low confidence (< threshold), falls back to Azure.
   */
  public async processWithFallback<T = any>(
    imageBase64: string,
    context: OcrContext,
    options: OcrFallbackOptions = {}
  ): Promise<OcrFallbackResult<T>> {
    const threshold = options.threshold !== undefined ? options.threshold : this.defaultThreshold;
    const now = new Date().toISOString();
    const { base64Data, mimeType: parsedMime } = this.cleanBase64(imageBase64);
    const mimeType = options.mimeType || parsedMime;

    StructuredLogger.info(`[OCR-Fallback] Initiating OCR for context '${context}' with threshold ${threshold}`, {
      component: "OcrFallbackService",
      operation: "processWithFallback",
      result: "SUCCESS",
      context,
      threshold,
    });

    // GEMINI PRIMARY STAGE REMOVED.
    //
    // This ran Gemini FIRST and fell back to Azure. That contradicted the
    // agreed order (Azure primary, Nemotron second) and, since GEMINI_API_KEY
    // is unset on this service, the branch never executed anyway — every read
    // already went straight to Azure. Removing it changes no behaviour; it
    // only stops the code claiming a primary provider that does not run.
    //
    // The Nemotron second opinion lives in ocr-processor.ts, which re-reads the
    // IMAGE rather than Azure's text, so a misread is caught instead of
    // inherited.
    const azureErrorContext = "Azure is the primary OCR provider for this service.";

    // =========================================================================
    // Azure Document Intelligence — the OCR provider for this service.
    // =========================================================================
    try {
      console.log(`[OCR-Fallback] Reading with Azure for context '${context}'...`);
      let azureResult: { extractedFields: any; confidence: number; raw: any; text?: string };

      switch (context) {
        case "numberplate":
          azureResult = await this.extractNumberplateWithAzure(imageBase64);
          break;
        case "manual-jobcard":
          azureResult = await this.extractManualJobcardWithAzure(imageBase64);
          break;
        case "invoice":
          azureResult = await this.extractInvoiceWithAzure(imageBase64, options.textInput);
          break;
        case "parts-photo":
          azureResult = await this.extractPartNumbersWithAzure(imageBase64);
          break;
      }

      console.log(`[OCR-Fallback] ✅ Azure fallback succeeded for '${context}' with confidence ${azureResult.confidence.toFixed(2)}`);
      StructuredLogger.info(`[OCR-Fallback] Azure fallback succeeded for '${context}'`, {
        component: "OcrFallbackService",
        operation: "processWithFallback",
        result: "SUCCESS",
        provider: "Azure",
        confidence: azureResult.confidence,
      });

      return {
        provider: "Azure",
        extractedFields: azureResult.extractedFields,
        confidence: azureResult.confidence,
        raw: azureResult.raw,
        text: azureResult.text,
        verificationTime: now,
      };
    } catch (azureErr: any) {
      console.error(`[OCR-Fallback] ❌ Azure OCR failed for context '${context}'!`, {
        azureError: azureErr?.message,
      });

      StructuredLogger.error(`[OCR-Fallback] OCR failed for '${context}'`, {
        component: "OcrFallbackService",
        operation: "processWithFallback",
        result: "FAILURE",
        azureError: azureErr?.message,
      }, azureErr);

      // NOTHING IS RETURNED ON FAILURE. There is no low-confidence result to
      // fall back on now, and inventing one would put an unread plate or
      // invoice number onto a real record. The caller shows manual entry.
      throw new Error(`OCR processing failed. ${azureErrorContext} Azure: ${azureErr?.message || "unknown error"}`);
    }
  }

  // ===========================================================================
  // GEMINI EXTRACTORS — REMOVED.
  //
  // Four methods (numberplate, manual job card, invoice, part numbers) called
  // Gemini directly. Nothing reached them: processWithFallback stopped calling
  // them when Azure became primary, and GEMINI_API_KEY is unset on this
  // service, so they threw on entry. Removing them drops the @google/genai SDK
  // from the server bundle.
  // ===========================================================================


  // ===========================================================================
  // AZURE EXTRACTORS & PARSERS (FALLBACK)
  // ===========================================================================

  public async extractNumberplateWithAzure(imageBase64: string): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const res = await this.azureProcessor.process(imageBase64);
    const rawText = res.text;
    let confidence = res.confidence;

    const fields = extractJobCardFields(rawText);

    // If regex missed or to validate, invoke DeepSeek parser on Azure text
    if (rawText.length > 2) {
      try {
        // GEMINI_API_KEY is deliberately not configured in production, so this
        // Azure + DeepSeek path is the ONLY one that runs live — the Gemini
        // prompt above never executes. It therefore has to handle instrument
        // clusters as well as plates, which the previous system message
        // ("You are an Indian vehicle plate parser") did not: it framed every
        // image as a number plate, so odometer digits were an afterthought.
        const prompt = `The OCR engine returned this raw text from a photo of an Indian commercial vehicle — either a number plate or an instrument cluster / dashboard:\n\n${rawText}\n\nExtract:\n- vrn: registration in canonical form (AB-12-CD-1234 / AB-12-1234 / 24-BH-1234-AB), or null if this is a dashboard photo with no plate visible.\n- odometer: the TOTAL distance reading in km, as a number. A cluster also shows trip meters, speed, RPM and a clock — the odometer is the LARGEST distance figure and typically has 5 to 7 digits. Do NOT return a trip meter, and do not return digits that are part of the registration number. Some Tata clusters show a final tenths digit in a separate window (e.g. "173559" and "4" = 173559.4). Return null if no total reading is legible.\n- chassis_no: if visible, else null.\n\nReturn JSON only: {"vrn": "...", "odometer": 12345, "chassis_no": "...", "confidence": 0.9}`;
        const deepseekRes = await DeepSeekEngine.chat([
          { role: "system", content: "You read Indian commercial vehicle number plates AND instrument clusters. Never invent a value: if a field is not legible, return null for it. Output JSON only." },
          { role: "user", content: prompt },
        ], { model: "deepseek-chat", temperature: 0.1 });

        const cleaned = deepseekRes.replace(/```json\n?|\n?```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.vrn) fields.vrn = parsed.vrn;
          if (parsed.odometer && !fields.odometer) fields.odometer = Number(parsed.odometer);
          if (parsed.chassis_no && !fields.chassisNo) fields.chassisNo = String(parsed.chassis_no);
        }
      } catch (e) {
        // Ignore DeepSeek fallback errors, keep regex fields
      }
    }

    return {
      extractedFields: {
        vrn: fields.vrn || undefined,
        odometer: fields.odometer || undefined,
        chassisNo: fields.chassisNo || undefined,
      },
      confidence,
      raw: { text: rawText, fields },
      text: rawText,
    };
  }

  public async extractManualJobcardWithAzure(imageBase64: string): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const res = await this.azureProcessor.process(imageBase64);
    const rawText = res.text;
    const confidence = res.confidence;

    // Use DeepSeek to parse full structured job card fields from Azure text
    const prompt = `Analyze this raw OCR text from a Tata Motors manual job card:\n\n${rawText}\n\n` +
      `Extract into JSON: vrn, customer_name, customer_mobile, vehicle_model, km_reading, job_description, remarks, service_advisor, verification_flags, verification_reasons. Return valid JSON only.`;

    let extractedFields: any = {
      vrn: extractJobCardFields(rawText).vrn || "Unknown",
      customer_name: "Walk-in Customer",
      customer_mobile: "0000000000",
      vehicle_model: "Tata Commercial Vehicle",
      km_reading: extractJobCardFields(rawText).odometer || 0,
      job_description: rawText.substring(0, 200),
      remarks: "Extracted via Azure OCR Fallback",
      service_advisor: "Unassigned",
      verification_flags: { vrn_needs_verification: false },
      verification_reasons: {},
    };

    try {
      const deepseekRes = await DeepSeekEngine.chat([
        { role: "system", content: "You are a Tata Motors workshop manual job card parser. Output valid JSON only." },
        { role: "user", content: prompt },
      ], { model: "deepseek-chat", temperature: 0.1 });

      const cleaned = deepseekRes.replace(/```json\n?|\n?```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedFields = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("[OcrFallback] DeepSeek parsing on Azure text failed, using rule-based fallback:", e);
    }

    return {
      extractedFields,
      confidence,
      raw: { text: rawText, extractedFields },
      text: rawText,
    };
  }

  public async extractInvoiceWithAzure(imageBase64?: string, textInput?: string): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    let rawText = textInput || "";
    let confidence = 0.9;

    if (imageBase64) {
      const res = await this.azureProcessor.process(imageBase64);
      rawText = (rawText ? rawText + "\n" : "") + res.text;
      confidence = res.confidence;
    }

    const prompt = `Analyze this raw invoice OCR text from a Tata Motors DMS/CRM invoice:\n\n${rawText}\n\n` +
      `Extract into JSON: invoice_no, job_card_no, labour_amount (number), parts_amount (number), customer_name, vrn, chassis_no, engine_no, mileage (integer), invoice_date (YYYY-MM-DD), assigned_technicians (string array). Return valid JSON only.`;

    let extractedFields: any = {
      invoice_no: `INV-${Date.now().toString().slice(-6)}`,
      job_card_no: "JC000",
      labour_amount: 0,
      parts_amount: 0,
      customer_name: "Walk-in Customer",
      vrn: extractJobCardFields(rawText).vrn || "Unknown",
      chassis_no: extractJobCardFields(rawText).chassisNo || "",
      engine_no: "",
      mileage: extractJobCardFields(rawText).odometer || 0,
      invoice_date: new Date().toISOString().split("T")[0],
      assigned_technicians: [],
    };

    try {
      const deepseekRes = await DeepSeekEngine.chat([
        { role: "system", content: "You are a Tata Motors workshop invoice parser. Output valid JSON only." },
        { role: "user", content: prompt },
      ], { model: "deepseek-chat", temperature: 0.1 });

      const cleaned = deepseekRes.replace(/```json\n?|\n?```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedFields = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("[OcrFallback] DeepSeek parsing on Azure invoice text failed:", e);
    }

    return {
      extractedFields,
      confidence,
      raw: { text: rawText, extractedFields },
      text: rawText,
    };
  }

  public async extractPartNumbersWithAzure(imageBase64: string): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const res = await this.azureProcessor.process(imageBase64);
    const rawText = res.text;
    const confidence = res.confidence;

    // Alphanumeric part number regex matcher
    const matches = rawText.match(/[A-Z0-9]{6,14}/g) || [];
    const partNumbers = Array.from(new Set(matches.filter(p => /\d/.test(p) && /[A-Z]/.test(p))));

    return {
      extractedFields: { partNumbers },
      confidence,
      raw: { text: rawText, partNumbers },
      text: rawText,
    };
  }
}

export const ocrFallbackService = OcrFallbackService.getInstance();
