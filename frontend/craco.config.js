// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Environment variable overrides
const config = {
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

let webpackConfig = {
  jest: {
    configure: (jestConfig) => {
      // React Router v7 uses subpath exports which Jest can't resolve by default
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/production/dom-export.js',
        '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
        '^react-router$': '<rootDir>/node_modules/react-router/dist/production/index.js',
        // Mirror the webpack '@' → src alias (needed by shadcn ui components in jest)
        '^@/(.*)$': '<rootDir>/src/$1',
      };
      // Add polyfill setup for TextEncoder/TextDecoder (React Router v7)
      jestConfig.setupFiles = [
        ...(jestConfig.setupFiles || []),
        '<rootDir>/src/setupTests.polyfills.js',
      ];
      return jestConfig;
    },
  },
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      // CR-046: Exclude __dev/ from production build
      // CRA's CopyPlugin copies public/ → build/. We hook into the compiler
      // to delete __dev/ after the copy completes.
      if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const rimraf = (dir) => { if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true }); };
        webpackConfig.plugins.push({
          apply: (compiler) => {
            compiler.hooks.afterEmit.tapAsync('RemoveDevDashboard', (compilation, callback) => {
              const devDir = path.resolve(compiler.outputPath, '__dev');
              rimraf(devDir);
              console.log('[CR-046] __dev/ excluded from production build');
              callback();
            });
          }
        });
      }

      return webpackConfig;
    },
  },
};

webpackConfig.devServer = (devServerConfig) => {
  // webpack-dev-server 4.15+ removed these deprecated options that react-scripts 5.0.1 injects
  delete devServerConfig.onBeforeSetupMiddleware;
  delete devServerConfig.onAfterSetupMiddleware;

  // Add health check endpoints if enabled
  if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
    const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Call original setup if exists
      if (originalSetupMiddlewares) {
        middlewares = originalSetupMiddlewares(middlewares, devServer);
      }

      // Setup health endpoints
      setupHealthEndpoints(devServer, healthPluginInstance);

      return middlewares;
    };
  }

  return devServerConfig;
};

// Visual edits disabled to avoid webpack resolution issues
// if (isDevServer) {
//   try {
//     const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
//     webpackConfig = withVisualEdits(webpackConfig);
//   } catch (err) {
//     if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
//       console.warn(
//         "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
//       );
//     } else {
//       throw err;
//     }
//   }
// }

module.exports = webpackConfig;
