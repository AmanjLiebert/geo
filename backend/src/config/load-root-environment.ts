import { resolve } from 'node:path';
import { loadEnvironmentFile } from './environment-file';

// Same relative location from backend/src/config and backend/dist/config.
loadEnvironmentFile(resolve(__dirname, '../../../.env'));
