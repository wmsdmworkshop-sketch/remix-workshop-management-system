import crypto from "crypto";
import type { CertificateSigningProvider } from "./types.ts";

export class SimpleSigningProvider implements CertificateSigningProvider {
  readonly providerId = "simple-sha-rsa-mock";

  // Simulate digital signatures using HMAC/SHA-256 for testing and pilot purposes
  private privateKey = "dwip-enterprise-resale-private-signing-key";

  async sign(data: Record<string, any>): Promise<{ signature: string; hash: string }> {
    const stringified = JSON.stringify(data);
    const hash = crypto.createHash("sha256").update(stringified).digest("hex");
    const signature = crypto.createHmac("sha256", this.privateKey).update(hash).digest("hex");

    return { signature, hash };
  }

  async verifySignature(hash: string, signature: string): Promise<boolean> {
    const calculatedSignature = crypto.createHmac("sha256", this.privateKey).update(hash).digest("hex");
    return calculatedSignature === signature;
  }
}
