import { describe, expect, it } from 'vitest';
import { normalizeReturnedRows, parseClamResponse, parsePdfInfo } from './media-processor.service';

describe('media processor parsers', () => {
  it('accepts clean and infected ClamAV responses without accepting scanner errors', () => {
    expect(parseClamResponse('stream: OK\0')).toEqual({ status: 'clean' });
    expect(parseClamResponse('stream: Eicar-Signature FOUND\0')).toEqual({
      status: 'infected',
      signature: 'Eicar-Signature',
    });
    expect(parseClamResponse('stream: size limit exceeded ERROR\0')).toEqual({
      status: 'error',
      detail: 'stream: size limit exceeded ERROR',
    });
  });

  it('extracts PDF page and encryption policy inputs', () => {
    expect(parsePdfInfo('Pages:          12\nEncrypted:      no\n')).toEqual({
      pages: 12,
      encrypted: false,
    });
    expect(parsePdfInfo('Pages: 3\nEncrypted: yes (print:no)\n')).toEqual({
      pages: 3,
      encrypted: true,
    });
  });

  it('normalizes TypeORM mutation results before cleanup status accounting', () => {
    const row = { id: 'asset-1' };
    expect(normalizeReturnedRows([row])).toEqual([row]);
    expect(normalizeReturnedRows([[row], 1])).toEqual([row]);
    expect(normalizeReturnedRows(undefined)).toEqual([]);
  });
});
