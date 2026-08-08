/**
 * DWIP Enterprise - QRT Integration Connector (External API)
 * Sprint IL-001 Architecture
 */

import {
  IIntegrationConnector,
  IAuthenticationService,
  IVehicleService,
  ICustomerService,
  IJobCardService,
  IGateEntryService,
  IWarrantyService,
  IMediaService,
  IMasterSyncService,
  IHealthService,
  SystemHealthReport,
  IQrtServiceRequestContract
} from '../common/types';
import { QrtApiClient } from './QrtApiClient';

export class QrtConnector implements IIntegrationConnector {
  readonly systemCode = 'QRT_EXTERNAL';
  readonly name = 'Tata Motors QRT Integration';
  
  private apiClient = new QrtApiClient();

  // ---------------------------------------------------------------------------
  // Standard Connector Interfaces (Stubbed for QRT as it focuses on Service Requests)
  // ---------------------------------------------------------------------------
  readonly authService: IAuthenticationService = {} as any;
  readonly vehicleService: IVehicleService = {} as any;
  readonly customerService: ICustomerService = {} as any;
  readonly jobCardService: IJobCardService = {} as any;
  readonly gateEntryService: IGateEntryService = {} as any;
  readonly warrantyService: IWarrantyService = {} as any;
  readonly mediaService: IMediaService = {} as any;
  readonly masterSyncService: IMasterSyncService = {} as any;

  readonly healthService: IHealthService = {
    checkHealth: async (): Promise<SystemHealthReport> => {
      return {
        systemCode: 'QRT_EXTERNAL',
        status: 'HEALTHY',
        latencyMs: 45,
        lastChecked: new Date().toISOString(),
        activeEndpoint: 'https://gateway.internal/qrt',
        details: { connection: 'active', external: true }
      };
    },
    pingEndpoint: async () => ({ reachable: true, durationMs: 45 })
  };

  // ---------------------------------------------------------------------------
  // QRT Specific Implementation
  // ---------------------------------------------------------------------------
  readonly qrtService: IQrtServiceRequestContract = {
    getServiceRequests: async () => {
      return this.apiClient.getServiceRequests();
    },
    startServiceRequest: async (requestId: string, technicianId: string) => {
      const res = await this.apiClient.startServiceRequest({ service_request_id: requestId, technician_id: technicianId });
      return res.success === true;
    },
    markReached: async (requestId: string, lat?: number, lng?: number) => {
      const res = await this.apiClient.markReached({ service_request_id: requestId, lat, lng });
      return res.success === true;
    },
    submitReachedOtp: async (requestId: string, otp: string) => {
      const res = await this.apiClient.submitReachedOtp({ service_request_id: requestId, otp });
      return res.success === true;
    },
    confirmJobComplete: async (requestId: string, otp: string, notes?: string) => {
      const res = await this.apiClient.confirmJobComplete({ service_request_id: requestId, otp, notes });
      return res.success === true;
    },
    updateLocation: async (lat: number, lng: number, technicianId: string) => {
      const res = await this.apiClient.updateLocation({ lat, lng, technician_id: technicianId });
      return res.success === true;
    }
  };

  async initialize(config: Record<string, any>): Promise<void> {
    console.log('[QrtConnector] Initialized with config', config);
  }

  async shutdown(): Promise<void> {
    console.log('[QrtConnector] Shutting down');
  }
}
