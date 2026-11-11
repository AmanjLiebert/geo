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

export const MEDIA_PROCESSING_QUEUE = 'media.process';

export const MEDIA_PROCESSING_QUEUE_OPTIONS = {
  retryLimit: 4,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 900,
  retentionSeconds: 604_800,
} as const;

export interface MediaProcessingPayload {
  mediaAssetId: string;
  requestedAt: string;
}
