import { defineConfig } from 'vite';

// base './' so the built site works from any folder or static host path.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
