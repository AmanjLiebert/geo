import { describe, expect, it } from 'vitest';
import { detectContentType } from './media.service';

describe('media magic-byte detection', () => {
  it('recognizes allowlisted formats and rejects extension-only content', () => {
    expect(detectContentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectContentType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectContentType(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(detectContentType(new TextEncoder().encode('<script>'))).toBeNull();
  });

  it('recognizes WebP only when both RIFF and WEBP markers exist', () => {
    expect(detectContentType(new TextEncoder().encode('RIFFxxxxWEBP'))).toBe('image/webp');
    expect(detectContentType(new TextEncoder().encode('RIFFxxxxxxxx'))).toBeNull();
  });
});
