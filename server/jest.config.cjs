/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['<rootDir>/src/**/*.itest.ts'],
  moduleNameMapper: {
    // Strip .js from shared/* imports before remapping to source
    '^shared/(.+)\\.js$': '<rootDir>/../shared/src/$1',
    '^shared/(.*)$': '<rootDir>/../shared/src/$1',
    // Strip .js extensions from relative imports so Jest finds the .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json',
    }],
  },
  setupFiles: ['<rootDir>/src/test/setup.ts'],
};
