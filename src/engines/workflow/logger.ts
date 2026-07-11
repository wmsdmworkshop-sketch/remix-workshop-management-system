// =============================================================================
// WOS Structured Logging & Correlation Engine (Phase 4)
// Bounded Context: Auditing & Security
// =============================================================================

export interface LogPayload {
  correlationId: string;
  userId?: number;
  userRole?: string;
  jobId?: number;
  [key: string]: any;
}

export class WorkflowLogger {
  private static generateCorrelationId(): string {
    return `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  public static createSession(userId?: number, userRole?: string, jobId?: number): LogPayload {
    return {
      correlationId: this.generateCorrelationId(),
      userId,
      userRole,
      jobId,
    };
  }

  public static info(message: string, context: LogPayload) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message,
      ...context,
    }));
  }

  public static warn(message: string, context: LogPayload) {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "WARN",
      message,
      ...context,
    }));
  }

  public static error(message: string, error: any, context: LogPayload) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    }));
  }
}
