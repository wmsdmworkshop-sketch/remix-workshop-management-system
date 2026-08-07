export class Logger {
  public static info(message: string, context?: any) {
    this.log("INFO", message, context);
  }

  public static warn(message: string, context?: any) {
    this.log("WARN", message, context);
  }

  public static error(message: string, context?: any) {
    this.log("ERROR", message, context);
  }

  private static log(level: string, message: string, context: any = {}) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...context
    };
    console.log(JSON.stringify(payload));
  }
}
