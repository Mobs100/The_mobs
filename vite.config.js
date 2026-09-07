import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        customer: resolve(__dirname, 'customer/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        delivery: resolve(__dirname, 'delivery/index.html'),
      },
    },
  },
});