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
      ui: {
        colors: {
          primary: 'neutral',
          neutral: 'zinc',
        },
        footer: {
          slots: {
            container: 'py-2 lg:py-1 px-1 sm:px-4 lg:px-4',
          },
        },
        header: {
          slots: {
            container: 'px-1 sm:px-4 lg:px-4',
          },
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
          defaultVariants: {
            size: 'sm',
          },
        },
        breadcrumb: {
          slots: {
            link: 'cursor-pointer',
          },
        },
        button: {
          variants: {
            size: {
              xs: {
                leadingIcon: 'size-3',
                trailingIcon: 'size-3',
              },
            },
          },
          defaultVariants: {
            size: 'sm',
          },
        },
        dropdownMenu: {
          defaultVariants: {
            size: 'sm',
          },
        },
        badge: {
          defaultVariants: {
            size: 'sm',
          },
        },
        input: {
          defaultVariants: {
            size: 'sm',
          },
        },
        select: {
          defaultVariants: {
            size: 'sm',
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
      entry: './src/index.ts',
      name: 'nuxt-studio',
      formats: ['es'],
      // the proper extensions will be added
      fileName: 'index',
    },
    sourcemap: false,
  },
})
