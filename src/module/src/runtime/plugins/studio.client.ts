import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import type { Repository, UseStudioHost } from 'nuxt-studio/app'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineNuxtPlugin(() => {
  // Don't await this to avoid blocking the main thread
  defineStudioActivationPlugin(
    // ON ACTIVATION (Mount)
    async (user) => {
      const config = useRuntimeConfig()

      // Initialize host
      const host = await import(config.public.studio.dev ? '../host.dev' : '../host').then(m => m.useStudioHost);

      // Assign global host factory
      (window as unknown as { useStudioHost: UseStudioHost }).useStudioHost = () =>
        host(user, config.public.studio.repository as unknown as Repository)

      // Load and append the Studio web component
      await import('nuxt-studio/app')

      // Ensure we don't duplicate it
      if (!document.querySelector('nuxt-studio')) {
        document.body.appendChild(document.createElement('nuxt-studio'))
      }
    },
    // ON DEACTIVATION (Unmount)
    async () => {
      // Remove the web component
      const el = document.querySelector('nuxt-studio')
      if (el) {
        el.remove()
      }

      // Clean up body attributes set by the host
      document.body.removeAttribute('data-studio-active')
      document.body.removeAttribute('data-expand-sidebar')

      // Clean up injected styles
      const style = document.querySelector('[data-studio-style]')
      if (style) {
        style.remove()
      }
    },
  )
})
