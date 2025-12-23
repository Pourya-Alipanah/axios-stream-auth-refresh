import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'axios-stream-auth-refresh',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['axios', 'rxjs'],
      output: {
        globals: {
          axios: 'axios',
          rxjs: 'rxjs',
        },
      },
    },
    sourcemap: true,
  },
})
