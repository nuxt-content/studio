import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

// @ts-expect-error -- inline css
import styles from './assets/css/main.css?inline'

import { createHead } from '@unhead/vue/client'
import { generateColors, tailwindColors } from './utils/colors'

import App from './app.vue'
import Content from './pages/content.vue'
import Media from './pages/media.vue'

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
        styles.replace(/:root/g, ':host')
          .replace(/([^-])html/g, '$1:host')
          .replace(/([^-])body/g, '$1:host'),
      ],
    },
  ) as VueElementConstructor

  customElements.define('nuxt-studio', NuxtStudio)
}

export * from './types/index.ts'
export default {}
