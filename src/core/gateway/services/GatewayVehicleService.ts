/**
 * DWIP Enterprise Integration Gateway - GatewayVehicleService
 */

import { DwipVehicle } from '../types';
import { OemProviderRegistry } from '../adapter/OemProviderRegistry';

export class GatewayVehicleService {
  async getVehicleByVin(providerId: string, vin: string): Promise<DwipVehicle | null> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.getVehicleByVin(vin);
  }

  async syncVehicle(providerId: string, vehicle: Partial<DwipVehicle>): Promise<DwipVehicle> {
    const adapter = OemProviderRegistry.getProvider(providerId);
    return adapter.syncVehicle(vehicle);
  }
}
