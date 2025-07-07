// webpack.config.js
const path = require("path");

module.exports = {
    entry: "./src/basic.ts",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        preferRelative: true,
    },
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
    cache: false,
    optimization: {
        minimize: true,
        nodeEnv: "production",
    },
    target: "node",
    externalsPresets: { node: true },
};