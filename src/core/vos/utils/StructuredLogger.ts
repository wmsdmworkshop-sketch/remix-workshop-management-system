/**
 * DWIP Enterprise WOS - StructuredLogger
 * Task 1.2 JSON Structured Logging Utility
 */

export interface LogContext {
  correlationId?: string;
  vosId?: string;
  publicId?: string;
  companyId?: string;
  dealerId?: string;
  branchId?: string;
  userId?: string;
  component: string;
  operation: string;
  durationMs?: number;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  [key: string]: any;
}

export class StructuredLogger {
  private static logs: LogContext[] = [];

  public static info(message: string, context: LogContext): void {
    const entry = {
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
    StructuredLogger.logs.push(entry);
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  public static warn(message: string, context: LogContext): void {
    const entry = {
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...context
    };
    StructuredLogger.logs.push(entry);
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  public static error(message: string, context: LogContext, error?: any): void {
    const entry = {
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      errorMessage: error?.message || String(error),
      stack: error?.stack,
      ...context
    };
    StructuredLogger.logs.push(entry);
    process.stderr.write(JSON.stringify(entry) + '\n');
  }

  public static getLogs(): LogContext[] {
    return [...StructuredLogger.logs];
  }

  public static clearLogsForTest(): void {
    StructuredLogger.logs = [];
  }
}
