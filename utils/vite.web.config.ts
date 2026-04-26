import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import monacoEditor from 'vite-plugin-monaco-editor'

const monacoEditorPlugin = monacoEditor({
  languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html', 'css']
})

export default defineConfig(async () => {
  const vueJsx = (await import('@vitejs/plugin-vue-jsx')).default

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'rapidoc' || tag.startsWith('rapi-')
          }
        }
      }),
      vueJsx({
        transformOn: true
      }),
      monacoEditorPlugin
    ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
  }
})
