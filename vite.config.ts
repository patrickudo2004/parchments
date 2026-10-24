import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Tauri CLI sets TAURI_ENV_PLATFORM while running beforeBuildCommand / beforeDevCommand
const isTauriBuild = Boolean(process.env.TAURI_ENV_PLATFORM)

const ORT_DIST_DIR = path.resolve(__dirname, 'node_modules/@huggingface/transformers/dist')
const ORT_FILES = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']

/**
 * Serves / bundles the ONNX Runtime WASM files locally under /ort/.
 * Transformers.js defaults to loading these from cdn.jsdelivr.net, which is blocked by the
 * desktop CSP (script-src 'self') and unavailable offline — breaking on-device Whisper in Tauri.
 */
function localOrtRuntime(): Plugin {
  return {
    name: 'parchments-local-ort-runtime',
    configureServer(server) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const fileName = (req.url || '').split('?')[0].replace(/^\//, '')
        if (!ORT_FILES.includes(fileName)) return next()
        const filePath = path.join(ORT_DIST_DIR, fileName)
        if (!fs.existsSync(filePath)) return next()
        res.setHeader('Content-Type', fileName.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    generateBundle() {
      if (!isTauriBuild) return
      for (const fileName of ORT_FILES) {
        const filePath = path.join(ORT_DIST_DIR, fileName)
        if (!fs.existsSync(filePath)) {
          this.warn(`[local-ort] Missing ${filePath}; on-device Whisper will fall back to CDN.`)
          continue
        }
        this.emitFile({ type: 'asset', fileName: `ort/${fileName}`, source: fs.readFileSync(filePath) })
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
