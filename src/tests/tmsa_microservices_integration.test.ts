import { describe, it, expect } from 'vitest';
import {
  TMSA_PRODUCTION_BASE_URL,
  TMSA_MICROSERVICE_ENDPOINTS,
  TMSA_ENDPOINT_CATALOG,
} from '../integrations/tmsa/endpoints';
import { TmsaClient } from '../integrations/tmsa/client';
import {
  TmsaConnector,
  TmsaMasterSyncService,
  TmsaMediaService,
  TmsaVehicleService,
  TmsaHealthService,
} from '../integrations/tmsa';
import { integrationRegistry } from '../integrations';

describe('TMSA Microservices Integration Suite', () => {

  it('1. Verifies the complete catalog of 8 official TMSA microservice endpoints', () => {
    expect(TMSA_PRODUCTION_BASE_URL).toBe('https://mobility-cv-prod-microservices.api.tatamotors');
    expect(TMSA_ENDPOINT_CATALOG).toHaveLength(8);

    const keys = TMSA_ENDPOINT_CATALOG.map(e => e.key);
    expect(keys).toContain('BILLING_TYPE_MASTER');
    expect(keys).toContain('COMPLAINT_CODE_MASTER');
    expect(keys).toContain('FAULT_CODE_MASTER');
    expect(keys).toContain('VEHICLE_INVENTORY');
    expect(keys).toContain('FENCE_IN_UPLOAD');
    expect(keys).toContain('CRM_IMAGE_UPLOAD');
    expect(keys).toContain('MEDIA_UPLOAD_SA');
    expect(keys).toContain('MEDIA_UPLOAD_TA');

    // Check exact full URLs
    const billing = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'BILLING_TYPE_MASTER');
    expect(billing?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/billing-type-master/');
    expect(billing?.method).toBe('GET');

    const complaint = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'COMPLAINT_CODE_MASTER');
    expect(complaint?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/complaint-code-master/');
    expect(complaint?.method).toBe('GET');

    const fault = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'FAULT_CODE_MASTER');
    expect(fault?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/fault-code-master/');
    expect(fault?.method).toBe('GET');

    const inventory = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'VEHICLE_INVENTORY');
    expect(inventory?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/vehicle-inventory/');
    expect(inventory?.method).toBe('GET');

    const fenceIn = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'FENCE_IN_UPLOAD');
    expect(fenceIn?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/upload-image/');
    expect(fenceIn?.method).toBe('POST');

    const crmUpload = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'CRM_IMAGE_UPLOAD');
    expect(crmUpload?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/image-upload-in-crm/');
    expect(crmUpload?.method).toBe('POST');

    const mediaSa = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'MEDIA_UPLOAD_SA');
    expect(mediaSa?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/media-upload/');
    expect(mediaSa?.method).toBe('POST');

    const trailerMedia = TMSA_ENDPOINT_CATALOG.find(e => e.key === 'MEDIA_UPLOAD_TA');
    expect(trailerMedia?.fullUrl).toBe('https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/ta/media-upload/');
    expect(trailerMedia?.method).toBe('POST');
  });

  it('2. TmsaClient dispatches requests to the configured endpoints with provider hook', async () => {
    const recordedCalls: any[] = [];
    const mockCallProvider = async (opts: any) => {
      recordedCalls.push(opts);
      return { success: true, mockData: true, path: opts.path };
    };

    const client = new TmsaClient({ callProviderFn: mockCallProvider });

    // Test Billing Master
    const billingRes = await client.getBillingTypes({ workshop_code: 'WS_PUNE' });
    expect(billingRes.success).toBe(true);
    expect(recordedCalls[0].path).toBe('/api/tmsa-cv/sa/billing-type-master/');
    expect(recordedCalls[0].query).toEqual({ workshop_code: 'WS_PUNE' });

    // Test Complaint Code Master
    const complaintRes = await client.getComplaintCodes({ category: 'ENGINE' });
    expect(complaintRes.success).toBe(true);
    expect(recordedCalls[1].path).toBe('/api/tmsa-cv/sa/complaint-code-master/');

    // Test Fault Code Master
    const faultRes = await client.getFaultCodes({ dtc: 'P0101' });
    expect(faultRes.success).toBe(true);
    expect(recordedCalls[2].path).toBe('/api/tmsa-cv/sa/fault-code-master/');

    // Test Vehicle Inventory
    const invRes = await client.getVehicleInventory({ vrn: 'MH12AB1234' });
    expect(invRes.success).toBe(true);
    expect(recordedCalls[3].path).toBe('/api/tmsa-cv/sa/vehicle-inventory/');

    // Test Fence In Upload
    const fenceRes = await client.uploadFenceInImage({
      vrn: 'MH12AB1234',
      image_type: 'FRONT',
      image_base64: 'data:image/jpeg;base64,...',
    });
    expect(fenceRes.success).toBe(true);
    expect(recordedCalls[4].path).toBe('/api/tmsa-cv/sa/upload-image/');
    expect(recordedCalls[4].method).toBe('POST');

    // Test CRM Upload
    const crmRes = await client.uploadCrmImage({
      job_card_number: 'JC-1001',
      document_type: 'INSPECTION_DOC',
    });
    expect(crmRes.success).toBe(true);
    expect(recordedCalls[5].path).toBe('/api/tmsa-cv/sa/image-upload-in-crm/');
    expect(recordedCalls[5].method).toBe('POST');

    // Test Media Upload SA
    const saMediaRes = await client.uploadSaMedia({
      entity_id: 'JC-1001',
      entity_type: 'JOB_CARD',
      media_type: 'IMAGE',
      file_name: 'engine_bay.jpg',
    });
    expect(saMediaRes.success).toBe(true);
    expect(recordedCalls[6].path).toBe('/api/tmsa-cv/sa/media-upload/');
    expect(recordedCalls[6].method).toBe('POST');

    // Test Trailer Media TA
    const taMediaRes = await client.uploadTrailerMedia({
      trailer_id: 'TR-999',
      inspection_point: 'FIFTH_WHEEL',
      media_type: 'IMAGE',
      file_name: 'fifth_wheel.jpg',
    });
    expect(taMediaRes.success).toBe(true);
    expect(recordedCalls[7].path).toBe('/api/tmsa-cv/ta/media-upload/');
    expect(recordedCalls[7].method).toBe('POST');
  });

  it('3. Connector and registry reflect Tata Motors Service Advisor (TMSA-CV)', () => {
    const tmsa = integrationRegistry.getConnector('TMSA');
    expect(tmsa.systemCode).toBe('TMSA');
    expect(tmsa.name).toContain('TMSA');
  });

  it('4. Health service reports active connection to microservices base URL', async () => {
    const healthService = new TmsaHealthService();
    const report = await healthService.checkHealth();
    expect(report.status).toBe('HEALTHY');
    expect(report.activeEndpoint).toContain('api/tmsa-cv');
    expect(report.details?.baseUrl).toBe(TMSA_PRODUCTION_BASE_URL);
  });
});
