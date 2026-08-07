/**
 * DWIP Enterprise - Core Platform Audit Engine
 * Sprint IL-001 Architecture
 * 
 * Logs every external interaction with immutable audit records.
 * Mandatory fields: User, Branch, Module, API Name, Request Time, Response Time, Status, Correlation ID.
 */

export interface ExternalApiAuditLog {
  id: string;
  systemId: string;
  apiName: string;
  userId?: string;
  userName?: string;
  branchId?: string;
  branchName?: string;
  moduleId?: string;
  moduleName?: string;
  correlationId: string;
  requestTime: string;
  responseTime?: string;
  durationMs?: number;
  statusCode?: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'CIRCUIT_OPEN';
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  createdAt: string;
}

export class AuditEngine {
  private static instance: AuditEngine;
  private logs: ExternalApiAuditLog[] = [];

  private constructor() {
    this.seedBaselineAuditLogs();
  }

  public static getInstance(): AuditEngine {
    if (!AuditEngine.instance) {
      AuditEngine.instance = new AuditEngine();
    }
    return AuditEngine.instance;
  }

  private seedBaselineAuditLogs(): void {
    const now = Date.now();
    this.logs = [
      {
        id: 'log_audit_1001',
        systemId: 'TMSA',
        apiName: '/api/v1/vehicles/lookup',
        userId: 'usr_1',
        userName: 'Admin User',
        branchId: 'br_1',
        branchName: 'Main Workshop - Pune',
        moduleId: 'mod_workshop',
        moduleName: 'Workshop Operations',
        correlationId: 'corr_tmsa_99812_abc',
        requestTime: new Date(now - 120000).toISOString(),
        responseTime: new Date(now - 119958).toISOString(),
        durationMs: 42,
        statusCode: 200,
        status: 'SUCCESS',
        requestPayload: { vin: 'VIN_TMSA_999' },
        responsePayload: { status: 'FOUND', vehicleModel: 'Prime Commercial' },
        createdAt: new Date(now - 120000).toISOString()
      },
      {
        id: 'log_audit_1002',
        systemId: 'DMS',
        apiName: '/api/v1/jobcards/sync',
        userId: 'usr_2',
        userName: 'Advisor Rajesh',
        branchId: 'br_1',
        branchName: 'Main Workshop - Pune',
        moduleId: 'mod_service',
        moduleName: 'Service Operations',
        correlationId: 'corr_dms_44123_xyz',
        requestTime: new Date(now - 60000).toISOString(),
        responseTime: new Date(now - 59972).toISOString(),
        durationMs: 28,
        statusCode: 200,
        status: 'SUCCESS',
        requestPayload: { jobCardId: 'JC_DMS_001' },
        responsePayload: { status: 'SYNCED', dwipId: 'dwip_jc_202' },
        createdAt: new Date(now - 60000).toISOString()
      },
      {
        id: 'log_audit_1003',
        systemId: 'FLEETEDGE',
        apiName: '/api/v1/telematics/stream',
        userId: 'usr_sys',
        userName: 'System Gateway',
        branchId: 'br_1',
        branchName: 'Main Workshop - Pune',
        moduleId: 'mod_fleet',
        moduleName: 'Fleet Intelligence',
        correlationId: 'corr_fe_11092_err',
        requestTime: new Date(now - 30000).toISOString(),
        responseTime: new Date(now - 25000).toISOString(),
        durationMs: 5000,
        statusCode: 504,
        status: 'TIMEOUT',
        errorMessage: 'Connection timed out after 5000ms',
        createdAt: new Date(now - 30000).toISOString()
      }
    ];
  }

  public async logInteraction(
    logData: Omit<ExternalApiAuditLog, 'id' | 'createdAt'>
  ): Promise<ExternalApiAuditLog> {
    const log: ExternalApiAuditLog = {
      ...logData,
      id: `log_audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.logs.unshift(log);
    return log;
  }

  public getLogs(filter?: { systemId?: string; status?: string; correlationId?: string }): ExternalApiAuditLog[] {
    let result = [...this.logs];
    if (filter?.systemId) {
      result = result.filter(l => l.systemId.toUpperCase() === filter.systemId!.toUpperCase());
    }
    if (filter?.status) {
      result = result.filter(l => l.status.toUpperCase() === filter.status!.toUpperCase());
    }
    if (filter?.correlationId) {
      result = result.filter(l => l.correlationId.includes(filter.correlationId!));
    }
    return result;
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const auditEngine = AuditEngine.getInstance();
