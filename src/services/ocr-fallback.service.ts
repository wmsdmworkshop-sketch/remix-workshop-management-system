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

import { GoogleGenAI, Type } from "@google/genai";
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

    let geminiError: any = null;
    let geminiResult: { extractedFields: any; confidence: number; raw: any; text?: string } | null = null;

    // =========================================================================
    // STEP 1: Attempt Primary Provider (Gemini 3.1 / Gemini Flash)
    // =========================================================================
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`[OCR-Fallback] Attempting Primary Engine (Gemini) for context '${context}'...`);
        switch (context) {
          case "numberplate":
            geminiResult = await this.extractNumberplateWithGemini(base64Data, mimeType);
            break;
          case "manual-jobcard":
            geminiResult = await this.extractManualJobcardWithGemini(base64Data, mimeType);
            break;
          case "invoice":
            geminiResult = await this.extractInvoiceWithGemini(base64Data, mimeType, options.textInput);
            break;
          case "parts-photo":
            geminiResult = await this.extractPartNumbersWithGemini(base64Data, mimeType);
            break;
        }

        if (geminiResult && geminiResult.confidence >= threshold) {
          console.log(
            `[OCR-Fallback] ✅ Gemini succeeded for '${context}' with confidence ${geminiResult.confidence.toFixed(2)} (>= ${threshold})`
          );
          StructuredLogger.info(`[OCR-Fallback] Gemini succeeded for '${context}'`, {
            component: "OcrFallbackService",
            operation: "processWithFallback",
            result: "SUCCESS",
            provider: "Gemini",
            confidence: geminiResult.confidence,
          });

          return {
            provider: "Gemini",
            extractedFields: geminiResult.extractedFields,
            confidence: geminiResult.confidence,
            raw: geminiResult.raw,
            text: geminiResult.text,
            verificationTime: now,
          };
        } else if (geminiResult) {
          console.warn(
            `[OCR-Fallback] ⚠️ Gemini confidence (${geminiResult.confidence.toFixed(2)}) below threshold (${threshold}). Triggering Azure fallback...`
          );
        }
      } catch (err: any) {
        geminiError = err;
        console.warn(`[OCR-Fallback] ⚠️ Gemini primary extraction failed for '${context}': ${err.message}. Triggering Azure fallback...`);
      }
    } else {
      console.log(`[OCR-Fallback] GEMINI_API_KEY not configured. Routing directly to Azure for '${context}'...`);
    }

    // =========================================================================
    // STEP 2: Fallback Provider (Azure Document Intelligence)
    // =========================================================================
    try {
      console.log(`[OCR-Fallback] Attempting Fallback Engine (Azure) for context '${context}'...`);
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
      console.error(`[OCR-Fallback] ❌ Both Gemini and Azure failed for context '${context}'!`, {
        geminiError: geminiError?.message,
        azureError: azureErr?.message,
      });

      StructuredLogger.error(`[OCR-Fallback] All OCR providers failed for '${context}'`, {
        component: "OcrFallbackService",
        operation: "processWithFallback",
        result: "FAILURE",
        geminiError: geminiError?.message,
        azureError: azureErr?.message,
      }, azureErr);

      // If Gemini produced a low-confidence result rather than a hard crash, return it as last resort
      if (geminiResult && geminiResult.extractedFields) {
        console.warn(`[OCR-Fallback] Returning low-confidence Gemini result as last resort after Azure error.`);
        return {
          provider: "Gemini",
          extractedFields: geminiResult.extractedFields,
          confidence: geminiResult.confidence,
          raw: geminiResult.raw,
          text: geminiResult.text,
          verificationTime: now,
        };
      }

      throw new Error(`OCR Processing failed on both primary and fallback providers. Gemini: ${geminiError?.message || 'N/A'}, Azure: ${azureErr?.message || 'N/A'}`);
    }
  }

  // ===========================================================================
  // GEMINI EXTRACTORS
  // ===========================================================================

  public async extractNumberplateWithGemini(base64Data: string, mimeType = "image/jpeg"): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const prompt = `You are an expert OCR engine for Indian commercial vehicles (trucks, tippers, buses, tempos).
Examine the provided image of a vehicle number plate or dashboard.
Extract:
1. Vehicle Registration Number (VRN) formatted canonically as AB-12-CD-1234 or AB-12-1234 or 24-BH-1234-AB. Commercial plates are often painted in two lines (Line 1: "KA.32", Line 2: "AB.0507" -> "KA-32-AB-0507").
2. Odometer reading in KM as an integer (if visible).
3. Chassis number (if visible).
4. Confidence score from 0.0 to 1.0 based on legibility, blur, and standard format matching.

Output ONLY a JSON object matching this schema:
{
  "vrn": "KA-32-AB-0507",
  "odometer": 45200,
  "chassisNo": "MAT451092M81",
  "confidence": 0.95
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = (response.text || "").trim();
    if (!text) throw new Error("Gemini returned empty response for numberplate.");

    const parsed = JSON.parse(text);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : (parsed.vrn ? 0.9 : 0.4);

    return {
      extractedFields: {
        vrn: parsed.vrn || undefined,
        odometer: parsed.odometer ? Number(parsed.odometer) : undefined,
        chassisNo: parsed.chassisNo || undefined,
      },
      confidence,
      raw: parsed,
      text,
    };
  }

  public async extractManualJobcardWithGemini(base64Data: string, mimeType = "image/jpeg"): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const prompt = "You are an expert OCR and document-parsing assistant for Tata Motors workshops. " +
      "Please read the handwritten or printed Manual Job Card image provided and extract all legible parameters. " +
      "Ensure you look for vehicle registration number/VRN (e.g. KA-01-MJ-1234), customer name, customer phone, " +
      "vehicle model (e.g. Tata Nexon, Tiago, Safari, Harrier), km reading (Odometer), " +
      "reported complaints or job description, advisor name, and any special remarks. " +
      "Additionally, assess if any extracted value might be inaccurate, incomplete, handwriting is hard to read/blurry. " +
      "Include a confidence score from 0.0 to 1.0.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vrn: { type: Type.STRING, description: "Vehicle Registration Number" },
            customer_name: { type: Type.STRING, description: "Customer Full Name" },
            customer_mobile: { type: Type.STRING, description: "Customer 10-digit mobile number" },
            vehicle_model: { type: Type.STRING, description: "Vehicle Model" },
            km_reading: { type: Type.INTEGER, description: "Odometer KM reading" },
            job_description: { type: Type.STRING, description: "Customer voice, complaints text" },
            remarks: { type: Type.STRING, description: "Additional remarks" },
            service_advisor: { type: Type.STRING, description: "Service advisor name" },
            confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
            verification_flags: {
              type: Type.OBJECT,
              properties: {
                vrn_needs_verification: { type: Type.BOOLEAN },
                customer_name_needs_verification: { type: Type.BOOLEAN },
                customer_mobile_needs_verification: { type: Type.BOOLEAN },
                vehicle_model_needs_verification: { type: Type.BOOLEAN },
                km_reading_needs_verification: { type: Type.BOOLEAN },
                job_description_needs_verification: { type: Type.BOOLEAN },
                service_advisor_needs_verification: { type: Type.BOOLEAN },
              },
            },
            verification_reasons: {
              type: Type.OBJECT,
              properties: {
                vrn_reason: { type: Type.STRING },
                customer_name_reason: { type: Type.STRING },
                customer_mobile_reason: { type: Type.STRING },
                vehicle_model_reason: { type: Type.STRING },
                km_reading_reason: { type: Type.STRING },
                job_description_reason: { type: Type.STRING },
                service_advisor_reason: { type: Type.STRING },
              },
            },
          },
          required: ["vrn", "customer_name", "customer_mobile", "vehicle_model", "km_reading", "job_description", "remarks", "service_advisor"],
        },
      },
    });

    const text = (response.text || "").trim();
    if (!text) throw new Error("Gemini returned empty response for manual job card.");

    const parsed = JSON.parse(text);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : (parsed.vrn && parsed.customer_name ? 0.9 : 0.6);

    return {
      extractedFields: parsed,
      confidence,
      raw: parsed,
      text,
    };
  }

  public async extractInvoiceWithGemini(base64Data?: string, mimeType = "image/jpeg", textInput?: string): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const contents: any[] = [];
    if (base64Data) {
      contents.push({ inlineData: { data: base64Data, mimeType } });
    }
    contents.push({
      text: "You are an expert CRM DMS invoice parsing assistant for Tata Motors workshops. " +
        "Please read the provided invoice (image or pasted text) and extract all parameters: " +
        "invoice_no, job_card_no, labour_amount, parts_amount, customer_name, vrn, chassis_no, engine_no, mileage (integer), invoice_date (YYYY-MM-DD), and list of assigned_technicians. " +
        "Include a confidence score between 0.0 and 1.0." +
        (textInput ? `\n\nPasted Invoice Text:\n${textInput}` : ""),
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invoice_no: { type: Type.STRING },
            job_card_no: { type: Type.STRING },
            labour_amount: { type: Type.NUMBER },
            parts_amount: { type: Type.NUMBER },
            customer_name: { type: Type.STRING },
            vrn: { type: Type.STRING },
            chassis_no: { type: Type.STRING },
            engine_no: { type: Type.STRING },
            mileage: { type: Type.INTEGER },
            invoice_date: { type: Type.STRING },
            assigned_technicians: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER },
          },
          required: ["invoice_no", "job_card_no", "labour_amount", "parts_amount", "customer_name", "vrn", "chassis_no", "engine_no", "mileage", "invoice_date", "assigned_technicians"],
        },
      },
    });

    const text = (response.text || "").trim();
    if (!text) throw new Error("Gemini returned empty response for invoice.");

    const parsed = JSON.parse(text);
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : (parsed.invoice_no && parsed.vrn ? 0.95 : 0.6);

    return {
      extractedFields: parsed,
      confidence,
      raw: parsed,
      text,
    };
  }

  public async extractPartNumbersWithGemini(base64Data: string, mimeType = "image/jpeg"): Promise<{ extractedFields: any; confidence: number; raw: any; text: string }> {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Extract all part numbers and part labels from this spare parts or invoice image. Output JSON with partNumbers array and confidence score (0.0 to 1.0)." },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            partNumbers: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER },
          },
          required: ["partNumbers"],
        },
      },
    });

    const text = (response.text || "").trim();
    if (!text) throw new Error("Gemini returned empty response for parts photo.");

    const parsed = JSON.parse(text);
    const partNumbers = Array.isArray(parsed.partNumbers) ? parsed.partNumbers : [];
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : (partNumbers.length > 0 ? 0.9 : 0.5);

    return {
      extractedFields: { partNumbers },
      confidence,
      raw: parsed,
      text,
    };
  }

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
