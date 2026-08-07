/**
 * DWIP Enterprise Integration Gateway - ApiMetricsCollector
 * Tracks Latency, P95/P99 Percentiles, Success Rate, Retry & Timeout Counts
 */

export interface ApiMetricsSummary {
  providerId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryCount: number;
  timeoutCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRatePercent: number;
}

export class ApiMetricsCollector {
  private latencies: Map<string, number[]> = new Map();
  private successCounts: Map<string, number> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private timeoutCounts: Map<string, number> = new Map();

  public recordRequest(providerId: string, durationMs: number, isSuccess: boolean, isTimeout = false): void {
    if (!this.latencies.has(providerId)) {
      this.latencies.set(providerId, []);
      this.successCounts.set(providerId, 0);
      this.failureCounts.set(providerId, 0);
      this.retryCounts.set(providerId, 0);
      this.timeoutCounts.set(providerId, 0);
    }

    const list = this.latencies.get(providerId)!;
    list.push(durationMs);
    if (list.length > 1000) {
      list.shift(); // Keep moving window of 1000 samples
    }

    if (isSuccess) {
      this.successCounts.set(providerId, (this.successCounts.get(providerId) || 0) + 1);
    } else {
      this.failureCounts.set(providerId, (this.failureCounts.get(providerId) || 0) + 1);
    }

    if (isTimeout) {
      this.timeoutCounts.set(providerId, (this.timeoutCounts.get(providerId) || 0) + 1);
    }
  }

  public recordRetry(providerId: string): void {
    this.retryCounts.set(providerId, (this.retryCounts.get(providerId) || 0) + 1);
  }

  public getSummary(providerId: string): ApiMetricsSummary {
    const list = [...(this.latencies.get(providerId) || [])].sort((a, b) => a - b);
    const succ = this.successCounts.get(providerId) || 0;
    const fail = this.failureCounts.get(providerId) || 0;
    const retries = this.retryCounts.get(providerId) || 0;
    const timeouts = this.timeoutCounts.get(providerId) || 0;
    const total = succ + fail;

    let avg = 0;
    let p95 = 0;
    let p99 = 0;

    if (list.length > 0) {
      avg = Math.round(list.reduce((sum, v) => sum + v, 0) / list.length);
      const p95Idx = Math.floor(list.length * 0.95);
      const p99Idx = Math.floor(list.length * 0.99);
      p95 = list[Math.min(p95Idx, list.length - 1)];
      p99 = list[Math.min(p99Idx, list.length - 1)];
    }

    const successRate = total > 0 ? Number(((succ / total) * 100).toFixed(2)) : 100;

    return {
      providerId,
      totalRequests: total,
      successfulRequests: succ,
      failedRequests: fail,
      retryCount: retries,
      timeoutCount: timeouts,
      averageLatencyMs: avg,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      successRatePercent: successRate
    };
  }

  public clear(): void {
    this.latencies.clear();
    this.successCounts.clear();
    this.failureCounts.clear();
    this.retryCounts.clear();
    this.timeoutCounts.clear();
  }
}

export const apiMetricsCollector = new ApiMetricsCollector();
