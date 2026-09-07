import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: rootDir,
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        customer: resolve(rootDir, 'customer/index.html'),
        admin: resolve(rootDir, 'admin/index.html'),
        delivery: resolve(rootDir, 'delivery/index.html'),
      },
    },
  },
});
