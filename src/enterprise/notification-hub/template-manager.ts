/**
 * =============================================================================
 * DWIP Enterprise Notification Hub — Template Manager
 * Module: notification-hub/template-manager.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 7.3 (Template Management)
 *
 * Manages versioned notification templates with variable interpolation.
 * Supports multi-language, multi-channel templates.
 * Single Responsibility: template storage, versioning, and rendering.
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type {
  NotificationTemplate,
  NotificationChannel,
  NotificationCategory,
} from "./types.ts";

export interface ITemplateManager {
  register(template: Omit<NotificationTemplate, "templateId" | "createdAt" | "updatedAt" | "version">): NotificationTemplate;
  update(templateId: string, bodyTemplate: string, subject?: string): NotificationTemplate;
  get(templateKey: string, channel: NotificationChannel, language?: string): NotificationTemplate | undefined;
  getById(templateId: string): NotificationTemplate | undefined;
  render(templateId: string, variables: Record<string, string>): RenderedTemplate;
  listByCategory(category: NotificationCategory): ReadonlyArray<NotificationTemplate>;
  listByChannel(channel: NotificationChannel): ReadonlyArray<NotificationTemplate>;
  deactivate(templateId: string): boolean;
}

export interface RenderedTemplate {
  readonly subject?: string;
  readonly body: string;
  readonly channel: NotificationChannel;
  readonly language: string;
  readonly templateId: string;
  readonly templateKey: string;
  readonly missingVariables: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Platform Template Definitions
// ---------------------------------------------------------------------------

type TemplateInit = Omit<NotificationTemplate, "templateId" | "createdAt" | "updatedAt" | "version">;

export const PLATFORM_TEMPLATES: TemplateInit[] = [
  // SLA Alerts
  {
    templateKey: "sla.warning",
    channel: "IN_APP",
    category: "SLA_ALERT",
    subject: undefined,
    bodyTemplate: "⚠️ SLA Warning: Job {{job_card_id}} has been in {{stage}} for {{elapsed_hours}}h. Threshold: {{threshold_hours}}h.",
    variables: ["job_card_id", "stage", "elapsed_hours", "threshold_hours"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "sla.breach",
    channel: "IN_APP",
    category: "SLA_ALERT",
    bodyTemplate: "🚨 SLA Breach: Job {{job_card_id}} breached at {{breach_stage}} after {{breach_hours}}h.",
    variables: ["job_card_id", "breach_stage", "breach_hours"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "sla.breach.sms",
    channel: "SMS",
    category: "SLA_ALERT",
    bodyTemplate: "DWIP Alert: SLA breached on job {{job_card_id}} ({{breach_stage}}). Immediate action required.",
    variables: ["job_card_id", "breach_stage"],
    isActive: true,
    language: "en",
  },
  // Job Status
  {
    templateKey: "job.gate_in.customer",
    channel: "SMS",
    category: "JOB_STATUS_UPDATE",
    bodyTemplate: "Dear {{customer_name}}, your vehicle {{registration_number}} has been received at {{workshop_name}}. Job Card: {{job_card_id}}.",
    variables: ["customer_name", "registration_number", "workshop_name", "job_card_id"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "job.gate_in.customer.whatsapp",
    channel: "WHATSAPP",
    category: "JOB_STATUS_UPDATE",
    bodyTemplate: "Hello {{customer_name}} 👋\n\nYour vehicle *{{registration_number}}* has been received at *{{workshop_name}}*.\n\n📋 Job Card: {{job_card_id}}\n🕐 Received: {{gate_in_time}}\n\nWe'll keep you updated on progress.",
    variables: ["customer_name", "registration_number", "workshop_name", "job_card_id", "gate_in_time"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "job.diagnostic.complete",
    channel: "SMS",
    category: "JOB_STATUS_UPDATE",
    bodyTemplate: "Diagnostic complete for {{registration_number}}. Findings: {{findings_summary}}. Estimation: ₹{{estimation_amount}}. Reply YES to approve.",
    variables: ["registration_number", "findings_summary", "estimation_amount"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "job.ready_for_delivery",
    channel: "SMS",
    category: "JOB_STATUS_UPDATE",
    bodyTemplate: "Dear {{customer_name}}, your vehicle {{registration_number}} is ready for delivery. Visit {{workshop_name}} at your convenience.",
    variables: ["customer_name", "registration_number", "workshop_name"],
    isActive: true,
    language: "en",
  },
  // Approval Requests
  {
    templateKey: "approval.goodwill.request",
    channel: "IN_APP",
    category: "APPROVAL_REQUEST",
    bodyTemplate: "🔔 Goodwill Approval Required: ₹{{amount}} for Job {{job_card_id}}. Reason: {{reason}}. Raised by: {{raised_by}}.",
    variables: ["amount", "job_card_id", "reason", "raised_by"],
    isActive: true,
    language: "en",
  },
  {
    templateKey: "approval.warranty.request",
    channel: "IN_APP",
    category: "APPROVAL_REQUEST",
    bodyTemplate: "🔔 Warranty Claim Approval: ₹{{claim_amount}} for Vehicle {{registration_number}} ({{claim_type}}). Claim ID: {{claim_id}}.",
    variables: ["claim_amount", "registration_number", "claim_type", "claim_id"],
    isActive: true,
    language: "en",
  },
  // Breakdown
  {
    templateKey: "breakdown.request.alert",
    channel: "IN_APP",
    category: "BREAKDOWN_ALERT",
    bodyTemplate: "🚨 Breakdown Request: Customer {{customer_name}} needs assistance at {{location}}. Vehicle: {{registration_number}}. Request ID: {{request_id}}.",
    variables: ["customer_name", "location", "registration_number", "request_id"],
    isActive: true,
    language: "en",
  },
  // Escalation
  {
    templateKey: "escalation.manager",
    channel: "EMAIL",
    category: "ESCALATION",
    subject: "ESCALATION: {{escalation_type}} — Immediate Action Required",
    bodyTemplate: "Dear {{manager_name}},\n\nThis is an automated escalation for: {{escalation_type}}\n\nJob Card: {{job_card_id}}\nWorkshop: {{workshop_name}}\nTime Elapsed: {{elapsed_hours}}h\nDetails: {{details}}\n\nPlease take immediate action.\n\n— DWIP System",
    variables: ["manager_name", "escalation_type", "job_card_id", "workshop_name", "elapsed_hours", "details"],
    isActive: true,
    language: "en",
  },
  // Digest
  {
    templateKey: "digest.daily.email",
    channel: "EMAIL",
    category: "DIGEST",
    subject: "DWIP Daily Summary — {{date}}",
    bodyTemplate: "Good morning {{recipient_name}},\n\nHere is your daily summary for {{date}}:\n\n{{digest_content}}\n\n— DWIP Platform",
    variables: ["recipient_name", "date", "digest_content"],
    isActive: true,
    language: "en",
  },
];

export class TemplateManager implements ITemplateManager {
  /** templateId → NotificationTemplate */
  private readonly templates = new Map<string, NotificationTemplate>();

  constructor() {
    this.bootstrapPlatformTemplates();
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  public register(
    template: Omit<NotificationTemplate, "templateId" | "createdAt" | "updatedAt" | "version">
  ): NotificationTemplate {
    const now = new Date().toISOString();
    const record: NotificationTemplate = Object.freeze({
      templateId: randomUUID(),
      ...template,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    this.templates.set(record.templateId, record);
    return record;
  }

  public update(templateId: string, bodyTemplate: string, subject?: string): NotificationTemplate {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new Error(`[TemplateManager] Template "${templateId}" not found.`);
    }
    const updated: NotificationTemplate = Object.freeze({
      ...existing,
      bodyTemplate,
      subject: subject ?? existing.subject,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    });
    this.templates.set(templateId, updated);
    return updated;
  }

  public deactivate(templateId: string): boolean {
    const existing = this.templates.get(templateId);
    if (!existing) return false;
    this.templates.set(templateId, Object.freeze({ ...existing, isActive: false }));
    return true;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  public get(
    templateKey: string,
    channel: NotificationChannel,
    language: string = "en"
  ): NotificationTemplate | undefined {
    for (const template of this.templates.values()) {
      if (
        template.templateKey === templateKey &&
        template.channel === channel &&
        template.language === language &&
        template.isActive
      ) {
        return template;
      }
    }
    // Language fallback to English
    if (language !== "en") {
      return this.get(templateKey, channel, "en");
    }
    return undefined;
  }

  public getById(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  public listByCategory(category: NotificationCategory): ReadonlyArray<NotificationTemplate> {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category && t.isActive
    );
  }

  public listByChannel(channel: NotificationChannel): ReadonlyArray<NotificationTemplate> {
    return Array.from(this.templates.values()).filter(
      (t) => t.channel === channel && t.isActive
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  public render(templateId: string, variables: Record<string, string>): RenderedTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`[TemplateManager] Cannot render: template "${templateId}" not found.`);
    }

    const missingVariables: string[] = [];
    let body = template.bodyTemplate;
    let subject = template.subject;

    for (const variable of template.variables) {
      const value = variables[variable];
      if (value === undefined || value === null) {
        missingVariables.push(variable);
        // Use empty string as graceful fallback
        body = body.replaceAll(`{{${variable}}}`, "");
        if (subject) {
          subject = subject.replaceAll(`{{${variable}}}`, "");
        }
      } else {
        body = body.replaceAll(`{{${variable}}}`, value);
        if (subject) {
          subject = subject.replaceAll(`{{${variable}}}`, value);
        }
      }
    }

    return {
      subject,
      body,
      channel: template.channel,
      language: template.language,
      templateId: template.templateId,
      templateKey: template.templateKey,
      missingVariables,
    };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private bootstrapPlatformTemplates(): void {
    for (const template of PLATFORM_TEMPLATES) {
      try {
        this.register(template);
      } catch (err: any) {
        console.error(`[TemplateManager] Failed to bootstrap template "${template.templateKey}": ${err.message}`);
      }
    }
  }
}
