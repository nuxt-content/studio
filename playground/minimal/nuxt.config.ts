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
  studio: {
    repository: {
      provider: 'github',
      owner: 'nuxt-content',
      repo: 'studio',
      branch: 'main',
      rootDir: 'playground/minimal/content',
      private: false,
    },
  },
})
