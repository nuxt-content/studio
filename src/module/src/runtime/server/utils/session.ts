import type { H3Event } from 'h3'
import { createError, deleteCookie, setCookie, useSession } from 'h3'
import { defu } from 'defu'
import type { StudioUser, GitProviderType } from 'nuxt-studio/app'
import { useRuntimeConfig } from '#imports'

interface StudioUserSession {
  name: string
  email: string
  providerId?: string
  avatar?: string
}

const requiredUserFields: Array<keyof StudioUser> = ['name', 'email']

export async function setStudioUserSession(event: H3Event, userSession: StudioUserSession) {
  const config = useRuntimeConfig().public
  const provider = config.studio.repository.provider as GitProviderType
  const accessToken
    = provider === 'github'
      ? process.env.STUDIO_GITHUB_TOKEN
      : provider === 'gitlab'
        ? process.env.STUDIO_GITLAB_TOKEN
        : null

  if (!accessToken) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing access token for ${provider} Git provider`,
    })
  }

  await setInternalStudioUserSession(event, {
    ...userSession,
    provider,
    accessToken,
  })
}

export async function setInternalStudioUserSession(event: H3Event, user: StudioUser) {
  const missingFields = requiredUserFields.filter(key => !user[key])

  if (missingFields.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing required Studio user fields: ${missingFields.join(', ')}`,
    })
  }

  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  const payload = defu({
    user: {
      ...user,
    },
  }, session.data)

  await session.update(payload)

  // Set a cookie to indicate that the session is active for the client runtime
  setCookie(event, 'studio-session-check', 'true', { httpOnly: false })

  return {
    ...payload,
    id: session.id!,
  }
}

export async function clearStudioUserSession(event: H3Event) {
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  await session.clear()

  // Delete the cookie to indicate that the session is inactive
  deleteCookie(event, 'studio-session-check')

  return { loggedOut: true }
}
