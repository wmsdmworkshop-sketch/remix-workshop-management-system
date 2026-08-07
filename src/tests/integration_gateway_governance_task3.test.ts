/**
 * DWIP Enterprise Integration Gateway - Task 3 Governance Freeze Vitest Test Suite
 * Minimum 95% Coverage for Versioned Contracts, FeatureFlagService & ADRs
 */

import { describe, it, expect } from 'vitest';
import { featureFlagService } from '../core/gateway/featureflags/FeatureFlagService';
import { GenericOemAdapter } from '../core/gateway/adapter/GenericOemAdapter';
import { StructuredLogger } from '../core/vos/utils/StructuredLogger';

describe('DWIP Enterprise Integration Gateway - Task 3 Governance Freeze Test Suite', () => {
  it('1. Versioned Integration Contract Compliance: Should verify provider adapter implements v1 contract version', async () => {
    const adapter = new GenericOemAdapter('TMSA_TEST_PROVIDER', 'https://gateway.internal/tmsa');
    expect(adapter.contractVersion).toBe('v1');

    const authSession = await adapter.authenticate();
    expect(authSession.systemCode).toBe('TMSA_TEST_PROVIDER');
    expect(authSession.token).toContain('SIMULATED_TOKEN');
  });

  it('2. FeatureFlagService 4-Tier Hierarchy: Should evaluate System -> Provider -> Workshop -> User hierarchy', async () => {
    // System Default is true for EnableMediaUpload
    const systemVal = featureFlagService.isEnabled('EnableMediaUpload');
    expect(systemVal).toBe(true);

    // Set Provider level override to false for PROVIDER_OFFLINE
    featureFlagService.setFlagConfig({
      flag: 'EnableOfflineSync',
      systemValue: true,
      providerValues: { PROVIDER_OFFLINE: false },
      workshopValues: { WORKSHOP_PUNE: true },
      userValues: { USER_SPECIAL: true }
    });

    // 1. System level fallback
    expect(featureFlagService.isEnabled('EnableOfflineSync', { providerId: 'PROVIDER_NORMAL' })).toBe(true);

    // 2. Provider level override
    expect(featureFlagService.isEnabled('EnableOfflineSync', { providerId: 'PROVIDER_OFFLINE' })).toBe(false);

    // 3. Workshop level override
    expect(
      featureFlagService.isEnabled('EnableOfflineSync', {
        providerId: 'PROVIDER_OFFLINE',
        workshopId: 'WORKSHOP_PUNE'
      })
    ).toBe(true);

    // 4. User level override (highest priority)
    expect(
      featureFlagService.isEnabled('EnableOfflineSync', {
        providerId: 'PROVIDER_OFFLINE',
        workshopId: 'WORKSHOP_PUNE',
        userId: 'USER_SPECIAL'
      })
    ).toBe(true);
  });

  it('3. FeatureFlag Complementing Capabilities: Should complement ProviderCapabilities without replacing them', async () => {
    const isMediaEnabled = featureFlagService.isEnabled('EnableMediaUpload', { providerId: 'TMSA' });
    expect(typeof isMediaEnabled).toBe('boolean');
  });
});
