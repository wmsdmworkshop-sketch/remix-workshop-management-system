/**
 * =============================================================================
 * DWIP Enterprise Analytics Platform — Types & Contracts
 * Module: platforms/analytics/types.ts
 * Architecture Reference: DWIP-V1-ARCH-011 § 8 (Analytics Platform)
 *
 * All DTOs, enums, and interfaces for the Enterprise Analytics Platform.
 * Immutable, stateless, DTO-based. Zero direct database access.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Core Enumerations
// ---------------------------------------------------------------------------

export type MetricUnit =
  | "COUNT" | "PERCENTAGE" | "MINUTES" | "HOURS" | "DAYS"
  | "INR" | "USD" | "RATIO" | "SCORE" | "NPS_POINTS";

export type MetricAggregation = "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "PERCENTILE_95" | "PERCENTILE_99" | "MEDIAN";

export type DimensionType = "CATEGORICAL" | "TEMPORAL" | "HIERARCHICAL" | "GEOGRAPHIC" | "NUMERIC";

export type TrendDirection = "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE";

export type BenchmarkType = "INTERNAL_TARGET" | "INDUSTRY_BENCHMARK" | "HISTORICAL_AVERAGE" | "REGULATORY";

export type GranularityLevel = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export type KPIStatus = "ON_TRACK" | "AT_RISK" | "CRITICAL" | "EXCEEDED" | "INSUFFICIENT_DATA";

export type AnalyticsDomain =
  | "WORKSHOP_OPERATIONS"
  | "CUSTOMER_EXPERIENCE"
  | "FINANCIAL"
  | "FLEET"
  | "BUSINESS_PROGRAMS"
  | "ENTERPRISE";

export type ForecastMethod = "LINEAR_REGRESSION" | "MOVING_AVERAGE" | "EXPONENTIAL_SMOOTHING" | "SEASONAL_DECOMPOSITION";

export type ReportFormat = "JSON" | "CSV" | "SUMMARY";

// ---------------------------------------------------------------------------
// Dimension DTOs
// ---------------------------------------------------------------------------

export interface DimensionDefinition {
  readonly dimensionId: string;
  readonly dimensionKey: string;
  readonly label: string;
  readonly type: DimensionType;
  readonly domain: AnalyticsDomain;
  readonly possibleValues?: ReadonlyArray<string>;
  readonly hierarchy?: ReadonlyArray<string>; // e.g. ["DEALER", "WORKSHOP", "BAY"]
  readonly description: string;
  readonly isRequired: boolean;
}

export interface DimensionValue {
  readonly dimensionKey: string;
  readonly value: string | number;
  readonly label?: string;
}

// ---------------------------------------------------------------------------
// Metric DTOs
// ---------------------------------------------------------------------------

export interface MetricDefinition {
  readonly metricId: string;
  readonly metricKey: string;
  readonly label: string;
  readonly description: string;
  readonly unit: MetricUnit;
  readonly aggregation: MetricAggregation;
  readonly domain: AnalyticsDomain;
  readonly dimensions: ReadonlyArray<string>; // dimensionKeys
  readonly formula?: string; // human-readable formula description
  readonly targetValue?: number;
  readonly warningThreshold?: number;
  readonly criticalThreshold?: number;
  readonly higherIsBetter: boolean;
  readonly tags: ReadonlyArray<string>;
  readonly isActive: boolean;
  readonly introducedAt: string;
}

export interface MetricDataPoint {
  readonly metricKey: string;
  readonly value: number;
  readonly dimensions: ReadonlyArray<DimensionValue>;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly granularity: GranularityLevel;
  readonly computedAt: string;
  readonly sampleSize?: number;
}

// ---------------------------------------------------------------------------
// Fact DTOs
// ---------------------------------------------------------------------------

export interface FactDefinition {
  readonly factId: string;
  readonly factKey: string;
  readonly label: string;
  readonly description: string;
  readonly domain: AnalyticsDomain;
  readonly sourceEvents: ReadonlyArray<string>; // eventTypes from Event Catalog
  readonly dimensions: ReadonlyArray<string>;
  readonly measures: ReadonlyArray<string>; // metricKeys
  readonly granularity: GranularityLevel;
  readonly retentionDays: number;
}

export interface FactRecord {
  readonly factId: string;
  readonly factKey: string;
  readonly dimensions: ReadonlyArray<DimensionValue>;
  readonly measures: Readonly<Record<string, number>>;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly recordedAt: string;
}

// ---------------------------------------------------------------------------
// KPI & Business Glossary DTOs
// ---------------------------------------------------------------------------

export interface KPIDefinition {
  readonly kpiId: string;
  readonly kpiKey: string;
  readonly label: string;
  readonly description: string;
  readonly domain: AnalyticsDomain;
  readonly metricKey: string;
  readonly targetValue: number;
  readonly warningThreshold: number;
  readonly criticalThreshold: number;
  readonly unit: MetricUnit;
  readonly granularity: GranularityLevel;
  readonly owner: string;
  readonly reviewFrequency: GranularityLevel;
  readonly tags: ReadonlyArray<string>;
  readonly isActive: boolean;
}

export interface KPIResult {
  readonly kpiKey: string;
  readonly label: string;
  readonly currentValue: number;
  readonly targetValue: number;
  readonly status: KPIStatus;
  readonly percentageOfTarget: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly trend: TrendDirection;
  readonly computedAt: string;
}

export interface BusinessTerm {
  readonly termId: string;
  readonly term: string;
  readonly abbreviation?: string;
  readonly domain: AnalyticsDomain;
  readonly definition: string;
  readonly example?: string;
  readonly relatedMetrics: ReadonlyArray<string>;
  readonly synonyms: ReadonlyArray<string>;
  readonly owner: string;
  readonly approvedAt: string;
}

// ---------------------------------------------------------------------------
// Aggregation & Query DTOs
// ---------------------------------------------------------------------------

export interface AggregationRequest {
  readonly requestId: string;
  readonly metricKey: string;
  readonly dimensions: ReadonlyArray<string>;
  readonly filters: ReadonlyArray<AnalyticsFilter>;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly granularity: GranularityLevel;
  readonly aggregation: MetricAggregation;
}

export interface AnalyticsFilter {
  readonly dimensionKey: string;
  readonly operator: "EQ" | "NEQ" | "IN" | "NOT_IN" | "GT" | "LT" | "GTE" | "LTE" | "BETWEEN";
  readonly value: string | number | ReadonlyArray<string | number>;
}

export interface AggregationResult {
  readonly requestId: string;
  readonly metricKey: string;
  readonly granularity: GranularityLevel;
  readonly dataPoints: ReadonlyArray<MetricDataPoint>;
  readonly summary: AggregationSummary;
  readonly computedAt: string;
  readonly durationMs: number;
}

export interface AggregationSummary {
  readonly total: number;
  readonly average: number;
  readonly min: number;
  readonly max: number;
  readonly count: number;
  readonly stdDev?: number;
}

// ---------------------------------------------------------------------------
// Trend & Forecast DTOs
// ---------------------------------------------------------------------------

export interface TrendAnalysis {
  readonly metricKey: string;
  readonly direction: TrendDirection;
  readonly changePercent: number;
  readonly changeAbsolute: number;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly comparisonPeriodStart: string;
  readonly comparisonPeriodEnd: string;
  readonly confidence: number; // 0.0–1.0
  readonly dataPoints: ReadonlyArray<MetricDataPoint>;
}

export interface ForecastRequest {
  readonly metricKey: string;
  readonly historicalDataPoints: ReadonlyArray<MetricDataPoint>;
  readonly forecastPeriods: number;
  readonly granularity: GranularityLevel;
  readonly method: ForecastMethod;
}

export interface ForecastResult {
  readonly metricKey: string;
  readonly method: ForecastMethod;
  readonly forecastDataPoints: ReadonlyArray<ForecastDataPoint>;
  readonly confidenceInterval: number; // e.g. 0.95
  readonly generatedAt: string;
}

export interface ForecastDataPoint {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly forecastedValue: number;
  readonly lowerBound: number;
  readonly upperBound: number;
}

// ---------------------------------------------------------------------------
// Benchmark DTOs
// ---------------------------------------------------------------------------

export interface BenchmarkDefinition {
  readonly benchmarkId: string;
  readonly benchmarkKey: string;
  readonly metricKey: string;
  readonly type: BenchmarkType;
  readonly targetValue: number;
  readonly unit: MetricUnit;
  readonly description: string;
  readonly source: string;
  readonly validFrom: string;
  readonly validUntil?: string;
}

export interface BenchmarkResult {
  readonly metricKey: string;
  readonly benchmarkKey: string;
  readonly actualValue: number;
  readonly benchmarkValue: number;
  readonly deviation: number;
  readonly deviationPercent: number;
  readonly status: "ABOVE" | "BELOW" | "MEETING";
  readonly benchmarkType: BenchmarkType;
  readonly evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Materialized View DTOs
// ---------------------------------------------------------------------------

export interface MaterializedViewDefinition {
  readonly viewId: string;
  readonly viewKey: string;
  readonly label: string;
  readonly domain: AnalyticsDomain;
  readonly metrics: ReadonlyArray<string>;
  readonly dimensions: ReadonlyArray<string>;
  readonly refreshIntervalMinutes: number;
  readonly lastRefreshedAt?: string;
  readonly isStale: boolean;
}

export interface MaterializedViewData {
  readonly viewKey: string;
  readonly rows: ReadonlyArray<Readonly<Record<string, string | number>>>;
  readonly lastRefreshedAt: string;
  readonly rowCount: number;
}

// ---------------------------------------------------------------------------
// Analytics Query DTOs
// ---------------------------------------------------------------------------

export interface AnalyticsQuery {
  readonly queryId: string;
  readonly domain?: AnalyticsDomain;
  readonly metrics: ReadonlyArray<string>;
  readonly dimensions: ReadonlyArray<string>;
  readonly filters: ReadonlyArray<AnalyticsFilter>;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly granularity: GranularityLevel;
  readonly orderBy?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface AnalyticsQueryResult {
  readonly queryId: string;
  readonly rows: ReadonlyArray<Readonly<Record<string, string | number | null>>>;
  readonly total: number;
  readonly granularity: GranularityLevel;
  readonly computedAt: string;
  readonly durationMs: number;
}

// ---------------------------------------------------------------------------
// Report DTOs
// ---------------------------------------------------------------------------

export interface AnalyticsReport {
  readonly reportId: string;
  readonly reportKey: string;
  readonly title: string;
  readonly domain: AnalyticsDomain;
  readonly generatedAt: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly kpiResults: ReadonlyArray<KPIResult>;
  readonly trends: ReadonlyArray<TrendAnalysis>;
  readonly benchmarks: ReadonlyArray<BenchmarkResult>;
  readonly summary: ReportSummary;
  readonly format: ReportFormat;
}

export interface ReportSummary {
  readonly totalKPIs: number;
  readonly onTrack: number;
  readonly atRisk: number;
  readonly critical: number;
  readonly exceeded: number;
  readonly overallScore: number; // 0–100
  readonly highlights: ReadonlyArray<string>;
  readonly alerts: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Validation DTOs
// ---------------------------------------------------------------------------

export interface AnalyticsValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}
