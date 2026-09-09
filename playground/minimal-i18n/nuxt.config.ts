export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    'nuxt-studio',
    '@nuxtjs/i18n',
  ],
  devtools: { enabled: true },
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },
  compatibilityDate: '2025-08-26',
  i18n: {
    locales: [
      { code: 'en', name: 'English', language: 'en-US' },
      { code: 'fr', name: 'Français', language: 'fr-FR' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
  },
  studio: {
    repository: {
      provider: 'github',
      owner: 'nuxt-content',
      repo: 'studio',
      branch: 'main',
      rootDir: 'playground/minimal-i18n',
      private: false,
    },
  },
})
