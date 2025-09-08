import { eventHandler, useSession } from 'h3'
import { useRuntimeConfig } from '#imports'

export default eventHandler(async (event) => {
  const session = await useSession(event, {
    name: 'content-studio-session',
    password: useRuntimeConfig(event).contentStudio?.auth?.sessionSecret,
  })

  return {
    ...session.data,
    id: session.id!,
  }
})