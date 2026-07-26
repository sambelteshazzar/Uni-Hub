/**
 * Jest Configuration for JERTS CART Backend Tests
 */
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '**/tests/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  // Prevent Jest from exiting early
  detectOpenHandles: true,
  forceExit: true,
};
