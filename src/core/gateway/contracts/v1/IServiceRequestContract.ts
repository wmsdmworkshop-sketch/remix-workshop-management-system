/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IServiceRequestContract: Service Request API Contract Interface v1
 */

export interface DwipServiceRequestV1 {
  requestId: string;
  vehicleVin: string;
  customerCode: string;
  complaintSummary: string;
  status: string;
  createdAt: string;
}

export interface IServiceRequestContractV1 {
  readonly contractVersion: 'v1';

  getServiceRequest(requestId: string): Promise<DwipServiceRequestV1 | null>;
  createServiceRequest(request: Partial<DwipServiceRequestV1>): Promise<DwipServiceRequestV1>;
  updateServiceRequestStatus(requestId: string, status: string): Promise<boolean>;
}
