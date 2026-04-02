// Prevent Expo winter runtime lazy getters from triggering "outside scope" errors
// when they are accessed during jest module loading. We replace them with simple values.

if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
  Object.defineProperty(global, '__ExpoImportMetaRegistry', {
    value: { url: null },
    configurable: true,
    writable: true,
    enumerable: false,
  });
}

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (v) => JSON.parse(JSON.stringify(v));
}
