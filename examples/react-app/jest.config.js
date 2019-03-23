module.exports = {
  // automock: true,
  "//": "Jest runs unit-tests in imported file, so need restriction",
  testMatch: ["<rootDir>/src/components/**/*.js?(x)", "__tests__/**/*.js?(x)"]
  // testMatch: ["<rootDir>/src/**/*.js?(x)"],
  // unmockedModulePathPatterns: ["<rootDir>/node_modules/"]
  // testMatch: ["<rootDir>/src/index.js?(x)"]
};
