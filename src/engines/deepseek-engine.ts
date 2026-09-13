/**
 * =============================================================================
 * DWIP Enterprise Platform — AI Reasoning Engine (NVIDIA Nemotron)
 * Bounded Context: Intelligence, Research & Commercial Vehicle Diagnostics
 * =============================================================================
 *
 * WAS DEEPSEEK. Now NVIDIA NIM.
 *
 * DEEPSEEK_API_KEY was a placeholder in this environment and answered 401 on
 * every request for months. Nothing checked, so every feature that funnels
 * through here — the RBAC copilot, bug triage, fault diagnosis, sync anomaly
 * analysis — has been silently dead. The class name and method signatures are
 * kept so the call sites need no edit; only the provider underneath changed.
 *
 * The AI-mode kill switch stays exactly where it was: this is still the single
 * chokepoint every reasoning feature passes through.
 */

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekChatOptions {
  model?: "deepseek-chat" | "deepseek-reasoner" | "deepseek-v4-pro" | "deepseek-v4-flash" | string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface DeepSeekDiagnosticResult {
  faultCode?: string;
  diagnosis: string;
  rootCause: string;
  recommendedAction: string;
  partsRequired: string[];
  estimatedRepairHours: number;
  modelUsed: string;
}

export class DeepSeekEngine {
  /**
   * The configured key, or "" when there is nothing usable.
   *
   * A PLACEHOLDER IS NOT A KEY. Accepting any non-empty string is exactly how
   * the DeepSeek path stayed dead and invisible. NVIDIA keys begin "nvapi-";
   * anything else is refused here rather than sent upstream to 401.
   */
  private static getApiKey(): string {
    const raw = (process.env.NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY || "").trim();
    if (!raw) return "";
    if (/^(your[_-]|<|xxx|placeholder|changeme|todo)/i.test(raw)) return "";
    if (!raw.startsWith("nvapi-")) return "";
    return raw;
  }

  private static getBaseUrl(): string {
    return process.env.NEMOTRON_BASE_URL || "https://integrate.api.nvidia.com/v1";
  }

  /** The text model every method here uses. */
  private static getModel(requested?: string): string {
    // Legacy call sites pass "deepseek-chat" / "deepseek-reasoner". Those ids
    // do not exist on NIM; map anything unrecognised to the configured model
    // rather than forwarding an id that would 404.
    if (requested && requested.startsWith("nvidia/")) return requested;
    return process.env.NEMOTRON_TEXT_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
  }

  /**
   * Check if DeepSeek API is configured and operational
   */
  public static async checkHealth(): Promise<{ status: "ok" | "error"; models?: any[]; message?: string }> {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        return { status: "error", message: "NEMOTRON_API_KEY is not configured (an NVIDIA key starting 'nvapi-')" };
      }

      const res = await fetch(`${this.getBaseUrl()}/models`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        return { status: "ok", models: data.data || [] };
      } else {
        return { status: "error", message: `NVIDIA NIM returned HTTP ${res.status}` };
      }
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }

  /**
   * Execute chat completion via DeepSeek
   */
  public static async chat(messages: DeepSeekMessage[], options: DeepSeekChatOptions = {}): Promise<string> {
    // Global AI Mode kill switch. Checked here because this is the single
    // chokepoint every AI feature funnels through, so switching AI off really
    // does stop outbound calls (and API-key spend) rather than just hiding UI.
    // Imported lazily to keep this engine usable in contexts with no DB pool
    // (unit tests, scripts) — a failed import must never block a real call.
    try {
      const { isAiModeEnabled } = await import("../core/ai-mode.ts");
      if (!(await isAiModeEnabled())) {
        throw new Error("AI_MODE_DISABLED: AI features are switched off for this workshop.");
      }
    } catch (e: any) {
      if (String(e?.message || "").startsWith("AI_MODE_DISABLED")) throw e;
      // Anything else (no pool, module resolution) — fall through and proceed.
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("AI is not configured — set NEMOTRON_API_KEY to a real NVIDIA key (it starts with 'nvapi-').");
    }

    const model = this.getModel(options.model);
    const res = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        // REASONING BUDGET. The model thinks BEFORE it answers and that
        // thinking counts against this limit; measured, a budget of 120 is
        // truncated mid-thought and yields no answer at all. Floor it.
        max_tokens: Math.max(options.maxTokens ?? 2048, 512)
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA NIM error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  /**
   * Perform deep reasoning analysis on workshop breakdowns / issues
   */
  public static async reason(prompt: string, contextData?: Record<string, any>): Promise<{ reasoning: string; conclusion: string }> {
    const systemPrompt = `You are the chief AI Technical Specialist for DWIP Enterprise (Devanand Workshop Integrated Platform), servicing Tata Motors Commercial Vehicles (BS6 Signa, Prima, Ultra, Ace). Provide deep multi-step root cause analysis, diagnostic troubleshooting, and precise recommendations.`;

    const userContent = contextData 
      ? `Context Data:\n${JSON.stringify(contextData, null, 2)}\n\nQuery/Problem:\n${prompt}`
      : prompt;

    const messages: DeepSeekMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ];

    const response = await this.chat(messages, {
      model: "deepseek-chat",
      temperature: 0.2,
      maxTokens: 2500
    });

    return {
      reasoning: response,
      conclusion: response.slice(0, 300)
    };
  }

  /**
   * Commercial Vehicle BS6 Technical Diagnostics
   */
  public static async diagnoseFault(faultCodeOrComplaint: string, vehicleInfo?: { model?: string; engine?: string; odometer?: number }): Promise<DeepSeekDiagnosticResult> {
    const systemPrompt = `You are a certified Tata Motors Commercial Vehicle Master Diagnostic Engineer.
Analyze the provided fault code or driver complaint and return ONLY a valid JSON object matching this schema:
{
  "faultCode": string,
  "diagnosis": string,
  "rootCause": string,
  "recommendedAction": string,
  "partsRequired": string[],
  "estimatedRepairHours": number
}`;

    // NO INVENTED VEHICLE. This previously defaulted to a Tata Signa 4825 with
    // a Cummins ISBe 6.7 and 150,000 km whenever the caller passed nothing, so
    // a diagnosis for an unknown vehicle came back confidently describing one
    // that was never in the workshop. Unknown facts are omitted instead, and
    // the model is told they are unknown.
    const known: string[] = [];
    if (vehicleInfo?.model) known.push(`Model: ${vehicleInfo.model}`);
    if (vehicleInfo?.engine) known.push(`Engine: ${vehicleInfo.engine}`);
    if (Number.isFinite(Number(vehicleInfo?.odometer))) {
      known.push(`Odometer: ${Number(vehicleInfo!.odometer)} KM`);
    }
    const vehicleLine = known.length
      ? `Vehicle: ${known.join(", ")}`
      : "Vehicle details: not supplied. Do not assume a model, engine or mileage; if the answer depends on them, say so.";
    const prompt = `${vehicleLine}\nFault / Symptom: ${faultCodeOrComplaint}`;

    const rawResponse = await this.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ], {
      model: "deepseek-chat",
      temperature: 0.1
    });

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // NO INVENTED DIAGNOSIS. This previously returned a fabricated result —
      // "Standard CV Diagnostic Kit", 2.5 estimated hours, a root cause of
      // "Requires physical bay inspection" — none of which came from the model
      // or from any vehicle. A technician cannot tell that apart from a real
      // diagnosis, and parts and labour hours are acted on. Failing loudly is
      // the only honest option.
      throw new Error("The diagnostic model did not return a usable result. Nothing has been recorded.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("The diagnostic model returned malformed output. Nothing has been recorded.");
    }

    return {
      faultCode: parsed.faultCode,
      diagnosis: String(parsed.diagnosis || "").trim(),
      rootCause: String(parsed.rootCause || "").trim(),
      recommendedAction: String(parsed.recommendedAction || "").trim(),
      // Only what the model actually returned. An absent list stays empty
      // rather than becoming a plausible-looking default kit.
      partsRequired: Array.isArray(parsed.partsRequired) ? parsed.partsRequired : [],
      estimatedRepairHours: Number.isFinite(Number(parsed.estimatedRepairHours))
        ? Number(parsed.estimatedRepairHours)
        : 0,
      modelUsed: this.getModel(),
    };
  }
}
