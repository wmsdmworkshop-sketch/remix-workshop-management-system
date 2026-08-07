/**
 * DWIP Enterprise Integration Gateway - FeatureFlag Types & Context Models
 */

export type FeatureFlagName =
  | 'EnableMediaUpload'
  | 'EnableTrailerAxle'
  | 'EnableKYC'
  | 'EnableOfflineSync'
  | 'EnableWarrantySync'
  | 'EnableAMC'
  | 'EnableSmartRemarks';

export interface FeatureFlagContext {
  providerId?: string;
  workshopId?: string;
  userId?: string;
}

export interface FeatureFlagConfig {
  flag: FeatureFlagName;
  systemValue: boolean;
  providerValues?: Record<string, boolean>; // providerId -> boolean
  workshopValues?: Record<string, boolean>; // workshopId -> boolean
  userValues?: Record<string, boolean>;     // userId -> boolean
}
