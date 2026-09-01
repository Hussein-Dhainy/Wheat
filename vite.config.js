import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    // This is a single-page WebGL experience: three.js and every scene mount
    // upfront (see SceneManager's warm-up render), so there's no import()
    // boundary to split at — one large chunk is expected here, not a signal
    // of unintentional bloat.
    chunkSizeWarningLimit: 1600,
  },
  plugins: [react()],
  server: {
    watch: {
      // Headless timing/screenshot runs drop a Chrome user-data directory in
      // the project root. Chrome keeps files inside it locked while it runs,
      // and the dev server's watcher dies with EBUSY the moment it tries to
      // watch one -- taking the whole process down, not just the watch.
      // Gitignoring it is not enough; the watcher does not consult git.
      //
      // The defaults are restated because this list replaces them rather than
      // extending them.
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.tmp-chrome-*/**',
      ],
    },
  },
})
