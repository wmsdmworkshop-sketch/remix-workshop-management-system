/**
 * DWIP Enterprise Platform - QRT Module Types
 * Sprint: DWIP-S2-001 Revision-9
 */

import { GpsLocation } from '../breakdown/types';

export type QrtRole = 'TEAM_LEADER' | 'TECHNICIAN' | 'ELECTRICIAN' | 'DRIVER';

export interface QrtTeamMember {
  memberId: string;
  name: string;
  role: QrtRole;
  phone: string;
}

export interface QrtVehicle {
  vehicleId: string;
  registrationNumber: string;
  vanModel: string;
  equipmentKitId: string;
}

export interface EquipmentKit {
  kitId: string;
  diagnosticsScanner: boolean;
  batteryJumper: boolean;
  airCompressor: boolean;
  toolSet: boolean;
  sparePartsInventory: string[];
}

export type QrtStatus = 'IDLE' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'REPAIRING' | 'RESOLVED' | 'RETURNED';

export interface QrtDispatchRecord {
  dispatchId: string;
  breakdownId: string;
  vosId: string;
  vehicle: QrtVehicle;
  teamMembers: QrtTeamMember[];
  equipmentKit: EquipmentKit;
  status: QrtStatus;
  currentGps?: GpsLocation;
  dispatchedAt: string;
  arrivedAt?: string;
  completedAt?: string;
}
