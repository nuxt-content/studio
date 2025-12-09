import { getAppManifest, useState, useRuntimeConfig, useCookie, watch } from '#imports'
import type { StudioUser } from 'nuxt-studio/app'

export async function defineStudioActivationPlugin(
  onStudioActivation: (user: StudioUser) => Promise<void>,
  onStudioDeactivation: () => Promise<void>,
) {
  const user = useState<StudioUser | null>('studio-session', () => null)
  const config = useRuntimeConfig().public.studio
  const cookie = useCookie('studio-session-check')

  // Dev mode: always active
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

  // Helper to fetch session and activate
  const tryActivate = async () => {
    if (user.value) return // Already active

    try {
      const session = await $fetch<{ user: StudioUser }>('/__nuxt_studio/auth/session')
      if (session?.user) {
        user.value = session.user

        // Disable prerendering for Studio
        const manifest = await getAppManifest()
        manifest.prerendered = []

        await onStudioActivation(user.value)
      }
    }
    catch {
      // Session invalid
      user.value = null
    }
  }

  // Initial check
  if (String(cookie.value) === 'true') {
    await tryActivate()
  }

  // Watch for cookie changes (Reactive Logout)
  watch(cookie, async (newValue) => {
    if (String(newValue) !== 'true') {
      // Logout detected
      user.value = null
      await onStudioDeactivation()
    }
    else {
      // Login detected (optional, e.g. if logging in via modal without refresh)
      await tryActivate()
    }
  })

  // Keyboard shortcut listener (CMD/CTRL + .)
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '.') {
        // If not logged in, redirect to login
        if (!user.value) {
          setTimeout(() => {
            window.location.href = config.route + '?redirect=' + encodeURIComponent(window.location.pathname)
          })
        }
      }
    })
  }
}
