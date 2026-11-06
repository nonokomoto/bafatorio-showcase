/* eslint-env node */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Prefix '' carrega TODAS as vars do .env (incl. as sem VITE_) para uso em build-time.
  // O SENTRY_AUTH_TOKEN fica aqui no Node; só vars VITE_ chegam ao bundle do cliente.
  const env = loadEnv(mode, process.cwd(), '')
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN

  return {
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
    // Só ativo quando há token (deploy/CI). Faz upload dos source maps e apaga os .map
    // do bundle para não os servir publicamente. Sem token, o build corre normal sem upload.
    ...(sentryAuthToken
      ? [sentryVitePlugin({
          org: 'bafatorio-ho',
          project: 'bafatorio-app',
          authToken: sentryAuthToken,
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        })]
      : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'src': resolve(__dirname, 'src')
    },
  },
  define: {
    global: 'window', // Add this line
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Só gera source maps quando vamos fazer upload (token presente): 'hidden' produz .map
    // sem comentário //# no JS; o plugin faz upload e apaga-os. Sem token, nada de maps.
    sourcemap: sentryAuthToken ? 'hidden' : false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
        // Do NOT reintroduce manualChunks. Libs that reference React.* at module
        // init (redux-persist PureComponent, framer-motion createContext) crash
        // when their chunk executes before vendor-react finishes loading.
        // Rollup's automatic chunking respects the dependency graph correctly.
      }
    }, 
    optimizeDeps: {
      include: ['@react-pdf/renderer']
    }
  },
  }
})