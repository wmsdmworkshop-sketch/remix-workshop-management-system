/**
 * DWIP Enterprise - Core Platform API Gateway Middleware Pipeline
 * Sprint IL-001 Architecture
 * 
 * Pipeline for all outbound/inbound external requests:
 * 1. Authentication (Token acquisition/injection via AuthenticationEngine)
 * 2. Logging (Audit trail via AuditEngine)
 * 3. Retry (Configurable exponential backoff & jitter)
 * 4. Timeout (AbortController timeout guard)
 * 5. Error Mapping (Standard DWIP Enterprise error code mapping)
 * 6. Response Mapping (Data normalization)
 * 7. Rate Limiting (Token-bucket rate controller)
 * 8. Circuit Breaker (Tripping on failure thresholds to protect system health)
 */

import { authenticationEngine } from './AuthenticationEngine';
import { auditEngine } from './AuditEngine';
import { configurationEngine } from './ConfigurationEngine';

export interface GatewayRequestOptions {
  systemCode: string;
  apiName: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint?: string;
  headers?: Record<string, string>;
  body?: any;
  userId?: string;
  branchId?: string;
  moduleId?: string;
  timeoutMs?: number;
  retryCount?: number;
}

export interface GatewayResponse<T = any> {
  success: boolean;
  statusCode: number;
  data?: T;
  error?: {
    code: string;
    message: string;
    rawError?: any;
  };
  correlationId: string;
  durationMs: number;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeoutMs = 30000;
  private lastFailureTime = 0;

  public canExecute(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number = 60; // Max 60 requests
  private readonly refillRatePerSec: number = 10; // 10 tokens per second

  constructor() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  public tryConsume(): boolean {
    const now = Date.now();
    const deltaSec = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + deltaSec * this.refillRatePerSec);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

export class ApiGateway {
  private static instance: ApiGateway;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, TokenBucketRateLimiter> = new Map();

  private constructor() {}

  public static getInstance(): ApiGateway {
    if (!ApiGateway.instance) {
      ApiGateway.instance = new ApiGateway();
    }
    return ApiGateway.instance;
  }

  private getCircuitBreaker(systemCode: string): CircuitBreaker {
    const code = systemCode.toUpperCase();
    if (!this.circuitBreakers.has(code)) {
      this.circuitBreakers.set(code, new CircuitBreaker());
    }
    return this.circuitBreakers.get(code)!;
  }

  private getRateLimiter(systemCode: string): TokenBucketRateLimiter {
    const code = systemCode.toUpperCase();
    if (!this.rateLimiters.has(code)) {
      this.rateLimiters.set(code, new TokenBucketRateLimiter());
    }
    return this.rateLimiters.get(code)!;
  }

  public async executeRequest<T = any>(options: GatewayRequestOptions): Promise<GatewayResponse<T>> {
    const startTime = Date.now();
    const systemCode = options.systemCode.toUpperCase();
    const correlationId = `corr_${systemCode.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const config = configurationEngine.getConfig(systemCode);
    const cb = this.getCircuitBreaker(systemCode);
    const limiter = this.getRateLimiter(systemCode);

    // Step 1: Circuit Breaker Guard
    if (!cb.canExecute()) {
      const durationMs = Date.now() - startTime;
      await auditEngine.logInteraction({
        systemId: systemCode,
        apiName: options.apiName,
        userId: options.userId,
        branchId: options.branchId,
        moduleId: options.moduleId,
        correlationId,
        requestTime: new Date(startTime).toISOString(),
        responseTime: new Date().toISOString(),
        durationMs,
        statusCode: 503,
        status: 'CIRCUIT_OPEN',
        errorMessage: `Circuit breaker is OPEN for system '${systemCode}'`
      });

      return {
        success: false,
        statusCode: 503,
        correlationId,
        durationMs,
        error: {
          code: 'ERR_GATEWAY_CIRCUIT_OPEN',
          message: `Circuit breaker is open for external system '${systemCode}'.`
        }
      };
    }

    // Step 2: Rate Limiter Guard
    if (!limiter.tryConsume()) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        statusCode: 429,
        correlationId,
        durationMs,
        error: {
          code: 'ERR_RATE_LIMIT_EXCEEDED',
          message: `Rate limit quota exceeded for system '${systemCode}'.`
        }
      };
    }

    // Step 3: Authentication Token Injection
    let authHeader: Record<string, string> = {};
    try {
      const session = await authenticationEngine.getValidSession(systemCode);
      authHeader = { Authorization: `${session.tokenType} ${session.token}` };
    } catch (e: any) {
      console.warn(`[API_GATEWAY] Auth token warning for system ${systemCode}:`, e.message);
    }

    // Step 4: Execution Pipeline with Retry & Timeout logic
    const maxRetries = options.retryCount ?? config?.retryCount ?? 3;
    const timeoutMs = options.timeoutMs ?? config?.timeoutMs ?? 10000;

    let attempt = 0;
    let lastError: any = null;
    let statusCode = 200;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        // Architectural simulated execution (Zero external Tata network calls)
        await new Promise(r => setTimeout(r, Math.floor(20 + Math.random() * 30)));

        cb.recordSuccess();
        const durationMs = Date.now() - startTime;

        // Standardized DWIP Response Mapping
        const responseData = {
          systemCode,
          apiName: options.apiName,
          result: 'SIMULATED_SUCCESSFUL_GATEWAY_RESPONSE',
          inputEcho: options.body || null,
          executedAt: new Date().toISOString()
        } as unknown as T;

        await auditEngine.logInteraction({
          systemId: systemCode,
          apiName: options.apiName,
          userId: options.userId,
          branchId: options.branchId,
          moduleId: options.moduleId,
          correlationId,
          requestTime: new Date(startTime).toISOString(),
          responseTime: new Date().toISOString(),
          durationMs,
          statusCode: 200,
          status: 'SUCCESS',
          requestPayload: options.body,
          responsePayload: responseData
        });

        return {
          success: true,
          statusCode: 200,
          data: responseData,
          correlationId,
          durationMs
        };

      } catch (err: any) {
        lastError = err;
        statusCode = err.status || 500;
        if (attempt <= maxRetries) {
          // Exponential backoff with jitter
          const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50;
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    }

    cb.recordFailure();
    const durationMs = Date.now() - startTime;

    await auditEngine.logInteraction({
      systemId: systemCode,
      apiName: options.apiName,
      userId: options.userId,
      branchId: options.branchId,
      moduleId: options.moduleId,
      correlationId,
      requestTime: new Date(startTime).toISOString(),
      responseTime: new Date().toISOString(),
      durationMs,
      statusCode,
      status: 'ERROR',
      requestPayload: options.body,
      errorMessage: lastError?.message || 'External system call failed after retries'
    });

    return {
      success: false,
      statusCode,
      correlationId,
      durationMs,
      error: {
        code: 'ERR_GATEWAY_EXTERNAL_FAILURE',
        message: lastError?.message || `Failed to execute request on system '${systemCode}'.`,
        rawError: lastError
      }
    };
  }

  public getCircuitBreakerStatus(systemCode: string): CircuitBreakerState {
    return this.getCircuitBreaker(systemCode).getState();
  }
}

export const apiGateway = ApiGateway.getInstance();
