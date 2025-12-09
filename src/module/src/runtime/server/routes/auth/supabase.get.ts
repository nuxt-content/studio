import { eventHandler, createError, getQuery, sendRedirect, useSession, getCookie, deleteCookie, setCookie } from 'h3'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'

interface SupabaseUser {
  id: string
  email?: string
  app_metadata?: {
    provider?: string
    [key: string]: unknown
  }
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    name?: string
    [key: string]: unknown
  }
}

export interface SupabaseConfig {
  /**
   * Supabase URL
   * @default process.env.STUDIO_SUPABASE_URL
   */
  url?: string
  /**
   * Supabase Key
   * @default process.env.STUDIO_SUPABASE_KEY
   */
  key?: string
  /**
   * Login URL
   * @default '/login'
   */
  loginUrl?: string
}

export default eventHandler(async (event) => {
  const studioConfig = useRuntimeConfig(event).studio
  const config = defu(studioConfig?.auth?.supabase, {
    url: process.env.STUDIO_SUPABASE_URL,
    key: process.env.STUDIO_SUPABASE_KEY,
    loginUrl: '/login',
  }) as SupabaseConfig

  const query = getQuery<{ access_token?: string, refresh_token?: string }>(event)
  let token = query.access_token

  // If no query token, try to find the cookie
  if (!token && config.url) {
    try {
      const url = new URL(config.url)
      const projectId = url.hostname.split('.')[0]
      const cookieName = `sb-${projectId}-auth-token`
      const cookie = getCookie(event, cookieName)

      if (cookie) {
        let value = cookie
        // Handle Nuxt's default cookie serialization (base64)
        if (value.startsWith('base64-')) {
          value = Buffer.from(value.slice(7), 'base64').toString()
        }
        token = JSON.parse(value).access_token
      }
    }
    catch {
      // ignore error
    }
  }

  if (!config.url || !config.key) {
    throw createError({
      statusCode: 500,
      message: 'Missing Supabase URL or Key',
    })
  }

  // If no token is provided, redirect to the app login page
  if (!token) {
    return sendRedirect(event, config.loginUrl!)
  }

  // Verify the token with Supabase
  const user = await $fetch<SupabaseUser>(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => {
    // If verification fails, redirect to login
    return null
  })

  if (!user) {
    return sendRedirect(event, config.loginUrl!)
  }

  // Verify Repository Token
  const provider = studioConfig?.repository?.provider || 'github'
  if (provider === 'github' && !process.env.STUDIO_GITHUB_TOKEN) {
    throw createError({
      statusCode: 500,
      message: '`STUDIO_GITHUB_TOKEN` is not set. Supabase authenticated users cannot push changes to the repository without a valid GitHub token.',
    })
  }
  if (provider === 'gitlab' && !process.env.STUDIO_GITLAB_TOKEN) {
    throw createError({
      statusCode: 500,
      message: '`STUDIO_GITLAB_TOKEN` is not set. Supabase authenticated users cannot push changes to the repository without a valid GitLab token.',
    })
  }

  const repositoryToken = provider === 'github'
    ? process.env.STUDIO_GITHUB_TOKEN
    : process.env.STUDIO_GITLAB_TOKEN

  // Success: Create Session
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  await session.update(defu({
    user: {
      contentUser: true,
      providerId: user.id,
      accessToken: repositoryToken,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Supabase User',
      avatar: user.user_metadata?.avatar_url || '',
      email: user.email || '',
      provider: 'supabase',
    },
  }, session.data))

  const redirect = decodeURIComponent(getCookie(event, 'studio-redirect') || '')
  deleteCookie(event, 'studio-redirect')

  // Set a cookie to indicate that the session is active
  setCookie(event, 'studio-session-check', 'true', { httpOnly: false })

  // make sure the redirect is a valid relative path (avoid also // which is not a valid URL)
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return sendRedirect(event, redirect)
  }

  return sendRedirect(event, '/')
})
