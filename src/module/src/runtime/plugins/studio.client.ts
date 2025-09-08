import { defineStudioActivationPlugin } from '../utils/activation'

export default defineStudioActivationPlugin(async () => {
  await import('nuxt-studio/app')
  document.body.appendChild(document.createElement('nuxt-studio'))
})
