/**
 * DWIP Enterprise Integration Gateway - ApiAuditLogger
 * 5-Header Request Tracing & API Trace Logger
 */

import { ApiAuditLogItem, GatewayTraceContext } from '../types';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class ApiAuditLogger {
  private logs: ApiAuditLogItem[] = [];

  public generateTraceContext(correlationId?: string, operationId?: string): GatewayTraceContext {
    const timestamp = Date.now();
    return {
      traceId: `trc_${timestamp}_${Math.floor(Math.random() * 10000)}`,
      correlationId: correlationId || `corr_${timestamp}_${Math.floor(Math.random() * 10000)}`,
      parentOperationId: `parent_${timestamp}`,
      operationId: operationId || `op_${timestamp}`,
      requestId: `req_${timestamp}_${Math.floor(Math.random() * 1000)}`
    };
  }

  public logApiCall(item: Omit<ApiAuditLogItem, 'id' | 'timestamp'>): ApiAuditLogItem {
    const record: ApiAuditLogItem = {
      ...item,
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(record); // Keep newest first
    if (this.logs.length > 2000) {
      this.logs.pop();
    }

    StructuredLogger.info(`API Log: ${item.httpMethod} ${item.endpoint} (${item.responseStatusCode})`, {
      component: 'ApiAuditLogger',
      operation: 'logApiCall',
      result: item.responseStatusCode < 400 ? 'SUCCESS' : 'FAILURE',
      traceId: item.traceId,
      correlationId: item.correlationId,
      providerId: item.providerId,
      durationMs: item.durationMs
    });

    return record;
  }

  public getLogs(limit = 100): ApiAuditLogItem[] {
    return this.logs.slice(0, limit);
  }

  public clear(): void {
    this.logs = [];
  }
}

export const apiAuditLogger = new ApiAuditLogger();
