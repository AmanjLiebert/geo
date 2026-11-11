import { describe, expect, it } from 'vitest';
import { MediaProcessingPipeline1790553600000 } from './1790553600000-media-processing-pipeline';

describe('MediaProcessingPipeline migration', () => {
  it('adds deterministic private derivatives and retry metadata', async () => {
    const queries: string[] = [];
    await new MediaProcessingPipeline1790553600000().up({
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    } as never);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "media_derivatives"');
    expect(sql).toContain('processing_attempts');
    expect(sql).toContain("LIKE 'processed/%'");
    expect(sql).toContain('uq_media_derivatives_slot');
  });
});
