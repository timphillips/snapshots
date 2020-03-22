const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const isProduction = typeof NODE_ENV !== "undefined" && NODE_ENV === "production";

module.exports = {
  entry: "./src/index.ts",
  mode: isProduction ? "production" : "development",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  plugins: [new CopyPlugin([{ from: "src/index.html", to: "index.html", toType: "file" }])],
  resolve: {
    extensions: [".ts", ".js"]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  }
};
