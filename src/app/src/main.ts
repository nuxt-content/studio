import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
// @ts-expect-error -- inline css
import styles from './assets/css/main.css?inline'
import { createHead } from '@unhead/vue/client'
import { generateColors, tailwindColors } from './utils/colors'
import { refineTailwindStyles } from './utils/styles.ts'
import { createI18n } from 'vue-i18n'
import App from './app.vue'
import Content from './pages/content.vue'
import Media from './pages/media.vue'
import Review from './pages/review.vue'
import Success from './pages/success.vue'
import Error from './pages/error.vue'

if (typeof window !== 'undefined' && 'customElements' in window) {
  const NuxtStudio = defineCustomElement(
    App,
    {
      shadowRoot: true,
      configureApp(app) {
        const router = createRouter({
          routes: [
            {
              name: 'content',
              path: '/content',
              alias: '/',
              component: Content,
            },
            {
              name: 'media',
              path: '/media',
              component: Media,
            },
            {
              name: 'review',
              path: '/review',
              component: Review,
            },
            {
              name: 'success',
              path: '/success',
              component: Success,
            },
            {
              name: 'error',
              path: '/error',
              component: Error,
            },
          ],
          history: createMemoryHistory(),
        })

        app.use(router)

        const i18n = createI18n({
          legacy: false,
          locale: 'en',
          fallbackLocale: 'en',
          globalInjection: true,
        })

        app.provide('i18n', i18n)

        app.use(i18n)

        app.use({
          install() {
            const head = createHead({
              hooks: {
                'dom:beforeRender': (args) => {
                  args.shouldRender = false
                },
              },
            })
            app.use(head)
          },
        })
      },
      styles: [
        tailwindColors,
        generateColors(),
        refineTailwindStyles(styles),
      ],
    },
  ) as VueElementConstructor

  customElements.define('nuxt-studio', NuxtStudio)
}

export * from './types/index.ts'
export default {}
