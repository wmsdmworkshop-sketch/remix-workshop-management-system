import { describe, it, expect } from 'vitest';
import CorePlatform from '../core/platform';
import { integrationRegistry } from '../integrations';

describe('DWIP Enterprise - Integration Layer & Core Platform (Sprint IL-001)', () => {

  it('1. Core Platform Facade initializes all 10 Core Engines successfully', () => {
    expect(CorePlatform.authentication).toBeDefined();
    expect(CorePlatform.integration).toBeDefined();
    expect(CorePlatform.sync).toBeDefined();
    expect(CorePlatform.cache).toBeDefined();
    expect(CorePlatform.notification).toBeDefined();
    expect(CorePlatform.audit).toBeDefined();
    expect(CorePlatform.gateway).toBeDefined();
    expect(CorePlatform.monitoring).toBeDefined();
    expect(CorePlatform.permission).toBeDefined();
    expect(CorePlatform.configuration).toBeDefined();
  });

  it('2. Integration Registry lists registered OEM connectors (TMSA, DMS, FleetEdge)', () => {
    const codes = integrationRegistry.listRegisteredSystemCodes();
    expect(codes).toContain('TMSA');
    expect(codes).toContain('DMS');
    expect(codes).toContain('FLEETEDGE');
  });

  it('3. Connectors expose all 9 standardized service interfaces', async () => {
    const tmsa = integrationRegistry.getConnector('TMSA');
    expect(tmsa.authService).toBeDefined();
    expect(tmsa.vehicleService).toBeDefined();
    expect(tmsa.customerService).toBeDefined();
    expect(tmsa.jobCardService).toBeDefined();
    expect(tmsa.gateEntryService).toBeDefined();
    expect(tmsa.warrantyService).toBeDefined();
    expect(tmsa.mediaService).toBeDefined();
    expect(tmsa.masterSyncService).toBeDefined();
    expect(tmsa.healthService).toBeDefined();

    const vehicle = await tmsa.vehicleService.getVehicleByVin('VIN_TMSA_999');
    expect(vehicle).not.toBeNull();
    expect(vehicle?.vin).toBe('VIN_TMSA_999');
    expect(vehicle?.sourceSystem).toBe('TMSA');
    expect(vehicle?.syncStatus).toBe('SYNCED');
  });

  it('4. SyncEngine enforces sync metadata compliance', () => {
    const rawData = { name: 'Demo Equipment', value: 500 };
    const synced = CorePlatform.sync.decorateWithSyncMetadata(rawData, 'TMSA', 'REC_1001', 1);

    expect(synced.sourceSystem).toBe('TMSA');
    expect(synced.sourceRecordId).toBe('REC_1001');
    expect(synced.lastSyncTime).toBeDefined();
    expect(synced.syncStatus).toBe('SYNCED');
    expect(synced.version).toBe(1);
    expect(synced.checksum).toBeDefined();
  });

  it('5. CacheEngine performs in-memory cache, expiration, and invalidation', async () => {
    await CorePlatform.cache.set('test_key_1', { status: 'OK' }, 3600, 'tag_unit_test');
    const value = await CorePlatform.cache.get('test_key_1');
    expect(value).toEqual({ status: 'OK' });

    const invalidatedCount = await CorePlatform.cache.invalidateTag('tag_unit_test');
    expect(invalidatedCount).toBe(1);

    const clearedVal = await CorePlatform.cache.get('test_key_1');
    expect(clearedVal).toBeNull();
  });

  it('6. ApiGateway executes requests through resilience pipeline', async () => {
    const response = await CorePlatform.gateway.executeRequest({
      systemCode: 'TMSA',
      apiName: '/api/v1/test',
      body: { ping: 'pong' }
    });

    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.correlationId).toBeDefined();
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('7. AuditEngine records and queries interaction logs', async () => {
    await CorePlatform.audit.logInteraction({
      systemId: 'TMSA',
      apiName: '/api/v1/vehicles/sync',
      correlationId: 'corr_test_999',
      requestTime: new Date().toISOString(),
      status: 'SUCCESS',
      statusCode: 200
    });

    const logs = CorePlatform.audit.getLogs({ systemId: 'TMSA' });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(l => l.correlationId === 'corr_test_999')).toBe(true);
  });

  it('8. ConfigurationEngine updates external system parameters', () => {
    const updated = CorePlatform.configuration.updateConfig('TMSA', {
      timeoutMs: 12000,
      retryCount: 4
    });

    expect(updated.timeoutMs).toBe(12000);
    expect(updated.retryCount).toBe(4);

    const fetched = CorePlatform.configuration.getConfig('TMSA');
    expect(fetched?.timeoutMs).toBe(12000);
  });

  it('9. MonitoringEngine aggregates overall dashboard metrics', async () => {
    const metrics = await CorePlatform.monitoring.getOverallDashboardMetrics();
    expect(metrics.totalSystems).toBeGreaterThanOrEqual(3);
    expect(metrics.healthySystems).toBeGreaterThanOrEqual(1);
    expect(metrics.systems.length).toBeGreaterThanOrEqual(3);
  });

  it('10. PermissionEngine maps CRM Roles to DWIP RBAC controls', () => {
    const dwipRole = CorePlatform.permission.getMappedDwipRole('CRM_SERVICE_ADVISOR');
    expect(dwipRole).toBe('service_advisor');

    const canCreate = CorePlatform.permission.evaluatePermission('CRM_SERVICE_ADVISOR', 'CREATE_JOBCARD');
    expect(canCreate).toBe(true);
  });

});
