/**
 * DWIP Enterprise WOS - VosPolicies
 * Task 1.2 VOS Service Layer Business Policy Checker
 */

export class VosPolicies {
  /**
   * List of immutable intake snapshot fields that must NEVER be updated directly
   */
  public static readonly IMMUTABLE_FIELDS = [
    'registrationNumber',
    'chassisNumber',
    'engineNumber',
    'vehicleModel',
    'vehicleVariant',
    'fuelType',
    'emissionNorm',
    'manufacturingYear',
    'odometerAtGateIn',
    'driverName',
    'driverMobile',
    'driverLicenseNumber',
    'driverType',
    'customerName',
    'fleetName',
    'contactPerson',
    'gstNumber',
    'customerType',
    'fleetSize',
    'gateInTime',
    'entrySource',
    'branchId',
    'companyId',
    'dealerId',
    'vehicleId',
    'customerId'
  ] as const;

  /**
   * Allow-list of fields permitted for mutation
   */
  public static readonly ALLOW_LIST_MUTABLE_FIELDS = [
    'priority',
    'riskLevel',
    'riskScore',
    'riskReason',
    'operationalStatus',
    'currentOwner',
    'updatedBy'
  ] as const;

  public static isImmutableField(fieldName: string): boolean {
    return (VosPolicies.IMMUTABLE_FIELDS as readonly string[]).includes(fieldName);
  }

  public static isAllowedMutableField(fieldName: string): boolean {
    return (VosPolicies.ALLOW_LIST_MUTABLE_FIELDS as readonly string[]).includes(fieldName);
  }

  public static findImmutableViolations(updateKeys: string[]): string[] {
    return updateKeys.filter(k => VosPolicies.isImmutableField(k));
  }

  public static findUnallowedMutations(updateKeys: string[]): string[] {
    return updateKeys.filter(k => !VosPolicies.isAllowedMutableField(k));
  }
}
