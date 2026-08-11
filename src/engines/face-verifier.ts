export type FaceVerificationProvider = 'FirebaseML' | 'AWS' | 'Azure' | 'GoogleVision' | 'OpenAI' | 'Gemini' | 'Manual';

export interface FaceVerificationResult {
  matched: boolean;
  score: number;
  provider: FaceVerificationProvider;
  verificationTime: string;
}

export interface FaceVerifierProvider {
  verify(selfieBase64: string, referencePhotoOrEmbedding: string): Promise<{ matched: boolean; score: number }>;
}

// Mock implementation of FaceVerifierProvider
class MockFaceVerifier implements FaceVerifierProvider {
  async verify(selfieBase64: string, referencePhotoOrEmbedding: string): Promise<{ matched: boolean; score: number }> {
    // Generate a mock score between 0.85 and 0.99 to simulate successful matching
    const score = parseFloat((0.85 + Math.random() * 0.14).toFixed(3));
    // Simulated mock matches
    const matched = score >= 0.85;
    return { matched, score };
  }
}

const providers: Record<FaceVerificationProvider, FaceVerifierProvider> = {
  Manual: new MockFaceVerifier(),
  FirebaseML: new MockFaceVerifier(),
  AWS: new MockFaceVerifier(),
  Azure: new MockFaceVerifier(),
  GoogleVision: new MockFaceVerifier(),
  OpenAI: new MockFaceVerifier(),
  Gemini: new MockFaceVerifier(),
};

// No real biometric provider is wired yet. PRODUCTION FAILS CLOSED: it must never
// fabricate a passing match score (a fabricated 0.85+ score would silently satisfy
// the OT fast-track gate in overtime-rules.ts). Only non-production (dev/test) may
// use the mock verifier. Production returns UNVERIFIED (matched=false, score 0) so
// the selfie is treated as unverified, never as a fake success — the OT request
// still proceeds through normal multi-level approval, just without auto-fast-track.
const ALLOW_MOCK_FACE = process.env.NODE_ENV !== "production";

/**
 * Verifies face match between submitted selfie and reference embedding/photo.
 * Abstract interface with Manual/Mock implementation only.
 */
export async function verifyFace(
  selfieBase64: string,
  referencePhotoOrEmbedding: string,
  provider: FaceVerificationProvider = 'Manual'
): Promise<FaceVerificationResult> {
  if (!ALLOW_MOCK_FACE) {
    // Fail closed: unconfigured biometric → unverified (no fabricated score).
    return {
      matched: false,
      score: 0,
      provider,
      verificationTime: new Date().toISOString(),
    };
  }
  const verifier = providers[provider] || providers.Manual;
  const result = await verifier.verify(selfieBase64, referencePhotoOrEmbedding);
  return {
    matched: result.matched,
    score: result.score,
    provider,
    verificationTime: new Date().toISOString(),
  };
}
