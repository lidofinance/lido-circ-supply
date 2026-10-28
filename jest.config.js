module.exports = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  modulePaths: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/**/*.module.ts',
    '!src/**/interfaces/**',
    '!src/**/*.constants.ts',
    '!src/**/*.e2e-spec.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
};
