import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Modul perangkat (kamera, kacamata BLE, tutor) dipakai bersama dengan halaman partner di public/js.
const legacy = fileURLToPath(new URL('../public/js', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@legacy': legacy } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000', '/recordings': 'http://localhost:3000', '/sources': 'http://localhost:3000' }, fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
