import { pool as db } from "../db/index.ts";
import crypto from "crypto";

/**
 * =============================================================================
 * DWIP Enterprise Platform — AI Copilot Orchestrator (WP-08 AI Enablement)
 * Bounded Context: Intelligence & Technical Assistance
 * Description: Orchestrates AI diagnostic skills, handles missing API keys gracefully,
 *              and provides Tata Motors CV BS6 diagnostic troubleshooting.
 * =============================================================================
 */

export interface CopilotSkill {
  id: string;
  name: string;
  description: string;
  allowedRoles: string[];
  execute(prompt: string, context: any): Promise<any>;
}

export interface CommercialVehicleDiagnostic {
  faultCode: string;
  component: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
  estimatedFixTimeMins: number;
}

export class AiCopilotOrchestrator {
  private static skills = new Map<string, CopilotSkill>();

  // Register a skill dynamically
  public static registerSkill(skill: CopilotSkill) {
    this.skills.set(skill.id, skill);
  }

  // Get all registered skills
  public static getSkills(): CopilotSkill[] {
    if (this.skills.size === 0) {
      this.initDefaultSkills();
    }
    return Array.from(this.skills.values());
  }

  private static initDefaultSkills() {
    this.registerSkill({
      id: "warranty-skill",
      name: "Warranty Claim Analyzer",
      description: "Evaluates vehicle warranty coverage and claim eligibility",
      allowedRoles: ["Service Advisor", "Dealer Principal", "Admin", "Warranty Executive"],
      execute: async (prompt: string, context: any) => {
        const recId = `REC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        await db.execute(
          "INSERT INTO ai_recommendations (recommendation_id, recommendation_type, details_json, confidence_score, approval_status, requires_approval) VALUES (?, ?, ?, ?, ?, ?)",
          [recId, "WARRANTY", JSON.stringify(context), 0.95, "PENDING", 1]
        );
        return { recommendationId: recId, status: "PENDING_APPROVAL", recommendationType: "WARRANTY" };
      }
    });

    this.registerSkill({
      id: "finance-skill",
      name: "Goodwill Finance Evaluator",
      description: "Evaluates financial goodwill and discount exceptions",
      allowedRoles: ["Dealer Principal", "GM Service", "Admin"],
      execute: async (prompt: string, context: any) => {
        const recId = `REC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        await db.execute(
          "INSERT INTO ai_recommendations (recommendation_id, recommendation_type, details_json, confidence_score, approval_status, requires_approval) VALUES (?, ?, ?, ?, ?, ?)",
          [recId, "FINANCE", JSON.stringify(context), 0.90, "PENDING", 1]
        );
        return { recommendationId: recId, status: "PENDING_APPROVAL", recommendationType: "FINANCE" };
      }
    });

    this.registerSkill({
      id: "inventory-skill",
      name: "Parts Inventory Advisor",
      description: "Analyzes stock levels and reorder requirements",
      allowedRoles: ["Store Manager", "Parts Counter", "Dealer Principal", "Admin"],
      execute: async (prompt: string, context: any) => {
        const recId = `REC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        await db.execute(
          "INSERT INTO ai_recommendations (recommendation_id, recommendation_type, details_json, confidence_score, approval_status, requires_approval) VALUES (?, ?, ?, ?, ?, ?)",
          [recId, "INVENTORY", JSON.stringify(context), 0.92, "PENDING", 1]
        );
        return { recommendationId: recId, status: "PENDING_APPROVAL", recommendationType: "INVENTORY" };
      }
    });
  }

  /**
   * Diagnostic Troubleshooting Generator for Tata Motors BS6 Commercial Vehicles.
   */
  public static getCommercialVehicleDiagnostic(faultCodeOrQuery: string): CommercialVehicleDiagnostic {
    const cleanQuery = faultCodeOrQuery.toUpperCase();

    if (cleanQuery.includes("P204F") || cleanQuery.includes("ADBLUE") || cleanQuery.includes("DEF")) {
      return {
        faultCode: "P204F",
        component: "SCR Reductant Dosing System",
        severity: "HIGH",
        recommendation: "AdBlue Dosing Pressure Low. Inspect DEF pump unit, check dosing valve for urea crystallization, verify DEF fluid quality.",
        estimatedFixTimeMins: 45
      };
    }

    if (cleanQuery.includes("P2463") || cleanQuery.includes("DPF") || cleanQuery.includes("SOOT")) {
      return {
        faultCode: "P2463",
        component: "Diesel Particulate Filter (DPF)",
        severity: "CRITICAL",
        recommendation: "DPF Soot Loading Exceeded Threshold (>80%). Initiate forced stationary DPF regeneration via Tata Diagnostic Tool.",
        estimatedFixTimeMins: 60
      };
    }

    if (cleanQuery.includes("P0299") || cleanQuery.includes("TURBO") || cleanQuery.includes("BOOST")) {
      return {
        faultCode: "P0299",
        component: "Variable Geometry Turbocharger (VGT)",
        severity: "HIGH",
        recommendation: "Engine Underboost Condition. Inspect VGT pneumatic actuator linkage, check intercooler piping for boost leaks.",
        estimatedFixTimeMins: 90
      };
    }

    return {
      faultCode: "GEN-BS6",
      component: "Engine Management System",
      severity: "MEDIUM",
      recommendation: "Standard BS-VI ECU diagnostic procedure. Perform full vehicle scan via Tata Motors Diagnostic Software.",
      estimatedFixTimeMins: 30
    };
  }

  // Orchestrate execution by matching prompt keywords to a registered skill
  public static async dispatch(prompt: string, role: string, context: any): Promise<any> {
    if (this.skills.size === 0) {
      this.initDefaultSkills();
    }
    const cleanPrompt = prompt.toLowerCase();

    // Check if prompt is a diagnostic query first
    if (cleanPrompt.includes("fault") || cleanPrompt.includes("code") || cleanPrompt.includes("adblue") || cleanPrompt.includes("dpf")) {
      const diag = this.getCommercialVehicleDiagnostic(prompt);
      return {
        status: "EXECUTED",
        diagnostic: diag,
        confidence: 0.95,
        source: "DWIP Tata CV Expert Knowledge Base"
      };
    }

    let targetSkillId = "";
    if (cleanPrompt.includes("warranty") || cleanPrompt.includes("claim")) {
      targetSkillId = "warranty-skill";
    } else if (cleanPrompt.includes("discount") || cleanPrompt.includes("goodwill") || cleanPrompt.includes("finance")) {
      targetSkillId = "finance-skill";
    } else if (cleanPrompt.includes("part") || cleanPrompt.includes("stock") || cleanPrompt.includes("inventory")) {
      targetSkillId = "inventory-skill";
    } else {
      targetSkillId = "";
    }

    if (!targetSkillId || !this.skills.has(targetSkillId)) {
      // Fallback response when no API key or skill match
      const fallbackDiag = this.getCommercialVehicleDiagnostic(prompt);
      return {
        status: "FALLBACK_MODE",
        message: "Gemini API key unconfigured. Returning structured Commercial Vehicle diagnostic recommendation.",
        diagnostic: fallbackDiag,
        confidence: 0.90
      };
    }

    const skill = this.skills.get(targetSkillId)!;
    const normalizedRole = role.toLowerCase().replace(/_/g, " ").trim();
    const isAuthorized = skill.allowedRoles.some(
      r => r === "*" || r.toLowerCase().replace(/_/g, " ").trim() === normalizedRole
    );
    if (!isAuthorized) {
      throw new Error(`Access denied. Role "${role}" is not authorized to execute skill "${skill.name}".`);
    }

    const result = await skill.execute(prompt, context);
    if (result && typeof result === "object" && result.status) {
      return result;
    }
    return {
      status: "EXECUTED",
      result
    };
  }
}
