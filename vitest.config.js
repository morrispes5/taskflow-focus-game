import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Logika murni di src/lib berjalan di environment node yang cepat.
// Tes komponen (*.test.jsx) butuh DOM, jadi hanya file itu yang memakai jsdom.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.jsx', 'jsdom']],
    setupFiles: ['src/test/setup.js']
  }
});
