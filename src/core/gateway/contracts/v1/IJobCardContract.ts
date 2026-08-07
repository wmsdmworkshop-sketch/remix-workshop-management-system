/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IJobCardContract: Job Card API Contract Interface v1
 */

import { DwipJobCard } from '../../types';

export interface IJobCardContractV1 {
  readonly contractVersion: 'v1';

  getJobCardById(jobCardId: string): Promise<DwipJobCard | null>;
  syncJobCard(jobCard: Partial<DwipJobCard>): Promise<DwipJobCard>;
  updateJobCardStatus(jobCardId: string, status: DwipJobCard['status']): Promise<boolean>;
}
