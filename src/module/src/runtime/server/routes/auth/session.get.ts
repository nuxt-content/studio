import { eventHandler, useSession, deleteCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

export default eventHandler(async (event) => {
  const session = await useSession(event, {
    name: 'studio-session',
    password: useRuntimeConfig(event).studio?.auth?.sessionSecret,
  })

  if (!session.data || Object.keys(session.data).length === 0) {
    // Delete the cookie to indicate that the session is inactive
    deleteCookie(event, 'studio-session-check')
  }

  return {
    ...session.data,
    id: session.id!,
  }
})
