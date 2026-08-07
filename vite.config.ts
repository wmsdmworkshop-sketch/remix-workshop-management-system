import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import fs from 'fs';

const versionData = (() => {
  try {
    const vPath = path.resolve(__dirname, 'version.json');
    if (fs.existsSync(vPath)) {
      return JSON.parse(fs.readFileSync(vPath, 'utf8'));
    }
  } catch (e) {}
  return {};
})();

const commitHash = process.env.VITE_GIT_COMMIT || process.env.COMMIT_SHA || versionData.commit || (() => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return '3a1dcd941b8fda890ffae46700f46d4ea597d2c8';
  }
})();
const buildTime = process.env.BUILD_TIME || new Date().toISOString();

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      __BUILD_COMMIT__: JSON.stringify(commitHash),
      __BUILD_TIME__: JSON.stringify(buildTime),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // This is a monolithic SPA; the large bundle is expected.
      // Suppress the 500 kB chunk warning â€” code-splitting would require major restructuring.
      chunkSizeWarningLimit: 4096,
    },
  };
});
