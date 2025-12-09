import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { defineStudioActivationPlugin } from '../utils/activation'
import type { Repository, UseStudioHost } from 'nuxt-studio/app'

export default defineNuxtPlugin(() => {
  defineStudioActivationPlugin(
    // ON ACTIVATION (Mount)
    async (user) => {
      const config = useRuntimeConfig()
      console.log(`
    ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗     ██████╗ ███████╗██╗   ██╗
    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗    ██╔══██╗██╔════╝██║   ██║
    ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║    ██║  ██║█████╗  ██║   ██║
    ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║    ██║  ██║██╔══╝  ╚██╗ ██╔╝
    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝    ██████╔╝███████╗ ╚████╔╝
    ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝     ╚═════╝ ╚══════╝  ╚═══╝
    `)

      // Initialize host
      const host = await import('../host.dev').then(m => m.useStudioHost);
      (window as unknown as { useStudioHost: UseStudioHost }).useStudioHost = () => host(user, config.public.studio.repository as unknown as Repository)

      const el = document.createElement('script')
      el.src = `${config.public.studio?.development?.server}/src/main.ts`
      el.type = 'module'
      document.body.appendChild(el)

      const wp = document.createElement('nuxt-studio')
      document.body.appendChild(wp)
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
