/**
 * DWIP Enterprise WOS - VosNotFoundException
 */

import { VosDomainException } from './VosDomainException';

export class VosNotFoundException extends VosDomainException {
  constructor(identifier: string, context?: Record<string, any>) {
    super(
      `VOS record not found for identifier: ${identifier}`,
      'VOS_NOT_FOUND',
      { identifier, ...context }
    );
  }
}
