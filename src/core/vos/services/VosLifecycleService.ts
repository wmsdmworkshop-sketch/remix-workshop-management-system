/**
 * DWIP Enterprise WOS - VosLifecycleService
 * Task 1.2 VOS Lifecycle Service (Session Creation & Closure)
 */

import { IVosRepository } from '../../../domain/vos/repositories';
import { IVos, VisitType, CommercialType, EntrySource, VosPriority, VosRiskLevel, DataClassification } from '../../../domain/vos/types';
import { VosValidationService } from './VosValidationService';
import { VosNumberGenerator } from '../utils/VosNumberGenerator';
import { StructuredLogger } from '../utils/StructuredLogger';
import { VOS_CONSTANTS } from '../utils/VosConstants';

export interface CreateVosRequest {
  companyId: string;
  dealerId: string;
  branchId: string;
  vehicleId: string;
  vehicleExternalId?: string;
  customerId: string;
  customerExternalId?: string;
  registrationNumber: string;
  chassisNumber: string;
  engineNumber?: string;
  vehicleModel?: string;
  vehicleVariant?: string;
  fuelType?: string;
  emissionNorm?: string;
  manufacturingYear?: number;
  odometerAtGateIn?: number;
  warrantyStatusAtGateIn?: string;
  oemServicePlan?: string;
  driverName?: string;
  driverMobile?: string;
  driverLicenseNumber?: string;
  driverType?: string;
  customerName?: string;
  fleetName?: string;
  contactPerson?: string;
  gstNumber?: string;
  customerType?: string;
  fleetSize?: number;
  visitType?: VisitType;
  commercialType?: CommercialType;
  entrySource?: EntrySource;
  isBreakdown?: boolean;
  gateInLatitude?: number;
  gateInLongitude?: number;
  locationAccuracy?: number;
  priority?: VosPriority;
  riskLevel?: VosRiskLevel;
  riskScore?: number;
  riskReason?: string;
  createdBy: string;
  currentOwner: string;
  financialYear?: string;
}

export interface CloseVosRequest {
  vosId: string;
  expectedVersion: number;
  closedBy: string;
  reason?: string;
}

export class VosLifecycleService {
  constructor(
    private vosRepository: IVosRepository,
    private validationService: VosValidationService
  ) {}

  public async createVos(request: CreateVosRequest, correlationId?: string): Promise<IVos> {
    const startTime = Date.now();

    // 1. Business Validation: Prevent duplicate active VOS for vehicle
    await this.validationService.validateDuplicateActiveVos(request.vehicleId, this.vosRepository);

    // 2. Structural Validation
    this.validationService.validateStructural({
      visitType: request.visitType,
      commercialType: request.commercialType,
      entrySource: request.entrySource,
      priority: request.priority,
      riskLevel: request.riskLevel,
      riskScore: request.riskScore
    });

    // 3. Generate VOS Number using formula {DealerCode}-{BranchCode}-{FinancialYear}-{RunningNumber}
    const vosNumber = VosNumberGenerator.generate(
      request.dealerId,
      request.branchId,
      request.financialYear
    );

    const now = new Date().toISOString();

    const vosData: Omit<IVos, 'id' | 'publicId' | 'createdAt' | 'updatedAt' | 'version'> = {
      companyId: request.companyId,
      dealerId: request.dealerId,
      branchId: request.branchId,
      vosNumber,
      vehicleId: request.vehicleId,
      vehicleExternalId: request.vehicleExternalId,
      customerId: request.customerId,
      customerExternalId: request.customerExternalId,
      registrationNumber: request.registrationNumber,
      chassisNumber: request.chassisNumber,
      engineNumber: request.engineNumber,
      vehicleModel: request.vehicleModel,
      vehicleVariant: request.vehicleVariant,
      fuelType: request.fuelType,
      emissionNorm: request.emissionNorm,
      manufacturingYear: request.manufacturingYear,
      odometerAtGateIn: request.odometerAtGateIn,
      warrantyStatusAtGateIn: request.warrantyStatusAtGateIn,
      oemServicePlan: request.oemServicePlan,
      driverName: request.driverName,
      driverMobile: request.driverMobile,
      driverLicenseNumber: request.driverLicenseNumber,
      driverType: request.driverType,
      customerName: request.customerName,
      fleetName: request.fleetName,
      contactPerson: request.contactPerson,
      gstNumber: request.gstNumber,
      customerType: request.customerType,
      fleetSize: request.fleetSize || 1,
      visitType: request.visitType || VisitType.NORMAL_SERVICE,
      commercialType: request.commercialType || CommercialType.CUSTOMER_PAY,
      entrySource: request.entrySource || EntrySource.MANUAL,
      isBreakdown: Boolean(request.isBreakdown),
      gateInLatitude: request.gateInLatitude,
      gateInLongitude: request.gateInLongitude,
      locationAccuracy: request.locationAccuracy,
      currentState: VOS_CONSTANTS.DEFAULT_CURRENT_STATE,
      currentStateCode: VOS_CONSTANTS.DEFAULT_STATE_CODE,
      currentStateVersion: 1,
      currentOwner: request.currentOwner,
      operationalStatus: VOS_CONSTANTS.DEFAULT_OPERATIONAL_STATUS,
      priority: request.priority || VosPriority.NORMAL,
      riskLevel: request.riskLevel || VosRiskLevel.LOW,
      riskScore: request.riskScore || 0,
      riskReason: request.riskReason,
      dataClassification: DataClassification.INTERNAL,
      gateInTime: now,
      isClosed: false,
      createdBy: request.createdBy,
      updatedBy: request.createdBy,
      isDeleted: false,
      syncVersion: 1
    };

    const created = await this.vosRepository.create(vosData);

    StructuredLogger.info(`Created new VOS session: ${created.vosNumber}`, {
      correlationId,
      vosId: created.id,
      publicId: created.publicId,
      companyId: created.companyId,
      dealerId: created.dealerId,
      branchId: created.branchId,
      userId: request.createdBy,
      component: 'VosLifecycleService',
      operation: 'createVos',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS',
      vosNumber: created.vosNumber
    });

    return created;
  }

  public async closeVos(request: CloseVosRequest, correlationId?: string): Promise<IVos> {
    const startTime = Date.now();
    const existing = await this.vosRepository.findById(request.vosId);
    if (!existing) {
      throw new Error(`[VosLifecycleService] VOS ${request.vosId} not found`);
    }

    // 1. Validate closed session protection
    this.validationService.validateClosedSession(existing);

    // 2. Validate optimistic locking
    this.validationService.validateOptimisticLock(existing, request.expectedVersion);

    const now = new Date().toISOString();
    const newVersion = existing.version + 1;

    const closed = await this.vosRepository.update(existing.id, {
      isClosed: true,
      closedAt: now,
      gateOutTime: now,
      operationalStatus: 'CLOSED',
      currentState: 'GATE_OUT',
      currentStateCode: 'STATE_GATE_OUT',
      version: newVersion,
      updatedBy: request.closedBy,
      updatedAt: now
    });

    StructuredLogger.info(`Closed VOS session: ${closed.vosNumber}`, {
      correlationId,
      vosId: closed.id,
      publicId: closed.publicId,
      companyId: closed.companyId,
      dealerId: closed.dealerId,
      branchId: closed.branchId,
      userId: request.closedBy,
      component: 'VosLifecycleService',
      operation: 'closeVos',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS',
      newVersion
    });

    return closed;
  }
}
