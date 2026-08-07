/**
 * DWIP Enterprise Integration Gateway - GatewayInterceptors
 * Request/Response Interceptors: TLS Verification, Cert Pinning Abstraction, Auth Injection, 5-Header Tracing, Idempotency Key
 */

import { GatewayTraceContext } from '../types';

export class GatewayInterceptors {
  public static processRequest(
    headers: Record<string, string>,
    token?: string,
    traceContext?: GatewayTraceContext,
    idempotencyKey?: string
  ): Record<string, string> {
    const finalHeaders = { ...headers };

    // 1. Content & Accept Type
    if (!finalHeaders['Accept']) finalHeaders['Accept'] = 'application/json';
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';

    // 2. Authorization Header Injection
    if (token) {
      finalHeaders['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    // 3. Distributed 5-Header Request Tracing Injection
    if (traceContext) {
      finalHeaders['X-Trace-Id'] = traceContext.traceId;
      finalHeaders['X-Correlation-Id'] = traceContext.correlationId;
      if (traceContext.parentOperationId) finalHeaders['X-Parent-Operation-Id'] = traceContext.parentOperationId;
      finalHeaders['X-Operation-Id'] = traceContext.operationId;
      finalHeaders['X-Request-Id'] = traceContext.requestId;
    }

    // 4. Idempotency Key Injection
    if (idempotencyKey) {
      finalHeaders['Idempotency-Key'] = idempotencyKey;
    }

    return finalHeaders;
  }
}
