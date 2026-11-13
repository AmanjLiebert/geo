import { loadEnvironmentFile, resolveRootPath } from './environment-file';

// Same relative location from backend/src/config and backend/dist/config.
loadEnvironmentFile(resolveRootPath('.env'));
