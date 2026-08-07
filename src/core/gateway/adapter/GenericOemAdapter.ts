/**
 * DWIP Enterprise Integration Gateway - GenericOemAdapter (Concrete Provider Adapter)
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { BaseOemAdapter } from './BaseOemAdapter';

export class GenericOemAdapter extends BaseOemAdapter {
  constructor(providerId = 'GENERIC_OEM', baseUrl = 'https://gateway.internal/generic') {
    super(
      providerId,
      {
        providerId,
        baseUrl,
        authType: 'OAuth2',
        timeoutMs: 10000,
        retryCount: 3,
        certificatePolicy: 'SYSTEM_TLS',
        apiVersion: 'v1',
        enabledModules: ['masterData', 'vehicle', 'jobCard', 'customer', 'media', 'kyc'],
        capabilities: {
          authentication: true,
          masterData: true,
          vehicle: true,
          serviceRequest: true,
          jobCard: true,
          crm: true,
          mediaUpload: true,
          kyc: true,
          trailerAxle: true,
          genset: true,
          inventory: true
        }
      },
      {
        authentication: true,
        masterData: true,
        vehicle: true,
        serviceRequest: true,
        jobCard: true,
        crm: true,
        mediaUpload: true,
        kyc: true,
        trailerAxle: true,
        genset: true,
        inventory: true
      }
    );
  }
}
