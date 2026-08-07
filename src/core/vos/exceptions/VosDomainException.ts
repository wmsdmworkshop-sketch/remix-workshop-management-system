/**
 * DWIP Enterprise WOS - Base Domain Exception
 * Task 1.2 VOS Service Layer
 */

export class VosDomainException extends Error {
  public readonly code: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;

  constructor(message: string, code = 'VOS_DOMAIN_ERROR', context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
