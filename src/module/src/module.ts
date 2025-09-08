import { defineNuxtModule, createResolver, addPlugin, extendViteConfig, useLogger, extendPages, addServerHandler } from '@nuxt/kit'
import { createHash } from 'crypto'
import { defu } from 'defu'

interface ModuleOptions {
  auth?: {
    github?: {
      clientId: string
      clientSecret: string
    }
  }
}

const logger = useLogger('nuxt-studio')
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-studio',
    configKey: 'contentStudio',
    defaults: {}
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = (...args: string[]) => resolver.resolve('./runtime', ...args)  
    options = defu(options, {
      auth: {
        github: {
          clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
          clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET
        },
      }
    }) as ModuleOptions

    if (!nuxt.options.dev) {
      if (!options.auth?.github?.clientId && !options.auth?.github?.clientSecret) {
        logger.warn([
          'Nuxt Content Studio relies on GitHub OAuth to authenticate users.',
          'Please set the `STUDIO_GITHUB_CLIENT_ID` and `STUDIO_GITHUB_CLIENT_SECRET` environment variables.',
        ].join(' '))
      }
    }

    nuxt.options.runtimeConfig.public.contentStudio = {
      studioDevServer: process.env.STUDIO_DEV_SERVER,
    }
    nuxt.options.runtimeConfig.contentStudio = {
      auth: {
        sessionSecret: createHash('md5').update([
          options.auth?.github?.clientId,
          options.auth?.github?.clientSecret,
        ].join('')).digest('hex'),
        github: options.auth?.github,
      }
    }

    addPlugin(process.env.STUDIO_DEV_SERVER 
      ? runtime('./plugins/studio.client.dev') 
      : runtime('./plugins/studio.client'))

    
    nuxt.options.vite = defu(nuxt.options.vite, {
      vue: {
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => {
              return tag === 'nuxt-studio'
            },
          },
        },
      },
    })
    extendViteConfig((config) => {
      config.optimizeDeps ||= {}
      config.optimizeDeps.include = [
        ...(config.optimizeDeps.include || []),
        'debug',
        'extend',
      ]
    })

    addServerHandler({
      route: '/__nuxt_content/studio/auth/github',
      handler: runtime('./server/routes/auth/github.get.ts'),
    })
    addServerHandler({
      route: '/__nuxt_content/studio/auth/session',
      handler: runtime('./server/routes/auth/session.get.ts'),
    })
    // addServerHandler({
    //   route: '/__nuxt_content/studio/auth/google',
    //   handler: runtime('./server/routes/auth/google.get.ts'),
    // })
    // TODO: refactor to a server handler
    extendPages((pages) => {
      pages.push({
        path: '/__nuxt_content/studio',
        file: runtime('./pages/admin.vue'),
      })
    })
  },
})
