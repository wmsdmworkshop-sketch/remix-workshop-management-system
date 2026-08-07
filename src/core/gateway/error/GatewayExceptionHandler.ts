/**
 * DWIP Enterprise Integration Gateway - GatewayExceptionHandler
 * Centralized Exception Handling & Status Code Mapping
 */

import { GatewayException } from './GatewayException';
import { StructuredLogger } from '../../vos/utils/StructuredLogger';

export class GatewayExceptionHandler {
  public static handle(error: any, correlationId?: string): GatewayException {
    if (error instanceof GatewayException) {
      StructuredLogger.error(
        `GatewayException: ${error.message}`,
        {
          component: 'GatewayExceptionHandler',
          operation: 'handle',
          result: 'FAILURE',
          correlationId,
          code: error.code,
          statusCode: error.statusCode
        },
        error
      );
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const wrapped = new GatewayException(
      `Unhandled Integration Gateway Error: ${message}`,
      'GATEWAY_UNHANDLED_ERROR',
      500,
      { originalError: message }
    );

    StructuredLogger.error(
      `Unhandled Gateway Error: ${message}`,
      {
        component: 'GatewayExceptionHandler',
        operation: 'handle',
        result: 'FAILURE',
        correlationId
      },
      error
    );

    return wrapped;
  }
}
