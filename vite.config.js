import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        tasks: 'tasks.html',
        focus: 'focus.html',
        calendar: 'calendar.html',
        analytics: 'analytics.html',
        settings: 'settings.html'
      }
    }
  }
});
