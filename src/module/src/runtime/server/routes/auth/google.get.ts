import { eventHandler, createError, getQuery, sendRedirect, useSession, getRequestURL, getCookie, deleteCookie, setCookie, type H3Event } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import { useRuntimeConfig } from '#imports'
import { handleState, requestAccessToken } from '../../../utils/auth'

export interface GoogleUser {
  sub: string
  name: string
  given_name: string
  family_name: string
  picture: string
  email: string
}

export interface OAuthGoogleConfig {
  /**
   * Google OAuth Client ID
   * @default process.env.STUDIO_GOOGLE_CLIENT_ID
   */
  clientId?: string
  /**
   * Google OAuth Client Secret
   * @default process.env.STUDIO_GOOGLE_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * Google OAuth Scope
   * @default ['email', 'profile']
   * @see https://developers.google.com/identity/protocols/oauth2/scopes
   */
  scope?: string[]
  /**
   * Require email from user
   * @default false
   */
  emailRequired?: boolean

  /**
   * Google OAuth Authorization URL
   * @default 'https://accounts.google.com/o/oauth2/v2/auth'
   */
  authorizationURL?: string

  /**
   * Google OAuth Token URL
   * @default 'https://oauth2.googleapis.com/token'
   */
  tokenURL?: string

  /**
   * Google User Info URL
   * @default 'https://www.googleapis.com/oauth2/v3/userinfo'
   */
  userURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
   * @example { access_type: 'offline', prompt: 'consent' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * Use `process.env.STUDIO_GOOGLE_REDIRECT_URL` to overwrite the default redirect URL.
   * @default is ${hostname}/__nuxt_studio/auth/google
   */
  redirectURL?: string
}

export default eventHandler(async (event: H3Event) => {
  const studioConfig = useRuntimeConfig(event).studio
  const config = defu(studioConfig?.auth?.google, {
    clientId: process.env.STUDIO_GOOGLE_CLIENT_ID,
    clientSecret: process.env.STUDIO_GOOGLE_CLIENT_SECRET,
    redirectURL: process.env.STUDIO_GOOGLE_REDIRECT_URL,
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    authorizationParams: {},
    emailRequired: true,
  }) as OAuthGoogleConfig

  const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

  if (query.error) {
    throw createError({
      statusCode: 401,
      message: `Google login failed: ${query.error || 'Unknown error'}`,
      data: query,
    })
  }

  if (!config.clientId || !config.clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'Missing Google client ID or secret',
      data: config,
    })
  }

  // Automatically redirect to the configured provider's OAuth endpoint
  const provider = studioConfig?.repository?.provider || 'github'
  if (provider === 'github' && !process.env.STUDIO_GITHUB_TOKEN) {
    throw createError({
      statusCode: 500,
      message: '`STUDIO_GITHUB_TOKEN` is not set. Google authenticated users cannot push changes to the repository without a valid GitHub token.',
    })
  }
  if (provider === 'gitlab' && !process.env.STUDIO_GITLAB_TOKEN) {
    throw createError({
      statusCode: 500,
      message: '`STUDIO_GITLAB_TOKEN` is not set. Google authenticated users cannot push changes to the repository without a valid GitLab token.',
    })
  }

  const repositoryToken = provider === 'github'
    ? process.env.STUDIO_GITHUB_TOKEN
    : process.env.STUDIO_GITLAB_TOKEN

  const requestURL = getRequestURL(event)

  config.redirectURL = config.redirectURL || `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`

  const state = await handleState(event)

  if (!query.code) {
    config.scope = config.scope || ['email', 'profile']
    // Redirect to Google OAuth page
    return sendRedirect(
      event,
      withQuery(config.authorizationURL as string, {
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectURL,
        scope: config.scope.join(' '),
        state,
        ...config.authorizationParams,
      }),
    )
  }

  if (query.state !== state) {
    throw createError({
      statusCode: 500,
      message: 'Invalid state',
      data: {
        query,
        state,
      },
    })
  }

  const token = await requestAccessToken(config.tokenURL as string, {
    body: {
      grant_type: 'authorization_code',
      code: query.code as string,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectURL,
    },
  })

  if (token.error || !token.access_token) {
    throw createError({
      statusCode: 500,
      message: 'Failed to get access token',
      data: token,
    })
  }

  const accessToken = token.access_token
  const user = await $fetch<GoogleUser>(
    config.userURL as string,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  // if no public email, check the private ones
  if (!user.email && config.emailRequired) {
    throw createError({
      statusCode: 500,
      message: 'Could not get Google user email',
      data: user,
    })
  }

  const moderators = process.env.STUDIO_GOOGLE_MODERATORS?.split(',') || []

  if (!moderators.includes(user.email)) {
    if (import.meta.dev && moderators.length === 0) {
      console.warn([
        '[Nuxt Studio] No moderators defined. Moderators are required for Google authentication.',
        'Please set the `STUDIO_GOOGLE_MODERATORS` environment variable to a comma-separated list of email addresses of the moderators.',
      ].join('\n'))
    }

    throw createError({
      statusCode: 403,
      message: 'You are not authorized to access the studio',
    })
  }

  // Success
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  await session.update(defu({
    user: {
      contentUser: true,
      providerId: String(user.sub).toString(),
      accessToken: repositoryToken,
      name: user.name || `${user.given_name || ''} ${user.family_name || ''}`.trim(),
      avatar: user.picture,
      email: user.email,
      provider: 'google',
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
