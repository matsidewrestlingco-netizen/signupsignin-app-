module.exports = {
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(() => 'async-storage-persistence'),
  getAuth: jest.fn(() => ({ currentUser: null })),
};
