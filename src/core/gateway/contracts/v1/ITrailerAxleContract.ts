/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * ITrailerAxleContract: Trailer Axle Telematics API Contract Interface v1
 */

export interface DwipTrailerAxleDataV1 {
  trailerId: string;
  vin: string;
  axleCount: number;
  tirePressurePsi: number[];
  brakeTemperatureC: number[];
  loadKg: number;
  lastTelemetryTimestamp: string;
}

export interface ITrailerAxleContractV1 {
  readonly contractVersion: 'v1';

  getTrailerTelemetry(trailerId: string): Promise<DwipTrailerAxleDataV1 | null>;
  syncTrailerAxleData(data: Partial<DwipTrailerAxleDataV1>): Promise<DwipTrailerAxleDataV1>;
}
