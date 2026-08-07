/**
 * =============================================================================
 * DWIP Executive Presentation Layer — Types & DTOs
 * Module: platforms/executive/types.ts
 * =============================================================================
 */

export interface WidgetDefinition {
  readonly widgetId: string;
  readonly widgetKey: string;
  readonly title: string;
  readonly type: "KPI_CARD" | "CHART" | "HEATMAP" | "LEADERBOARD" | "ALERT_LIST" | "AI_INSIGHT";
  readonly metricKeys: ReadonlyArray<string>;
  readonly layoutConfig?: Record<string, any>;
}

export interface DashboardDefinition {
  readonly dashboardId: string;
  readonly role: string;
  readonly title: string;
  readonly widgets: ReadonlyArray<WidgetDefinition>;
}

export interface ExecutiveAlert {
  readonly alertId: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly title: string;
  readonly description: string;
  readonly triggeredAt: string;
}

export interface ExecutiveViewPayload {
  readonly role: string;
  readonly dashboard: DashboardDefinition;
  readonly widgetData: Record<string, any>;
  readonly alerts: ReadonlyArray<ExecutiveAlert>;
  readonly generatedAt: string;
}
