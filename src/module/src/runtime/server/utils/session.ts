import type { H3Event } from 'h3'
import { createError, deleteCookie, setCookie, useSession } from 'h3'
import { defu } from 'defu'
import type { StudioUser } from 'nuxt-studio/app'
import { useRuntimeConfig } from '#imports'

const requiredUserFields: Array<keyof StudioUser> = ['providerId', 'accessToken', 'name', 'email', 'provider']

export async function setStudioUserSession(event: H3Event, user: StudioUser) {
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
