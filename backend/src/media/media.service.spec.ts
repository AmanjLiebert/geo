import { describe, expect, it } from 'vitest';
import { approvedVideoPlayback, detectContentType } from './media.service';

describe('media magic-byte detection', () => {
  it('recognizes allowlisted image and document formats', () => {
    expect(detectContentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectContentType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectContentType(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(detectContentType(new TextEncoder().encode('<script>'))).toBeNull();
  });

  it('recognizes WebP only when both RIFF and WEBP markers exist', () => {
    expect(detectContentType(new TextEncoder().encode('RIFFxxxxWEBP'))).toBe('image/webp');
    expect(detectContentType(new TextEncoder().encode('RIFFxxxxxxxx'))).toBeNull();
  });

  it('recognizes MP4 video when ftyp container marker and valid major brand exist', () => {
    // 4-byte box size + 'ftyp' + 'isom'
    const isomMp4 = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    expect(detectContentType(isomMp4)).toBe('video/mp4');

    // 4-byte box size + 'ftyp' + 'mp42'
    const mp42 = new Uint8Array([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
    ]);
    expect(detectContentType(mp42)).toBe('video/mp4');

    // Missing 'ftyp'
    const invalidMp4 = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x6d, 0x6f, 0x6f, 0x76, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    expect(detectContentType(invalidMp4)).toBeNull();

    // Unknown brand
    const unknownBrand = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x7a, 0x7a, 0x7a, 0x7a,
    ]);
    expect(detectContentType(unknownBrand)).toBeNull();
  });

  it('recognizes WebM video when EBML header marker contains webm DocType', () => {
    // 0x1A45DFA3 + header containing 'webm'
    const webmBytes = new Uint8Array([
      0x1a,
      0x45,
      0xdf,
      0xa3,
      0x9f,
      0x42,
      0x86,
      0x81,
      0x01,
      0x42,
      0xf7,
      0x81,
      0x01,
      0x42,
      0xf2,
      0x81,
      0x04,
      0x42,
      0x82,
      0x84,
      0x77,
      0x65,
      0x62,
      0x6d, // "webm"
    ]);
    expect(detectContentType(webmBytes)).toBe('video/webm');

    // EBML header without webm
    const nonWebmEbml = new Uint8Array([
      0x1a,
      0x45,
      0xdf,
      0xa3,
      0x9f,
      0x42,
      0x86,
      0x81,
      0x01,
      0x42,
      0xf7,
      0x81,
      0x01,
      0x42,
      0xf2,
      0x81,
      0x04,
      0x42,
      0x82,
      0x88,
      0x6d,
      0x61,
      0x74,
      0x72,
      0x6f,
      0x73,
      0x6b,
      0x61, // "matroska"
    ]);
    expect(detectContentType(nonWebmEbml)).toBeNull();
  });
});

describe('approved video playback selection', () => {
  it('serves only an approved processed rendition and never falls back to the original', () => {
    expect(
      approvedVideoPlayback({
        media_kind: 'video',
        processing_status: 'approved',
        derivative_storage_key: 'processed/video-1/playback.mp4',
      }),
    ).toEqual({
      storageKey: 'processed/video-1/playback.mp4',
      contentType: 'video/mp4',
    });
    expect(
      approvedVideoPlayback({
        media_kind: 'video',
        processing_status: 'approved',
        derivative_storage_key: null,
      }),
    ).toBeNull();
    expect(
      approvedVideoPlayback({
        media_kind: 'video',
        processing_status: 'quarantined',
        derivative_storage_key: 'quarantine/original',
      }),
    ).toBeNull();
  });
});
