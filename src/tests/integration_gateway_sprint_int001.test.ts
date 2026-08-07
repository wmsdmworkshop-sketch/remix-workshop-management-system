/**
 * DWIP Enterprise Integration Gateway - Comprehensive Vitest Test Suite
 * Architecture: DWIP-INT-ARCH-001 v1.0
 * Minimum 95% Coverage for Gateway Services, Orchestration, Resiliency & Governance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { integrationGatewayController } from '../core/gateway/controller/IntegrationGatewayController';
import { OemProviderRegistry } from '../core/gateway/adapter/OemProviderRegistry';
import { GenericOemAdapter } from '../core/gateway/adapter/GenericOemAdapter';
import { syncOrchestrator } from '../core/gateway/orchestrator/SyncOrchestrator';
import { prioritySyncQueue } from '../core/gateway/queue/PrioritySyncQueue';
import { failedRequestQueue } from '../core/gateway/queue/FailedRequestQueue';
import { CircuitBreaker } from '../core/gateway/circuitbreaker/CircuitBreaker';
import { RateLimiter } from '../core/gateway/ratelimiter/RateLimiter';
import { ConflictResolver } from '../core/gateway/conflict/ConflictResolver';
import { apiMetricsCollector } from '../core/gateway/metrics/ApiMetricsCollector';
import { apiAuditLogger } from '../core/gateway/audit/ApiAuditLogger';
import { GenericApiClient } from '../core/gateway/client/GenericApiClient';
import { integrationEventPublisher } from '../core/gateway/events/IntegrationEventPublisher';
import { PriorityLevel, SyncState, ConflictPolicy } from '../core/gateway/types';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise Integration Gateway Test Suite (DWIP-INT-ARCH-001 v1.0)', () => {
  beforeEach(() => {
    OemProviderRegistry.clear();
    prioritySyncQueue.clear();
    failedRequestQueue.clear();
    apiMetricsCollector.clear();
    apiAuditLogger.clear();
    StructuredLogger.clearLogsForTest();
  });

  it('1. Provider Registry & Adapter Resolution: Should register and resolve OEM adapters dynamically', async () => {
    const testProvider = new GenericOemAdapter('TEST_OEM_PROVIDER', 'https://gateway.internal/test');
    OemProviderRegistry.registerProvider(testProvider);

    expect(OemProviderRegistry.hasProvider('TEST_OEM_PROVIDER')).toBe(true);
    const resolved = OemProviderRegistry.getProvider('TEST_OEM_PROVIDER');
    expect(resolved.providerId).toBe('TEST_OEM_PROVIDER');

    const authSession = await integrationGatewayController.authenticate('TEST_OEM_PROVIDER');
    expect(authSession.token).toContain('TEST_OEM_PROVIDER');
  });

  it('2. 10 Domain Services Delegation: Should delegate vehicle, customer, jobcard, and health queries to domain services', async () => {
    const vehicle = await integrationGatewayController.getVehicle('TMSA', 'VIN1234567890');
    expect(vehicle?.vin).toBe('VIN1234567890');

    const customer = await integrationGatewayController.getCustomer('TMSA', 'CUST_1001');
    expect(customer?.fullName).toBe('Enterprise Fleet Corp');

    const jobCard = await integrationGatewayController.getJobCard('TMSA', 'JC_5001');
    expect(jobCard?.status).toBe('WIP');

    const health = await integrationGatewayController.getHealth('TMSA');
    expect(health.status).toBe('HEALTHY');
  });

  it('3. Sync Orchestrator & Events: Should coordinate sync workflow and publish IntegrationEvents', async () => {
    let syncStartedFired = false;
    let syncCompletedFired = false;

    integrationEventPublisher.subscribe(event => {
      if (event.eventType === 'SyncStarted') syncStartedFired = true;
      if (event.eventType === 'SyncCompleted') syncCompletedFired = true;
    });

    const syncRecord = await syncOrchestrator.startSync('TMSA', 'FULL', 'VEHICLE', 'CORR-SYNC-1001');
    expect(syncRecord.status).toBe(SyncState.SUCCESS);
    expect(syncRecord.recordsProcessed).toBeGreaterThan(0);
    expect(syncStartedFired).toBe(true);
    expect(syncCompletedFired).toBe(true);
  });

  it('4. Priority Queue Ordering: Should process CRITICAL priority items before BACKGROUND priority items', async () => {
    prioritySyncQueue.enqueue({
      providerId: 'TMSA',
      entityType: 'JOB_CARD',
      operation: 'BACKGROUND_SYNC',
      serializedPayload: '{}',
      headers: {},
      priority: PriorityLevel.BACKGROUND,
      correlationId: 'CORR-BG-01',
      checksum: 'chk_bg'
    });

    prioritySyncQueue.enqueue({
      providerId: 'TMSA',
      entityType: 'GATE_ENTRY',
      operation: 'BREAKDOWN_EMERGENCY_INTAKE',
      serializedPayload: '{}',
      headers: {},
      priority: PriorityLevel.CRITICAL,
      correlationId: 'CORR-CRIT-01',
      checksum: 'chk_crit'
    });

    const firstOut = prioritySyncQueue.dequeue();
    expect(firstOut?.priority).toBe(PriorityLevel.CRITICAL);
    expect(firstOut?.operation).toBe('BREAKDOWN_EMERGENCY_INTAKE');
  });

  it('5. ConflictResolver Policies: Should evaluate SERVER_WINS, CLIENT_WINS, and LATEST_TIMESTAMP', async () => {
    const clientRecord = { id: 'R1', name: 'Client Update', updatedAt: '2026-07-31T10:00:00Z' };
    const serverRecord = { id: 'R1', name: 'Server Update', updatedAt: '2026-07-31T12:00:00Z' };

    // SERVER_WINS
    const resServer = ConflictResolver.resolve(clientRecord, serverRecord, ConflictPolicy.SERVER_WINS);
    expect(resServer.resolvedRecord?.name).toBe('Server Update');

    // CLIENT_WINS
    const resClient = ConflictResolver.resolve(clientRecord, serverRecord, ConflictPolicy.CLIENT_WINS);
    expect(resClient.resolvedRecord?.name).toBe('Client Update');

    // LATEST_TIMESTAMP (Server is newer)
    const resLatest = ConflictResolver.resolve(clientRecord, serverRecord, ConflictPolicy.LATEST_TIMESTAMP);
    expect(resLatest.resolvedRecord?.name).toBe('Server Update');
  });

  it('6. CircuitBreaker Resiliency: Should transition CLOSED -> OPEN on consecutive failures', async () => {
    const cb = new CircuitBreaker(2, 5000);
    expect(cb.getState()).toBe('CLOSED');

    // Failure 1
    await expect(cb.execute(async () => { throw new Error('Network timeout'); })).rejects.toThrow();
    expect(cb.getState()).toBe('CLOSED');

    // Failure 2 -> Trips to OPEN
    await expect(cb.execute(async () => { throw new Error('Network timeout'); })).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');

    // Request rejected while OPEN
    await expect(cb.execute(async () => 'OK')).rejects.toThrow('CircuitBreaker is OPEN');
  });

  it('7. RateLimiter Enforcement: Should enforce rate and concurrency limits', async () => {
    const limiter = new RateLimiter(50, 2, 1); // Max 1 concurrency, 2 burst

    limiter.acquireToken();
    expect(limiter.getActiveConcurrency()).toBe(1);

    // Concurrency limit exceeded
    expect(() => limiter.acquireToken()).toThrow('Max concurrency limit exceeded');

    limiter.releaseToken();
    expect(limiter.getActiveConcurrency()).toBe(0);
  });

  it('8. 5-Header Request Tracing & Idempotency: Should generate tracing context and idempotency keys', async () => {
    const trace = apiAuditLogger.generateTraceContext('CORR-TEST-555');
    expect(trace.traceId).toBeDefined();
    expect(trace.correlationId).toBe('CORR-TEST-555');
    expect(trace.requestId).toBeDefined();

    const idempotencyKey = GenericApiClient.generateIdempotencyKey('TMSA', '/api/v1/jobcards', { status: 'WIP' });
    expect(idempotencyKey).toContain('idemp_');

    const res = await GenericApiClient.request<any>('TMSA', 'https://gateway.internal/tmsa/test', 'POST', { a: 1 });
    expect(res.statusCode).toBe(200);

    const logs = apiAuditLogger.getLogs(1);
    expect(logs.length).toBe(1);
    expect(logs[0].requestHeaders['X-Trace-Id']).toBeDefined();
  });
});
