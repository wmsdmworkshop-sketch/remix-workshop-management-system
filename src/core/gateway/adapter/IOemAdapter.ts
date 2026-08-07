/**
 * DWIP Enterprise Integration Gateway - IOemAdapter Interface
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import { IntegrationProviderConfig, ProviderCapabilities, IntegrationAuthSession, SystemHealthReport } from '../types';
import { IAuthContractV1 } from '../contracts/v1/IAuthContract';
import { IMasterDataContractV1 } from '../contracts/v1/IMasterDataContract';
import { IVehicleContractV1 } from '../contracts/v1/IVehicleContract';
import { IServiceRequestContractV1 } from '../contracts/v1/IServiceRequestContract';
import { IJobCardContractV1 } from '../contracts/v1/IJobCardContract';
import { ICrmContractV1 } from '../contracts/v1/ICrmContract';
import { IMediaUploadContractV1 } from '../contracts/v1/IMediaUploadContract';
import { IKycContractV1 } from '../contracts/v1/IKycContract';
import { ITrailerAxleContractV1 } from '../contracts/v1/ITrailerAxleContract';
import { IGensetContractV1 } from '../contracts/v1/IGensetContract';

export interface IOemAdapter
  extends IAuthContractV1,
    IMasterDataContractV1,
    IVehicleContractV1,
    IServiceRequestContractV1,
    IJobCardContractV1,
    ICrmContractV1,
    IMediaUploadContractV1,
    IKycContractV1,
    ITrailerAxleContractV1,
    IGensetContractV1 {
  readonly providerId: string;
  readonly providerConfig: IntegrationProviderConfig;
  readonly capabilities: ProviderCapabilities;

  initialize(config: IntegrationProviderConfig): Promise<void>;
  checkHealth(): Promise<SystemHealthReport>;
  shutdown(): Promise<void>;
}
