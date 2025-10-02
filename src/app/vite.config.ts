import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import path from 'node:path'
import libCss from 'vite-plugin-libcss'
import dts from 'vite-plugin-dts'

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
    ui({
      theme: {
        defaultVariants: {
          size: 'sm',
        },
      },
      ui: {
        colors: {
          neutral: 'neutral',
        },
        pageCard: {
          slots: {
            wrapper: 'min-w-0',
            container: 'p-0 sm:p-0 gap-y-0',
            body: 'p-3  sm:p-3 w-full',
          },
        },
        navigationMenu: {
          slots: {
            link: 'cursor-pointer',
          },
        },
        breadcrumb: {
          slots: {
            link: 'cursor-pointer',
          },
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
      entry: ['./src/main.ts', './src/utils.ts', './src/service-worker.ts'],
      formats: ['es'],
    },
    sourcemap: false,
  },
})
