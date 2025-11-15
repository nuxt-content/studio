import { FetchError } from 'ofetch'
import { getRandomValues } from 'uncrypto'
import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError, getRequestURL, setCookie, deleteCookie, getCookie, useSession } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import type { UserSchema } from '@gitbeaker/core'
import { useRuntimeConfig } from '#imports'

export interface OAuthGitLabConfig {
  /**
   * GitLab OAuth Application ID
   * @default process.env.STUDIO_GITLAB_APPLICATION_ID
   */
  applicationId?: string
  /**
   * GitLab OAuth Application Secret
   * @default process.env.STUDIO_GITLAB_APPLICATION_SECRET
   */
  applicationSecret?: string
  /**
   * GitLab OAuth Scope
   * @default []
   * @see https://docs.gitlab.com/ee/integration/oauth_provider.html#authorized-applications
   */
  scope?: string[]
  /**
   * Require email from user
   * @default false
   */
  emailRequired?: boolean

  /**
   * GitLab instance URL
   * @default 'https://gitlab.com'
   */
  instanceUrl?: string

  /**
   * GitLab OAuth Authorization URL
   * @default '{instanceUrl}/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * GitLab OAuth Token URL
   * @default '{instanceUrl}/oauth/token'
   */
  tokenURL?: string

  /**
   * GitLab API URL
   * @default '{instanceUrl}/api/v4'
   */
  apiURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to allow overriding for situations like prod failing to determine public hostname
   * Use `process.env.STUDIO_GITLAB_REDIRECT_URL` to overwrite the default redirect URL.
   * @default is ${hostname}/__nuxt_studio/auth/gitlab
   */
  redirectURL?: string
}

interface RequestAccessTokenResponse {
  access_token?: string
  token_type?: string
  refresh_token?: string
  expires_in?: number
  created_at?: number
  error?: string
  error_description?: string
}

interface RequestAccessTokenOptions {
  body?: Record<string, string>
  params?: Record<string, string>
}

export default eventHandler(async (event: H3Event) => {
  const studioConfig = useRuntimeConfig(event).studio
  const instanceUrl = studioConfig?.auth?.gitlab?.instanceUrl || 'https://gitlab.com'

  const config = defu(studioConfig?.auth?.gitlab, {
    applicationId: process.env.STUDIO_GITLAB_APPLICATION_ID,
    applicationSecret: process.env.STUDIO_GITLAB_APPLICATION_SECRET,
    redirectURL: process.env.STUDIO_GITLAB_REDIRECT_URL,
    instanceUrl,
    authorizationURL: `${instanceUrl}/oauth/authorize`,
    tokenURL: `${instanceUrl}/oauth/token`,
    apiURL: `${instanceUrl}/api/v4`,
    authorizationParams: {},
    emailRequired: true,
  }) as OAuthGitLabConfig

  const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

  if (query.error) {
    throw createError({
      statusCode: 401,
      message: `GitLab login failed: ${query.error || 'Unknown error'}`,
      data: query,
    })
  }

  if (!config.applicationId || !config.applicationSecret) {
    throw createError({
      statusCode: 500,
      message: 'Missing GitLab application ID or secret',
      data: config,
    })
  }

  const requestURL = getRequestURL(event)

  config.redirectURL = config.redirectURL || `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`

  if (!query.code) {
    // Initial authorization request (generate and store state)
    const state = await generateState(event)

    config.scope = config.scope || []
    if (!config.scope.includes('api')) {
      config.scope.push('api')
    }

    return sendRedirect(
      event,
      withQuery(config.authorizationURL as string, {
        client_id: config.applicationId,
        redirect_uri: config.redirectURL,
        response_type: 'code',
        scope: config.scope.join(' '),
        state,
        ...config.authorizationParams,
      }),
    )
  }

  // Callback with code (validate and consume state)
  const storedState = getCookie(event, 'studio-oauth-state')

  if (!storedState) {
    throw createError({
      statusCode: 400,
      message: 'OAuth state cookie not found. Please try logging in again.',
      data: {
        hint: 'State cookie may have expired or been cleared',
      },
    })
  }

  if (query.state !== storedState) {
    throw createError({
      statusCode: 400,
      message: 'Invalid state - OAuth state mismatch',
      data: {
        hint: 'This may be caused by browser refresh, navigation, or expired session',
      },
    })
  }

  // State validated, delete the cookie
  deleteCookie(event, 'studio-oauth-state')

  const token = await requestAccessToken(config.tokenURL as string, {
    body: {
      grant_type: 'authorization_code',
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      redirect_uri: config.redirectURL,
      code: query.code,
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

  const user: UserSchema = await $fetch(`${config.apiURL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!user.email && config.emailRequired) {
    throw createError({
      statusCode: 500,
      message: 'Could not get GitLab user email',
      data: token,
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
      providerId: user.id.toString(),
      accessToken: token.access_token,
      name: user.name || user.username,
      avatar: user.avatar_url,
      email: user.email,
      provider: 'gitlab',
    },
  }, session.data))

  const redirect = decodeURIComponent(getCookie(event, 'studio-redirect') || '/')
  deleteCookie(event, 'studio-redirect')

  // Set a cookie to indicate that the session is active
  setCookie(event, 'studio-session-check', 'true', { httpOnly: false })

  // make sure the redirect is a valid relative path (avoid also // which is not a valid URL)
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return sendRedirect(event, redirect)
  }

  return sendRedirect(event, '/')
})

async function requestAccessToken(url: string, options: RequestAccessTokenOptions): Promise<RequestAccessTokenResponse> {
  try {
    return await $fetch<RequestAccessTokenResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body,
      params: options.params,
    })
  }
  catch (error) {
    if (error instanceof FetchError) {
      return error.data || { error: error.message }
    }
    return { error: 'Unknown error' }
  }
}

async function generateState(event: H3Event) {
  const newState = Array.from(getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const requestURL = getRequestURL(event)
  // Use secure cookies over HTTPS, required for locally testing purposes
  const isSecure = requestURL.protocol === 'https:'

  setCookie(event, 'studio-oauth-state', newState, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
  })

  return newState
}
