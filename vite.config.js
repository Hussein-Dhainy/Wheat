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
})
