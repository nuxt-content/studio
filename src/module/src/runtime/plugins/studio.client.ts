import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import type { Repository } from 'nuxt-studio/app'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineNuxtPlugin(async () => {
  await defineStudioActivationPlugin(async (user) => {
    const config = useRuntimeConfig()
    // Initialize host
    const host = await import('../host').then(m => m.useStudioHost)
    window.useStudioHost = () => host(user, config.public.contentStudio.repository as unknown as Repository)

    await import('nuxt-studio/app')
    document.body.appendChild(document.createElement('nuxt-studio'))
  })
})
