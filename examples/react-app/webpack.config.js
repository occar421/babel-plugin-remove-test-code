const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => {
  return {
    entry: path.resolve(__dirname, "src/index.jsx"),
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          loader: "babel-loader",
          options: {
            envName: argv.mode
          }
        }
      ]
    },
    plugins: [new HtmlWebpackPlugin()],
    devtool:
      argv.mode === "production" ? "source-map" : "cheap-module-eval-source-map"
  };
};
