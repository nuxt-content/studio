import { eventHandler, useSession, deleteCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

export default eventHandler(async (event) => {
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  await session.clear()

  // Delete the cookie to indicate that the session is inactive
  deleteCookie(event, 'studio-session-check')

  return { loggedOut: true }
})
