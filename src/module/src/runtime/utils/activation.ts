import { getAppManifest, useState, defineNuxtPlugin } from '#imports'
import type { ContentStudioUser } from 'nuxt-studio/app'

export function defineStudioActivationPlugin(onStudioActivation: () => Promise<void>) {
  return defineNuxtPlugin(async () => {
    const user = useState<ContentStudioUser | null>('content-studio-session', () => null)

    await $fetch<{ user: ContentStudioUser }>('/__nuxt_content/studio/auth/session').then((session) => {
      user.value = session?.user ?? null
    })

    let mounted = false
    if (user.value?.email) {
      // Initialize host
      const host = await import('../host').then(m => m.useStudioHost)
      window.useStudioHost = () => host(user.value)

      // Disable prerendering for Studio
      const manifest = await getAppManifest()
      manifest.prerendered = []

      await onStudioActivation()
      mounted = true
    }
    else if (mounted) {
      window.location.reload()
    }
  })
}