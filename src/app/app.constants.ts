import { readFileSync } from 'fs';
import { join } from 'path';

// The container starts the app with node directly (no yarn/npm), so the
// npm_package_* env variables are not set — read package.json instead
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

export const APP_VERSION: string = packageJson.version;
export const APP_NAME: string = packageJson.name;
export const APP_DESCRIPTION: string = packageJson.description;

// CI replaces the REPLACE_WITH_* placeholders in build-info.json with the
// actual values; locally the file keeps the placeholders
const readBuildInfo = (): Record<string, string> => {
  try {
    return JSON.parse(readFileSync(join(__dirname, '..', '..', 'build-info.json'), 'utf8'));
  } catch {
    return {};
  }
};

const buildInfo = readBuildInfo();

const getBuildInfoField = (field: string): string => {
  const value = buildInfo[field];

  if (!value || value.startsWith('REPLACE_WITH')) {
    return 'unknown';
  }

  return value;
};

export const APP_BRANCH: string = getBuildInfoField('branch');
export const APP_COMMIT: string = getBuildInfoField('commit');
