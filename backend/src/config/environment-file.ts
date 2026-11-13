import { config } from 'dotenv';
import { resolve } from 'node:path';

/** Stable from both backend/src/config and backend/dist/config. */
export function resolveRootPath(path: string): string {
  return resolve(__dirname, '../../..', path);
}

/** Existing injected values win; Docker does not need a mounted dotenv file. */
export function loadEnvironmentFile(path: string, target: NodeJS.ProcessEnv = process.env): void {
  const result = config({ path, processEnv: target, quiet: true });
  if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw new Error('Unable to read the root environment file. Check file permissions.');
  }
}
