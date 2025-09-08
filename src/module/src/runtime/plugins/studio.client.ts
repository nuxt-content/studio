import { ContentStudioUser } from 'nuxt-studio/app'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineStudioActivationPlugin(async (_user: ContentStudioUser) => {
  await import('nuxt-studio/app')
  document.body.appendChild(document.createElement('nuxt-studio'))
})
