export const FOUNDATION_PROOF_QUEUE = 'foundation.proof';

export const FOUNDATION_PROOF_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 2,
  retryBackoff: true,
  expireInSeconds: 30,
  retentionSeconds: 86_400,
} as const;

export interface FoundationProofPayload {
  runId: string;
  requestedAt: string;
}
