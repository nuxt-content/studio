import { defineNuxtPlugin } from '#imports'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineNuxtPlugin(async () => {
  await defineStudioActivationPlugin(async (user) => {
    // Initialize host
    const host = await import('../host').then(m => m.useStudioHost)
    window.useStudioHost = () => host(user)

    await import('nuxt-studio/app')
    document.body.appendChild(document.createElement('nuxt-studio'))
  })
})
