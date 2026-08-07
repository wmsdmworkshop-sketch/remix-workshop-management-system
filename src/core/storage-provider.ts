import { randomUUID } from "crypto";

export interface UploadMetadata {
  mime_type: string;
  file_size: number;
  original_name: string;
  user_id: string;
}

export interface StorageUploadResult {
  storage_provider: string;
  storage_path: string;
  file_hash: string;
}

export interface IStorageProvider {
  provider_name: string;
  upload(fileBuffer: Buffer, metadata: UploadMetadata): Promise<StorageUploadResult>;
  delete(storagePath: string): Promise<void>;
  getSignedUrl(storagePath: string, expirySeconds?: number): Promise<string>;
}

/**
 * Mock Local Storage Provider for testing / local development
 */
export class LocalStorageProvider implements IStorageProvider {
  provider_name = "LocalStorage";

  async upload(fileBuffer: Buffer, metadata: UploadMetadata): Promise<StorageUploadResult> {
    // In a real local provider, we'd fs.writeFile.
    // For this mock, we just generate a fake path and hash.
    const fakeHash = randomUUID().substring(0, 16);
    return {
      storage_provider: this.provider_name,
      storage_path: `/local-storage/${randomUUID()}-${metadata.original_name}`,
      file_hash: fakeHash
    };
  }

  async delete(storagePath: string): Promise<void> {
    // Mock delete
    return Promise.resolve();
  }

  async getSignedUrl(storagePath: string, expirySeconds: number = 3600): Promise<string> {
    return `http://localhost:3001${storagePath}?expires=${Date.now() + expirySeconds * 1000}`;
  }
}
