module.exports = {
  testEnvironment: "node",
  testTimeout: 30000, // gives room for the one-time MongoDB download on first run
  testPathIgnorePatterns: ["/node_modules/", "/tests/testUtils.js"]
};
