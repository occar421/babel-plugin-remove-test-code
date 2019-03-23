const removeTestCode = require("../../dist");

module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      ["@babel/preset-env", { targets: "last 2 Chrome versions" }],
      "@babel/preset-react"
    ],
    env: {
      development: {
        plugins: [["emotion", { sourceMap: "true" }], [removeTestCode]]
      },
      production: {
        plugins: [["emotion"], [removeTestCode]]
      },
      test: {
        plugins: [["emotion"]]
      }
    }
  };
};
