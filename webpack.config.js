const WebpackPwaManifest = require("webpack-pwa-manifest");
const path = require("path");

const config = {
    entry: {
        app: "./public/index.js",
    },
    output: {
        path: __dirname + "/public/dist",
        filename: "[name].bundle.js"
    },
    mode: "production",
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"]
                    }
                }
            }
        ]
    },
    plugins: [
        new WebpackPwaManifest({
            filename: "manifest.json",
            inject: false,
            fingerprints: false,

            name: "Budget Tracker",
            short_name: "BudgetTracker",
            theme_color: "#c0392b",
            background_color: "#34495e",
            start_url: "/",
            display: "standalone",
            icons: [
                {
                    src: path.resolve("./public/icons/icon-192x192.png"),
                    size: [192, 512]
                }
            ]
        })]
};
module.exports = config;