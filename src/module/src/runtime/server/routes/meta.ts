import type { ComponentMeta } from 'vue-component-meta'
import { eventHandler, useSession } from 'h3'
import type { RuntimeConfig } from '@nuxt/content'
import { useRuntimeConfig, useAppConfig, createError } from '#imports'
// @ts-expect-error import does exist
import components from '#nuxt-component-meta/nitro'
import { collections, gitInfo, appConfigSchema } from '#content/preview'

interface NuxtComponentMeta {
  pascalName: string
  filePath: string
  meta: ComponentMeta
  global: boolean
}

export default eventHandler(async (event) => {
  const session = await useSession(event, {
    name: 'content-studio-session',
    password: useRuntimeConfig(event).contentStudio?.auth?.sessionSecret,
  })

  if (!session?.data?.user) {
    throw createError({
      statusCode: 404,
      message: 'Not found',
    })
  }

  const mappedComponents = (Object.values(components) as NuxtComponentMeta[])
    .map(({ pascalName, filePath, meta }) => {
      return {
        name: pascalName,
        path: filePath,
        meta: {
          props: meta.props,
          slots: meta.slots,
          events: meta.events,
        },
      }
    })

  const appConfig = useAppConfig()
  const runtimeConfig = useRuntimeConfig()
  const { content } = runtimeConfig
  const { version } = content as RuntimeConfig['content']

  return {
    version,
    gitInfo,
    collections,
    appConfigSchema,
    appConfig,
    components: mappedComponents,
  }
})
