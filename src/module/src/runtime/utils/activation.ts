import { getAppManifest, useState, useRuntimeConfig } from '#imports'
import type { StudioUser } from 'nuxt-studio/app'

export async function defineStudioActivationPlugin(onStudioActivation: (user: StudioUser) => Promise<void>) {
  const user = useState<StudioUser | null>('studio-session', () => null)
  const config = useRuntimeConfig().public.studio

  if (config.dev) {
    return await onStudioActivation({
      provider: 'github',
      email: 'dev@nuxt.com',
      name: 'Dev',
      githubToken: '',
      githubId: '',
      avatar: '',
    })
  }

  await $fetch<{ user: StudioUser }>('/__nuxt_studio/auth/session').then((session) => {
    user.value = session?.user ?? null
  })

  let mounted = false
  if (user.value?.email) {
    // Disable prerendering for Studio
    const manifest = await getAppManifest()
    manifest.prerendered = []

    await onStudioActivation(user.value!)
    mounted = true
  }
  else if (mounted) {
    window.location.reload()
  }
  else {
    // Listen to CMD + . to toggle the studio or redirect to the login page
    document.addEventListener('keydown', (event) => {
      if (event.metaKey && event.key === '.') {
        window.location.href = config.route + '?redirect=' + encodeURIComponent(window.location.pathname)
      }
    })
  }
}
