/**
 * DWIP Enterprise Integration Gateway - IntegrationGatewayController
 * Controller Facade for Enterprise Integration Gateway
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { GatewayAuthenticationService } from '../services/GatewayAuthenticationService';
import { GatewayVehicleService } from '../services/GatewayVehicleService';
import { GatewayCRMService } from '../services/GatewayCRMService';
import { GatewayJobCardService } from '../services/GatewayJobCardService';
import { GatewayMediaService } from '../services/GatewayMediaService';
import { GatewayHealthService } from '../services/GatewayHealthService';
import { syncOrchestrator } from '../orchestrator/SyncOrchestrator';
import { apiMetricsCollector } from '../metrics/ApiMetricsCollector';
import { IntegrationAuthSession, DwipVehicle, DwipCustomer, DwipJobCard, DwipMedia, SystemHealthReport } from '../types';

export class IntegrationGatewayController {
  constructor(
    private authService = new GatewayAuthenticationService(),
    private vehicleService = new GatewayVehicleService(),
    private crmService = new GatewayCRMService(),
    private jobCardService = new GatewayJobCardService(),
    private mediaService = new GatewayMediaService(),
    private healthService = new GatewayHealthService()
  ) {}

  async authenticate(providerId: string): Promise<IntegrationAuthSession> {
    return this.authService.authenticate(providerId);
  }

  async getVehicle(providerId: string, vin: string): Promise<DwipVehicle | null> {
    return this.vehicleService.getVehicleByVin(providerId, vin);
  }

  async syncVehicle(providerId: string, vehicle: Partial<DwipVehicle>): Promise<DwipVehicle> {
    return this.vehicleService.syncVehicle(providerId, vehicle);
  }

  async getCustomer(providerId: string, customerId: string): Promise<DwipCustomer | null> {
    return this.crmService.getCustomerById(providerId, customerId);
  }

  async syncCustomer(providerId: string, customer: Partial<DwipCustomer>): Promise<DwipCustomer> {
    return this.crmService.syncCustomer(providerId, customer);
  }

  async getJobCard(providerId: string, jobCardId: string): Promise<DwipJobCard | null> {
    return this.jobCardService.getJobCardById(providerId, jobCardId);
  }

  async syncJobCard(providerId: string, jobCard: Partial<DwipJobCard>): Promise<DwipJobCard> {
    return this.jobCardService.syncJobCard(providerId, jobCard);
  }

  async uploadMedia(providerId: string, media: Partial<DwipMedia>, buffer: Uint8Array): Promise<DwipMedia> {
    return this.mediaService.uploadMedia(providerId, media, buffer);
  }

  async triggerSync(providerId: string, syncMode: 'FULL' | 'INCREMENTAL' | 'MANUAL' | 'BACKGROUND', entityType?: string) {
    return syncOrchestrator.startSync(providerId, syncMode, entityType);
  }

  async getHealth(providerId: string): Promise<SystemHealthReport> {
    return this.healthService.getHealthReport(providerId);
  }

  getMetrics(providerId: string) {
    return apiMetricsCollector.getSummary(providerId);
  }
}

export const integrationGatewayController = new IntegrationGatewayController();
