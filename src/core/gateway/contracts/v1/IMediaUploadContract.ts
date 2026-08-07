/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * IMediaUploadContract: Media Upload API Contract Interface v1
 */

import { DwipMedia } from '../../types';

export interface IMediaUploadContractV1 {
  readonly contractVersion: 'v1';

  uploadMedia(media: Partial<DwipMedia>, fileBuffer: Uint8Array): Promise<DwipMedia>;
  getMediaByEntity(entityType: DwipMedia['entityType'], entityId: string): Promise<DwipMedia[]>;
  deleteMedia(mediaId: string): Promise<boolean>;
}
