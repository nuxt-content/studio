import { defineNuxtModule, createResolver, addPlugin, extendViteConfig, installModule, extendPages, addServerHandler } from '@nuxt/kit'
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-studio',
    configKey: 'contentStudio',
    defaults: {
      auth: {
        github: {
          clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
          clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET
        },
      }
    }
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = (...args: string[]) => resolver.resolve('./runtime', ...args)

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
