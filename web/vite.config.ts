import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const kbDir = resolve(here, '../kb');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow importing the shared KB markdown that lives outside web/.
    fs: { allow: [here, kbDir] },
    // Proxy API calls to the backend in dev so the browser uses one origin.
    proxy: {
      '/api': 'http://localhost:8787'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}']
  }
});
