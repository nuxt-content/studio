import { addServerHandler, addVitePlugin } from '@nuxt/kit'
import { resolve } from 'node:path'
import type { Nuxt } from '@nuxt/schema'
import type { ViteDevServer } from 'vite'
import type { Storage } from 'unstorage'

export function setupDevMode(
  nuxt: Nuxt,
  runtime: (...args: string[]) => string,
  assetsStorage: Storage,
) {
  // Setup Nitro storage for content and public assets
  nuxt.options.nitro.storage = {
    ...nuxt.options.nitro.storage,
    nuxt_studio_content: {
      driver: 'fs',
      base: resolve(nuxt.options.rootDir, 'content'),
    },
    nuxt_studio_public_assets: {
      driver: 'fs',
      base: resolve(nuxt.options.rootDir, 'public'),
    },
  }

  // Add dev server handlers for content
  addServerHandler({
    route: '/__nuxt_studio/dev/content/**',
    handler: runtime('./server/routes/dev/content/[...path]'),
  })

  // Add dev server handlers for public assets
  addServerHandler({
    route: '/__nuxt_studio/dev/public/**',
    handler: runtime('./server/routes/dev/public/[...path]'),
  })

  // Register Vite plugin to watch public assets
  addVitePlugin({
    name: 'nuxt-studio',
    configureServer: (server: ViteDevServer) => {
      assetsStorage.watch((type, file) => {
        server.ws.send({
          type: 'custom',
          event: 'nuxt-studio:media:update',
          data: { type, id: `public-assets/${file}` },
        })
      })
    },
    closeWatcher: () => {
      assetsStorage.unwatch()
    },
  })
}
