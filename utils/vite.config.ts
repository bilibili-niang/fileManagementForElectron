import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import monacoEditor from 'vite-plugin-monaco-editor'

const monacoEditorPlugin = monacoEditor({
  languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html', 'css']
})

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
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
})
