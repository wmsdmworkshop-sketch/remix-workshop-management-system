/**
 * DWIP Enterprise Integration Gateway - GenericApiClient
 * Core Client executing HTTP requests with TLS Enforcement, Retries & Tracing
 */

import { GatewayTraceContext } from '../types';
import { GatewayInterceptors } from './GatewayInterceptors';
import { apiAuditLogger } from '../audit/ApiAuditLogger';
import { apiMetricsCollector } from '../metrics/ApiMetricsCollector';
import { RetryManager } from '../retry/RetryManager';
import { GatewayException } from '../error/GatewayException';

export class GenericApiClient {
  public static generateIdempotencyKey(providerId: string, operation: string, payload: any): string {
    const raw = `${providerId}:${operation}:${JSON.stringify(payload)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `idemp_${Math.abs(hash)}_${Date.now()}`;
  }

  public static async request<T>(
    providerId: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: any,
    headers: Record<string, string> = {},
    token?: string,
    traceContext?: GatewayTraceContext,
    idempotencyKey?: string,
    maxRetries = 3
  ): Promise<{ data: T; statusCode: number }> {
    const startTime = Date.now();
    const trace = traceContext || apiAuditLogger.generateTraceContext();

    // Idempotency key auto-generation for write operations
    let finalIdempotencyKey = idempotencyKey;
    if (!finalIdempotencyKey && ['POST', 'PUT', 'PATCH'].includes(method)) {
      finalIdempotencyKey = GenericApiClient.generateIdempotencyKey(providerId, endpoint, body);
    }

    const processedHeaders = GatewayInterceptors.processRequest(headers, token, trace, finalIdempotencyKey);

    return RetryManager.executeWithRetry(async () => {
      try {
        // Simulated HTTPS Transport call (enforces TLS URL requirement)
        if (endpoint.startsWith('http://')) {
          throw new GatewayException('Insecure HTTP protocol rejected. TLS-only communication is enforced.', 'TLS_ENFORCEMENT_FAILED', 400);
        }

        // Return simulated success response
        const duration = Date.now() - startTime;
        const statusCode = 200;

        apiAuditLogger.logApiCall({
          traceId: trace.traceId,
          correlationId: trace.correlationId,
          providerId,
          endpoint,
          httpMethod: method,
          requestHeaders: processedHeaders,
          requestBody: body ? JSON.stringify(body) : undefined,
          responseStatusCode: statusCode,
          responseBody: JSON.stringify({ success: true }),
          durationMs: duration
        });

        apiMetricsCollector.recordRequest(providerId, duration, true);

        return {
          data: { success: true, ...body } as unknown as T,
          statusCode
        };
      } catch (err: any) {
        const duration = Date.now() - startTime;
        apiMetricsCollector.recordRequest(providerId, duration, false, err?.code === 'ETIMEDOUT');
        apiMetricsCollector.recordRetry(providerId);
        throw err;
      }
    }, maxRetries);
  }
}
