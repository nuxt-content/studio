import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import uiPro from '@nuxt/ui-pro/vite'
import path from 'node:path'
import libCss from 'vite-plugin-libcss'
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '#mdc-imports': path.resolve(__dirname, './mock/mdc-import.ts'),
      '#mdc-configs': path.resolve(__dirname, './mock/mdc-import.ts'),
    },
  },
  plugins: [
    vue(),
    uiPro({
      license: 'OSS',
      ui: {
        colors: {
          primary: 'green',
          neutral: 'zinc',
        },
      },
    }),
    libCss(),
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.vue'],
      insertTypesEntry: true,
      rollupTypes: true,
      entryRoot: 'src',
      tsconfigPath: './tsconfig.app.json',
    }),
  ],
  build: {
    cssCodeSplit: false,
    outDir: '../../dist/app',
    lib: {
      entry: './src/index.ts',
      name: 'nuxt-studio',
      formats: ['es'],
      // the proper extensions will be added
      fileName: 'index',
    },
    rollupOptions: {
      external: ['shiki', '@nuxtjs/mdc'],
    },
    sourcemap: true,
  },
})
