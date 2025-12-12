import { eventHandler, useSession, deleteCookie, getCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

export default eventHandler(async (event) => {
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  // Sync Supabase Logout:
  // If the user is logged in via Supabase, check if the Supabase Auth cookie exists.
  // If missing (user logged out from app), clear the Studio session.
  if (session.data?.user?.provider === 'supabase') {
    const config = useRuntimeConfig(event).studio?.auth?.supabase || {}
    const supabaseUrl = config.url || process.env.STUDIO_SUPABASE_URL

    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl)
        const projectId = url.hostname.split('.')[0]
        const cookieName = `sb-${projectId}-auth-token`
        const supabaseCookie = getCookie(event, cookieName)

        if (!supabaseCookie) {
          await session.clear()
          deleteCookie(event, 'studio-session-check')
          return { user: null }
        }
      }
      catch {
        // ignore invalid url
      }
    }
  }

  if (!session.data || Object.keys(session.data).length === 0) {
    // Delete the cookie to indicate that the session is inactive
    deleteCookie(event, 'studio-session-check')
  }

  return {
    ...session.data,
    id: session.id!,
  }
})
