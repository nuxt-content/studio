import { getAppManifest, useState, useRuntimeConfig, useCookie } from '#imports'
import type { StudioUser } from 'nuxt-studio/app'

export async function defineStudioActivationPlugin(onStudioActivation: (user: StudioUser) => Promise<void>) {
  const user = useState<StudioUser | null>('studio-session', () => null)
  const config = useRuntimeConfig().public.studio
  const cookie = useCookie('studio-session-check')

  if (config.dev) {
    return await onStudioActivation({
      provider: 'github',
      email: 'dev@nuxt.com',
      name: 'Dev',
      accessToken: '',
      providerId: '',
      avatar: '',
    })
  }

  user.value = String(cookie.value) === 'true'
    ? await $fetch<{ user: StudioUser }>('/__nuxt_studio/auth/session').then(session => session?.user ?? null)
    : null

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
        setTimeout(() => {
          window.location.href = config.route + '?redirect=' + encodeURIComponent(window.location.pathname)
        })
      }
    })
  }
}
