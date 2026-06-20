import type { VueElementConstructor } from 'vue'
import { defineCustomElement } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import styles from './assets/css/main.css?inline'
import { createHead } from '@unhead/vue/client'
import { generateColors, tailwindColors } from './utils/colors'
import { convertPropertyToVar } from './utils/styles'
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import { setStudioI18nGlobal, type StudioI18nGlobal } from './utils/studioI18n'
import App from './app.vue'
import Content from './pages/content.vue'
import Media from './pages/media.vue'
import AI from './pages/ai.vue'
import Review from './pages/review.vue'
import Success from './pages/success.vue'
import Error from './pages/error.vue'
import { i18nPluralizationRulesMap } from './localizationRules/index.ts'

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
              name: 'ai',
              path: '/ai',
              component: AI,
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
          pluralRules: i18nPluralizationRulesMap,
          messages: {
            en,
          },
        })

        setStudioI18nGlobal(i18n.global as StudioI18nGlobal)

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
        convertPropertyToVar(styles),
      ],
    },
  ) as VueElementConstructor

  customElements.define('nuxt-studio', NuxtStudio)
}

export * from './types/index.ts'
export default {}
