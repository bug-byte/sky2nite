import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      '@tanstack/react-query',
      'axios',
      'styled-components',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // shared types package — points to source TypeScript (type-only, erased at build time)
      'shared': path.resolve(__dirname, '../shared/src'),
      // react-data-table-component has an empty "exports" field that causes
      // bundlers to resolve to the CJS file. Point explicitly at the ESM build.
      'react-data-table-component': fileURLToPath(
        new URL('./node_modules/react-data-table-component/dist/index.es.js', import.meta.url)
      ),
    },
  },
})
