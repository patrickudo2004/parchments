import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

import { nodePolyfills } from 'vite-plugin-node-polyfills'

const ORT_SOURCE_DIRS = [
  path.resolve(__dirname, 'node_modules/@huggingface/transformers/node_modules/onnxruntime-web/dist'),
  path.resolve(__dirname, 'node_modules/@huggingface/transformers/dist'),
]
const ALL_ORT_FILES = [
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
]

function findOrtFile(fileName: string): string | null {
  for (const dir of ORT_SOURCE_DIRS) {
    const candidate = path.join(dir, fileName)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Serves and copies ONNX Runtime WASM & JSEP files to /ort/.
 * Transformers.js defaults to loading these from cdn.jsdelivr.net, which is blocked by the
 * desktop CSP (script-src 'self') and unavailable offline — breaking on-device Whisper in Tauri.
 */
function localOrtRuntime(): Plugin {
  return {
    name: 'parchments-local-ort-runtime',
    configureServer(server) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const fileName = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!ALL_ORT_FILES.includes(fileName)) return next()
        const filePath = findOrtFile(fileName)
        if (!filePath) return next()
        res.setHeader('Content-Type', fileName.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist', 'ort')
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true })
      }
      for (const fileName of ALL_ORT_FILES) {
        const src = findOrtFile(fileName)
        const dest = path.join(outDir, fileName)
        if (src && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    localOrtRuntime(),
    nodePolyfills({
      include: ['events', 'stream', 'util', 'buffer', 'http', 'https', 'path', 'url'], // html-to-docx needs these
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      // Polyfill aliases
      events: 'events',
    },
  },
  define: {
    // Universal global that works in both Main and Worker threads
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
