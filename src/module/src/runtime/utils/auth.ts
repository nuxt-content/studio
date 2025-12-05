import { getRandomValues } from 'uncrypto'
import { getCookie, deleteCookie, setCookie, type H3Event } from 'h3'
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

export async function handleState(event: H3Event) {
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
