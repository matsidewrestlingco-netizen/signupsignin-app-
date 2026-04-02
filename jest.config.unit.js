module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/firebase.test.ts'],
  moduleNameMapper: {
    '^firebase/(.*)$': '<rootDir>/__tests__/mocks/firebase-$1.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/mocks/async-storage.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        skipLibCheck: true,
      },
      isolatedModules: true,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
