/**
 * =============================================================================
 * DWIP Enterprise Analytics — Analytics Validators
 * Module: platforms/analytics/analytics-validators.ts
 * =============================================================================
 */

import type {
  AggregationRequest,
  AnalyticsFilter,
  AnalyticsQuery,
  ForecastRequest,
  AnalyticsValidationResult,
  GranularityLevel,
} from "./types.ts";

export interface IAnalyticsValidator {
  validateAggregationRequest(req: AggregationRequest): AnalyticsValidationResult;
  validateAnalyticsQuery(query: AnalyticsQuery): AnalyticsValidationResult;
  validateForecastRequest(req: ForecastRequest): AnalyticsValidationResult;
  validateDateRange(start: string, end: string): AnalyticsValidationResult;
  validateFilter(filter: AnalyticsFilter): AnalyticsValidationResult;
}

const VALID_GRANULARITIES: GranularityLevel[] = [
  "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY",
];

export class AnalyticsValidator implements IAnalyticsValidator {

  public validateAggregationRequest(req: AggregationRequest): AnalyticsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!req.requestId) errors.push("requestId is required.");
    if (!req.metricKey || req.metricKey.trim().length === 0) errors.push("metricKey is required.");
    if (!req.periodStart) errors.push("periodStart is required.");
    if (!req.periodEnd) errors.push("periodEnd is required.");
    if (!VALID_GRANULARITIES.includes(req.granularity)) {
      errors.push(`granularity "${req.granularity}" is invalid.`);
    }

    const dateValidation = this.validateDateRange(req.periodStart, req.periodEnd);
    errors.push(...dateValidation.errors);
    warnings.push(...dateValidation.warnings);

    for (const filter of req.filters) {
      const fv = this.validateFilter(filter);
      errors.push(...fv.errors);
      warnings.push(...fv.warnings);
    }

    if (req.dimensions.length === 0) {
      warnings.push("No dimensions specified — result will be a scalar aggregate.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateAnalyticsQuery(query: AnalyticsQuery): AnalyticsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!query.queryId) errors.push("queryId is required.");
    if (!query.periodStart) errors.push("periodStart is required.");
    if (!query.periodEnd) errors.push("periodEnd is required.");
    if (query.metrics.length === 0) errors.push("At least one metric is required.");
    if (!VALID_GRANULARITIES.includes(query.granularity)) {
      errors.push(`granularity "${query.granularity}" is invalid.`);
    }
    if (query.limit !== undefined && query.limit <= 0) {
      errors.push("limit must be a positive integer.");
    }
    if (query.offset !== undefined && query.offset < 0) {
      errors.push("offset must be non-negative.");
    }

    const dateValidation = this.validateDateRange(query.periodStart, query.periodEnd);
    errors.push(...dateValidation.errors);
    warnings.push(...dateValidation.warnings);

    for (const filter of query.filters) {
      const fv = this.validateFilter(filter);
      errors.push(...fv.errors);
      warnings.push(...fv.warnings);
    }

    if (query.metrics.length > 20) {
      warnings.push("Querying more than 20 metrics may impact performance.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateForecastRequest(req: ForecastRequest): AnalyticsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!req.metricKey) errors.push("metricKey is required.");
    if (req.forecastPeriods < 1 || req.forecastPeriods > 52) {
      errors.push("forecastPeriods must be between 1 and 52.");
    }
    if (req.historicalDataPoints.length < 3) {
      errors.push("At least 3 historical data points are required for forecasting.");
    }
    if (req.historicalDataPoints.length < 10) {
      warnings.push("Fewer than 10 data points may reduce forecast accuracy.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateDateRange(start: string, end: string): AnalyticsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime())) errors.push(`periodStart "${start}" is not a valid ISO-8601 date.`);
    if (isNaN(endDate.getTime())) errors.push(`periodEnd "${end}" is not a valid ISO-8601 date.`);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      if (startDate >= endDate) errors.push("periodStart must be before periodEnd.");
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 3650) warnings.push("Date range spans more than 10 years — query may be slow.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateFilter(filter: AnalyticsFilter): AnalyticsValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!filter.dimensionKey) errors.push("Filter dimensionKey is required.");
    if (!filter.operator) errors.push("Filter operator is required.");
    if (filter.value === undefined || filter.value === null) {
      errors.push(`Filter value for "${filter.dimensionKey}" is required.`);
    }
    if (filter.operator === "BETWEEN" && !Array.isArray(filter.value)) {
      errors.push(`BETWEEN operator requires an array [min, max] for "${filter.dimensionKey}".`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
