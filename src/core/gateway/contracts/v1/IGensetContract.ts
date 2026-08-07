/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IGensetContract: Genset Engine Telematics API Contract Interface v1
 */

export interface DwipGensetDataV1 {
  gensetId: string;
  serialNumber: string;
  engineHours: number;
  fuelLevelPercent: number;
  coolantTempC: number;
  oilPressureKpa: number;
  batteryVoltageV: number;
  lastTelemetryTimestamp: string;
}

export interface IGensetContractV1 {
  readonly contractVersion: 'v1';

  getGensetTelemetry(gensetId: string): Promise<DwipGensetDataV1 | null>;
  syncGensetData(data: Partial<DwipGensetDataV1>): Promise<DwipGensetDataV1>;
}
