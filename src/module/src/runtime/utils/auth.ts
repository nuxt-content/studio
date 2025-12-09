import { getRandomValues } from 'uncrypto'
import { getCookie, deleteCookie, setCookie, type H3Event, getRequestURL, createError } from 'h3'
import { FetchError } from 'ofetch'

export interface RequestAccessTokenResponse {
  access_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
  error_uri?: string
}

export interface RequestAccessTokenOptions {
  headers?: Record<string, string>
  body?: Record<string, string>
  params?: Record<string, string>
}

export async function requestAccessToken(url: string, options: RequestAccessTokenOptions): Promise<RequestAccessTokenResponse> {
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

export async function generateOAuthState(event: H3Event) {
  const newState = getRandomBytes(32)

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

export function validateOAuthState(event: H3Event, receivedState: string) {
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

  if (receivedState !== storedState) {
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
}

function getRandomBytes(size: number = 32) {
  return encodeBase64Url(getRandomValues(new Uint8Array(size)))
}

function encodeBase64Url(input: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}
