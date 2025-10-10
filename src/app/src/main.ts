import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

// @ts-expect-error -- inline css
import styles from './assets/css/main.css?inline'

import { createHead } from '@unhead/vue/client'
import { generateColors, tailwindColors } from './utils/colors'
import { refineTailwindStyles } from './utils/styles.ts'

import App from './app.vue'
import Content from './pages/content.vue'
import Media from './pages/media.vue'
import Review from './pages/review.vue'

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
          ],
          history: createMemoryHistory(),
        })

        app.use(router)
        // app._context.provides.usehead = true
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
