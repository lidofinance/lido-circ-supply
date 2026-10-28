import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_BRANCH, APP_COMMIT, APP_NAME, APP_VERSION } from './app.constants';

describe('app constants', () => {
  it('reads the name and version from package.json', () => {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));

    expect(APP_NAME).toBe(packageJson.name);
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  // CI replaces the placeholders in build-info.json; the committed file keeps them
  it('reports unknown branch and commit for the committed build-info.json placeholders', () => {
    expect(APP_BRANCH).toBe('unknown');
    expect(APP_COMMIT).toBe('unknown');
  });
});
