import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import type { Repository, UseStudioHost } from 'nuxt-studio/app'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineNuxtPlugin(() => {
  // Don't await this to avoid blocking the main thread
  defineStudioActivationPlugin(async (user) => {
    const config = useRuntimeConfig()
    // Initialize host
    const host = await import(config.public.studio.dev ? '../host.dev' : '../host').then(m => m.useStudioHost);
    (window as unknown as { useStudioHost: UseStudioHost }).useStudioHost = () => host(user, config.public.studio.repository as unknown as Repository)

    await import('nuxt-studio/app')
    document.body.appendChild(document.createElement('nuxt-studio'))
  })
})
