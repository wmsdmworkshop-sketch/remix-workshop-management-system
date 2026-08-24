/**
 * =============================================================================
 * DWIP Enterprise Platform — DeepSeek AI Engine
 * Bounded Context: Intelligence, Research & Commercial Vehicle Diagnostics
 * Description: Connects DWIP to DeepSeek (deepseek-chat / deepseek-reasoner)
 *              for high-depth reasoning, diagnostics, and operational intelligence.
 * =============================================================================
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
  private static getApiKey(): string {
    // Env-only by design. A committed fallback key would be a live credential
    // published to the repo, and would also mask a genuine misconfiguration by
    // silently working. Set DEEPSEEK_API_KEY on the runtime environment
    // (already configured on the dwip-enterprise Cloud Run service).
    return process.env.DEEPSEEK_API_KEY || "";
  }

  private static getBaseUrl(): string {
    return process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  }

  /**
   * Check if DeepSeek API is configured and operational
   */
  public static async checkHealth(): Promise<{ status: "ok" | "error"; models?: any[]; message?: string }> {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        return { status: "error", message: "DEEPSEEK_API_KEY is not configured" };
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
        return { status: "error", message: `DeepSeek API returned HTTP ${res.status}` };
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
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const model = options.model || "deepseek-chat";
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
        max_tokens: options.maxTokens ?? 2048
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API Error (${res.status}): ${errText}`);
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

    const prompt = `Vehicle: ${vehicleInfo?.model || "Tata Signa 4825"} (Engine: ${vehicleInfo?.engine || "Cummins ISBe 6.7 BS6"}, Odometer: ${vehicleInfo?.odometer || 150000} KM)\nFault / Symptom: ${faultCodeOrComplaint}`;

    const rawResponse = await this.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ], {
      model: "deepseek-chat",
      temperature: 0.1
    });

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          modelUsed: "DeepSeek AI Engine"
        };
      }
    } catch {}

    return {
      faultCode: faultCodeOrComplaint.slice(0, 10),
      diagnosis: rawResponse,
      rootCause: "Requires physical bay inspection",
      recommendedAction: rawResponse.slice(0, 200),
      partsRequired: ["Standard CV Diagnostic Kit"],
      estimatedRepairHours: 2.5,
      modelUsed: "DeepSeek AI Engine"
    };
  }
}
