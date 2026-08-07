/**
 * DWIP Enterprise Integration Gateway - GatewayException
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { VosDomainException } from '../../vos/exceptions';

export class GatewayException extends VosDomainException {
  constructor(
    message: string,
    code = 'INTEGRATION_GATEWAY_ERROR',
    public readonly statusCode = 500,
    context?: Record<string, any>
  ) {
    super(message, code, context);
  }
}
