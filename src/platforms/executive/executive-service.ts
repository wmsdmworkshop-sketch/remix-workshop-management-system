/**
 * =============================================================================
 * DWIP Executive Command Center — Service Engine
 * Module: platforms/executive/executive-service.ts
 * =============================================================================
 */

import { randomUUID } from "crypto";
import type { DashboardDefinition, WidgetDefinition, ExecutiveAlert, ExecutiveViewPayload } from "./types";
import { AnalyticsEngine } from "../analytics/analytics-engine";
import { CRMService } from "../customer-experience/crm-service";
import { EnterpriseAIEngine } from "../enterprise-ai/ai-engine";

export class ExecutiveService {
  private readonly dashboards = new Map<string, DashboardDefinition>();

  constructor(
    private readonly analyticsEngine: AnalyticsEngine,
    private readonly crmService: CRMService,
    private readonly aiEngine: EnterpriseAIEngine
  ) {
    this.bootstrapDashboards();
  }

  /**
   * Resolves role-based presentation payload by aggregating Analytics, CRM, and AI engine outputs.
   */
  public getRoleDashboardView(role: string): ExecutiveViewPayload {
    const dsb = this.dashboards.get(role.toUpperCase()) || this.dashboards.get("DEFAULT")!;
    const widgetData: Record<string, any> = {};

    // Consume existing services to populate presentation layer widget contents
    for (const widget of dsb.widgets) {
      if (widget.type === "KPI_CARD" && widget.metricKeys.includes("avg_turnaround_time")) {
        widgetData[widget.widgetKey] = this.analyticsEngine.aggregate({
          requestId: `EX-${randomUUID()}`,
          metricKey: "avg_turnaround_time",
          dimensions: [],
          filters: [],
          periodStart: new Date(Date.now() - 86400000).toISOString(),
          periodEnd: new Date().toISOString(),
          granularity: "DAILY",
          aggregation: "AVG"
        });
      } else if (widget.type === "AI_INSIGHT") {
        widgetData[widget.widgetKey] = this.aiEngine.generatePrediction({
          useCase: "revenue_prediction",
          entityId: "SYSTEM"
        });
      } else {
        widgetData[widget.widgetKey] = { status: "ACTIVE", sampleSize: 100 };
      }
    }

    const alerts: ExecutiveAlert[] = [
      {
        alertId: `AL-${randomUUID().substring(0, 8).toUpperCase()}`,
        severity: "HIGH",
        title: "Workshop Overload Alert",
        description: "Mechanical Bay 1 throughput TAT exceeds SLA warning threshold of 240 mins.",
        triggeredAt: new Date().toISOString()
      }
    ];

    return {
      role,
      dashboard: dsb,
      widgetData,
      alerts,
      generatedAt: new Date().toISOString()
    };
  }

  private bootstrapDashboards(): void {
    // CEO Dashboard Definition
    this.dashboards.set("CEO", {
      dashboardId: "CEO_DASH",
      role: "CEO",
      title: "Executive Director Overview",
      widgets: [
        {
          widgetId: "W-101",
          widgetKey: "tat_card",
          title: "SLA Turnaround Time",
          type: "KPI_CARD",
          metricKeys: ["avg_turnaround_time"]
        },
        {
          widgetId: "W-102",
          widgetKey: "ai_revenue",
          title: "AI Revenue Forecast (Next 30d)",
          type: "AI_INSIGHT",
          metricKeys: ["revenue_prediction"]
        }
      ]
    });

    // Default Dashboard fallback
    this.dashboards.set("DEFAULT", {
      dashboardId: "DEFAULT_DASH",
      role: "DEFAULT",
      title: "Workshop Standard Operator Overview",
      widgets: [
        {
          widgetId: "W-001",
          widgetKey: "standard_card",
          title: "Throughput Analysis",
          type: "KPI_CARD",
          metricKeys: ["avg_turnaround_time"]
        }
      ]
    });
  }
}
