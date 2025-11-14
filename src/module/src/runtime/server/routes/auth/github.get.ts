import { FetchError } from 'ofetch'
import { getRandomValues } from 'uncrypto'
import type { H3Event } from 'h3'
import { eventHandler, getQuery, sendRedirect, createError, getRequestURL, setCookie, deleteCookie, getCookie, useSession } from 'h3'
import { withQuery } from 'ufo'
import { defu } from 'defu'
import type { Endpoints } from '@octokit/types'
import { useRuntimeConfig } from '#imports'

export interface OAuthGitHubConfig {
  /**
   * GitHub OAuth Client ID
   * @default process.env.STUDIO_GITHUB_CLIENT_ID
   */
  clientId?: string
  /**
   * GitHub OAuth Client Secret
   * @default process.env.STUDIO_GITHUB_CLIENT_SECRET
   */
  clientSecret?: string
  /**
   * GitHub OAuth Scope
   * @default []
   * @see https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps
   * @example ['user:email']
   */
  scope?: string[]
  /**
   * Require email from user, adds the ['user:email'] scope if not present
   * @default false
   */
  emailRequired?: boolean

  /**
   * GitHub OAuth Authorization URL
   * @default 'https://github.com/login/oauth/authorize'
   */
  authorizationURL?: string

  /**
   * GitHub OAuth Token URL
   * @default 'https://github.com/login/oauth/access_token'
   */
  tokenURL?: string

  /**
   * GitHub API URL
   * @default 'https://api.github.com'
   */
  apiURL?: string

  /**
   * Extra authorization parameters to provide to the authorization URL
   * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
   * @example { allow_signup: 'true' }
   */
  authorizationParams?: Record<string, string>

  /**
   * Redirect URL to to allow overriding for situations like prod failing to determine public hostname
   * Use `process.env.STUDIO_GITHUB_REDIRECT_URL` to overwrite the default redirect URL.
   * @default is ${hostname}/__nuxt_studio/auth/github
   */
  redirectURL?: string
}

interface RequestAccessTokenResponse {
  access_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
  error_uri?: string
}

interface RequestAccessTokenOptions {
  headers?: Record<string, string>
  body?: Record<string, string>
  params?: Record<string, string>
}

export default eventHandler(async (event: H3Event) => {
  const studioConfig = useRuntimeConfig(event).studio
  const config = defu(studioConfig?.auth?.github, {
    clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
    clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET,
    redirectURL: process.env.STUDIO_GITHUB_REDIRECT_URL,
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    apiURL: 'https://api.github.com',
    authorizationParams: {},
    emailRequired: true,
  }) as OAuthGitHubConfig

  const query = getQuery<{ code?: string, error?: string, state?: string }>(event)

  if (query.error) {
    throw createError({
      statusCode: 401,
      message: `GitHub login failed: ${query.error || 'Unknown error'}`,
      data: query,
    })
  }

  if (!config.clientId || !config.clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'Missing GitHub client ID or secret',
      data: config,
    })
  }

  const requestURL = getRequestURL(event)

  config.redirectURL = config.redirectURL || `${requestURL.protocol}//${requestURL.host}${requestURL.pathname}`

  const state = await handleState(event)

  if (!query.code) {
    config.scope = config.scope || []
    if (config.emailRequired && !config.scope.includes('user:email')) {
      config.scope.push('user:email')
    }
    if (config.emailRequired && !config.scope.includes('repo') && !config.scope.includes('public_repo')) {
      config.scope.push(studioConfig.repository.private ? 'repo' : 'public_repo')
    }

    return sendRedirect(
      event,
      withQuery(config.authorizationURL as string, {
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
      client_id: config.clientId,
      client_secret: config.clientSecret,
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

  const user: Endpoints['GET /user']['response']['data'] = await $fetch(`${config.apiURL}/user`, {
    headers: {
      'User-Agent': `Github-OAuth-${config.clientId}`,
      'Authorization': `token ${accessToken}`,
    },
  })

  // if no public email, check the private ones
  if (!user.email && config.emailRequired) {
    const emails: Endpoints['GET /user/emails']['response']['data'] = await $fetch(`${config.apiURL}/user/emails`, {
      headers: {
        'User-Agent': `Github-OAuth-${config.clientId}`,
        'Authorization': `token ${accessToken}`,
      },
    })
    const primaryEmail = emails.find((email: { primary: boolean }) => email.primary)
    // Still no email
    if (!primaryEmail) {
      throw createError({
        statusCode: 500,
        message: 'Could not get GitHub user email',
        data: token,
      })
    }
    user.email = primaryEmail.email
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
      name: user.name || user.login,
      avatar: user.avatar_url,
      email: user.email,
      provider: 'github',
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

async function requestAccessToken(url: string, options: RequestAccessTokenOptions): Promise<RequestAccessTokenResponse> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...options.headers,
  }

  // Encode the body as a URLSearchParams if the content type is 'application/x-www-form-urlencoded'.
  const body = headers['Content-Type'] === 'application/x-www-form-urlencoded'
    ? new URLSearchParams(options.body || options.params || {},
      ).toString()
    : options.body

  return $fetch<RequestAccessTokenResponse>(url, {
    method: 'POST',
    headers,
    body,
  }).catch((error) => {
    /**
     * For a better error handling, only unauthorized errors are intercepted, and other errors are re-thrown.
     */
    if (error instanceof FetchError && error.status === 401) {
      return error.data
    }
    throw error
  })
}

async function handleState(event: H3Event) {
  let state = getCookie(event, 'nuxt-auth-state')
  if (state) {
    deleteCookie(event, 'nuxt-auth-state')
    return state
  }

  state = encodeBase64Url(getRandomBytes(8))
  setCookie(event, 'nuxt-auth-state', state)
  return state
}

function encodeBase64Url(input: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function getRandomBytes(size: number = 32) {
  return getRandomValues(new Uint8Array(size))
}
