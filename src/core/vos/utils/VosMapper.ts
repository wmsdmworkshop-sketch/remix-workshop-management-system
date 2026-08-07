/**
 * DWIP Enterprise WOS - VosMapper
 * Task 1.2 VOS Service Layer DTO & Entity Domain Mapper
 */

import { IVos } from '../../../domain/vos/types';

export class VosMapper {
  public static toDomain(row: any): IVos {
    if (!row) {
      throw new Error('[VosMapper] Cannot map null or undefined database row');
    }

    return {
      id: row.id,
      publicId: row.publicId || row.public_id,
      companyId: row.companyId || row.company_id,
      dealerId: row.dealerId || row.dealer_id,
      vosNumber: row.vosNumber || row.vos_number,
      branchId: row.branchId || row.branch_id,
      vehicleId: row.vehicleId || row.vehicle_id,
      vehicleExternalId: row.vehicleExternalId || row.vehicle_external_id,
      customerId: row.customerId || row.customer_id,
      customerExternalId: row.customerExternalId || row.customer_external_id,
      visitType: row.visitType || row.visit_type,
      commercialType: row.commercialType || row.commercial_type,
      entrySource: row.entrySource || row.entry_source,
      isBreakdown: Boolean(row.isBreakdown ?? row.is_breakdown),
      gateInLatitude: row.gateInLatitude ?? row.gate_in_latitude,
      gateInLongitude: row.gateInLongitude ?? row.gate_in_longitude,
      locationAccuracy: row.locationAccuracy ?? row.location_accuracy,
      currentState: row.currentState || row.current_state,
      currentStateCode: row.currentStateCode || row.current_state_code,
      currentStateVersion: Number(row.currentStateVersion ?? row.current_state_version ?? 1),
      currentOwner: row.currentOwner || row.current_owner,
      operationalStatus: row.operationalStatus || row.operational_status,
      priority: row.priority,
      riskLevel: row.riskLevel || row.risk_level,
      riskScore: Number(row.riskScore ?? row.risk_score ?? 0),
      riskReason: row.riskReason || row.risk_reason,
      sourceSystem: row.sourceSystem || row.source_system,
      syncStatus: row.syncStatus || row.sync_status,
      syncVersion: Number(row.syncVersion ?? row.sync_version ?? 1),
      lastSyncedAt: row.lastSyncedAt || row.last_synced_at,
      externalReference: row.externalReference || row.external_reference,
      dataClassification: row.dataClassification || row.data_classification || 'INTERNAL',
      gateInTime: row.gateInTime || row.gate_in_time || new Date().toISOString(),
      gateOutTime: row.gateOutTime || row.gate_out_time,
      closedAt: row.closedAt || row.closed_at,
      isClosed: Boolean(row.isClosed ?? row.is_closed),
      registrationNumber: row.registrationNumber || row.registration_number,
      chassisNumber: row.chassisNumber || row.chassis_number,
      engineNumber: row.engineNumber || row.engine_number,
      vehicleModel: row.vehicleModel || row.vehicle_model,
      vehicleVariant: row.vehicleVariant || row.vehicle_variant,
      fuelType: row.fuelType || row.fuel_type,
      emissionNorm: row.emissionNorm || row.emission_norm,
      manufacturingYear: row.manufacturingYear ?? row.manufacturing_year,
      odometerAtGateIn: row.odometerAtGateIn ?? row.odometer_at_gate_in,
      warrantyStatusAtGateIn: row.warrantyStatusAtGateIn || row.warranty_status_at_gate_in,
      oemServicePlan: row.oemServicePlan || row.oem_service_plan,
      driverName: row.driverName || row.driver_name,
      driverMobile: row.driverMobile || row.driver_mobile,
      driverLicenseNumber: row.driverLicenseNumber || row.driver_license_number,
      driverType: row.driverType || row.driver_type,
      customerName: row.customerName || row.customer_name,
      fleetName: row.fleetName || row.fleet_name,
      contactPerson: row.contactPerson || row.contact_person,
      gstNumber: row.gstNumber || row.gst_number,
      customerType: row.customerType || row.customer_type,
      fleetSize: row.fleetSize ?? row.fleet_size,
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
      createdBy: row.createdBy || row.created_by,
      updatedBy: row.updatedBy || row.updated_by,
      version: Number(row.version ?? 1),
      isDeleted: Boolean(row.isDeleted ?? row.is_deleted),
      deletedAt: row.deletedAt || row.deleted_at
    };
  }
}
