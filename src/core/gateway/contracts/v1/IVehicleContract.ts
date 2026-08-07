/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IVehicleContract: Vehicle Master API Contract Interface v1
 */

import { DwipVehicle } from '../../types';

export interface IVehicleContractV1 {
  readonly contractVersion: 'v1';

  getVehicleByVin(vin: string): Promise<DwipVehicle | null>;
  getVehicleByRegistration(registrationNumber: string): Promise<DwipVehicle | null>;
  syncVehicle(vehicle: Partial<DwipVehicle>): Promise<DwipVehicle>;
}
