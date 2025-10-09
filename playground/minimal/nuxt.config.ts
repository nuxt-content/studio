export default defineNuxtConfig({
  modules: [
    'nuxt-studio',
    '@nuxt/content',
  ],
  devtools: { enabled: true },
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },
  compatibilityDate: '2025-08-26',
})
