# DWIP Analytics and AI Guide
**Document ID**: DWIP-M-12 | **Version**: 1.0.0-GA | **Author**: Lead Data Scientist

## Table of Contents
1. [Analytics & Aggregation Engine](#1-analytics--aggregation-engine)
2. [Metric Registry & Dimension Filters](#2-metric-registry--dimension-filters)
3. [AI Predictions & Forecast Models](#3-ai-predictions--forecast-models)
4. [Explainability Framework](#4-explainability-framework)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/06_API_REFERENCE.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/06_API_REFERENCE.md)

---

## 1. Analytics & Aggregation Engine
The `AnalyticsEngine` computes historical metrics by aggregating factual tables records. Computations support SUM, AVG, and COUNT granular aggregation requests.

## 2. Metric Registry & Dimension Filters
DWIP pre-configures 20+ KPIs, including:
* **avg_turnaround_time** (SLA target under 180 mins)
* **first_time_fix_rate** (Quality target above 90%)
* **parts_revenue** (SUM financial measure)
* Dimensions allow slicing by `workshop_id`, `technician_id`, `period_date`, and `service_type`.

## 3. AI Predictions & Forecast Models
The `EnterpriseAIEngine` generates decision-support outputs using model versions registered in the Model Registry:
* **dwip-rev-forecast-v1**: Linear regression forecast of future billing totals.
* **dwip-delay-clf-v2**: Classification of job cards delay risk (Low, Medium, High).

## 4. Explainability Framework
Every prediction returns an `AIExplainability` DTO containing primary KPI influences, historical comparisons, and alternative outcome probabilities.
