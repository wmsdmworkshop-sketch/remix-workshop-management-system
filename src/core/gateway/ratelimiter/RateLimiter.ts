/**
 * DWIP Enterprise Integration Gateway - RateLimiter
 * Request Rate, Burst Limit & Concurrency Control
 */

import { GatewayException } from '../error/GatewayException';

export class RateLimiter {
  private activeConcurrency = 0;
  private requestTimestamps: number[] = [];

  constructor(
    private maxRequestsPerSec = 50,
    private burstLimit = 100,
    private maxConcurrency = 20
  ) {}

  public acquireToken(): void {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 1000);

    if (this.activeConcurrency >= this.maxConcurrency) {
      throw new GatewayException('Max concurrency limit exceeded.', 'CONCURRENCY_LIMIT_EXCEEDED', 429);
    }

    if (this.requestTimestamps.length >= this.burstLimit) {
      throw new GatewayException('Rate limit burst threshold exceeded.', 'RATE_LIMIT_BURST_EXCEEDED', 429);
    }

    this.activeConcurrency++;
    this.requestTimestamps.push(now);
  }

  public releaseToken(): void {
    if (this.activeConcurrency > 0) {
      this.activeConcurrency--;
    }
  }

  public getActiveConcurrency(): number {
    return this.activeConcurrency;
  }
}
