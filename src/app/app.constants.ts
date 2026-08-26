import { readFileSync } from 'fs';
import { join } from 'path';

// The container starts the app with node directly (no yarn/npm), so the
// npm_package_* env variables are not set — read package.json instead
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

export const APP_VERSION: string = packageJson.version;
export const APP_NAME: string = packageJson.name;
export const APP_DESCRIPTION: string = packageJson.description;
