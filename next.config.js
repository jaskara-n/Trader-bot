// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config...

  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Don't parse WASM files on server
    if (isServer) {
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
      });
    }

    if (isServer) {
      config.externals.push({
        "@xmtp/user-preferences-bindings-wasm":
          "commonjs @xmtp/user-preferences-bindings-wasm",
      });
    }

    return config;
  },
};

module.exports = nextConfig;
