import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import styles from './assets/css/main.css?inline'

import { createHead } from '@unhead/vue/client'
import { generateColors, tailwindColors } from './utils/colors'

import App from './App.vue'

if (typeof window !== 'undefined' && 'customElements' in window) {
  const NuxtStudio = defineCustomElement(
    App,
    {
      shadowRoot: true,
      configureApp(app) {
        const router = createRouter({
          routes: [],
          history: createWebHistory(),
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
