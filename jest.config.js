module.exports = {
  testEnvironment: './__tests__/setup/jsdomEnvironmentWithProxy',
  // testEnvironment: 'jest-environment-jsdom-fourteen',
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/setup/'
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  }
};
