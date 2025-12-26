import { defineNuxtModule, createResolver, addPlugin, extendViteConfig, addServerHandler, addTemplate, addServerImports } from '@nuxt/kit'
import { createHash } from 'node:crypto'
import { defu } from 'defu'
import { resolve } from 'node:path'
import fsDriver from 'unstorage/drivers/fs'
import { createStorage } from 'unstorage'
import { getAssetsStorageDevTemplate, getAssetsStorageTemplate } from './templates'
import { version } from '../../../package.json'
import { setupDevMode } from './dev'
import { validateAuthConfig } from './auth'

interface BaseRepository {
  /**
   * The owner of the git repository.
   */
  owner: string
  /**
   * The repository name.
   */
  repo: string
  /**
   * The branch to use for the git repository.
   * @default 'main'
   */
  branch?: string
  /**
   * The root directory to use for the git repository.
   * @default ''
   */
  rootDir?: string
  /**
   * Whether the repository is private or public.
   * If set to false, the 'public_repo' scope will be used instead of the 'repo' scope.
   * @default true
   */
  private?: boolean
}

interface GitHubRepository extends BaseRepository {
  provider: 'github'
}

interface GitLabRepository extends BaseRepository {
  provider: 'gitlab'
  instanceUrl?: string
}

export interface ModuleOptions {
  /**
   * The route to access the studio login page.
   * @default '/_studio'
   */
  route?: string

  /**
   * The authentication settings for studio.
   */
  auth?: {
    /**
     * The GitHub OAuth credentials.
     */
    github?: {
      /**
       * The GitHub OAuth client ID.
       * @default process.env.STUDIO_GITHUB_CLIENT_ID
       */
      clientId?: string
      /**
       * The GitHub OAuth client secret.
       * @default process.env.STUDIO_GITHUB_CLIENT_SECRET
       */
      clientSecret?: string
    }
    /**
     * The GitLab OAuth credentials.
     */
    gitlab?: {
      /**
       * The GitLab OAuth application ID.
       * @default process.env.STUDIO_GITLAB_APPLICATION_ID
       */
      applicationId?: string
      /**
       * The GitLab OAuth application secret.
       * @default process.env.STUDIO_GITLAB_APPLICATION_SECRET
       */
      applicationSecret?: string
      /**
       * The GitLab instance URL (for self-hosted instances).
       * @default 'https://gitlab.com'
       */
      instanceUrl?: string
    }
    /**
     * The Google OAuth credentials.
     * Note: When using Google OAuth, you must set STUDIO_GOOGLE_MODERATORS to a comma-separated
     * list of authorized email addresses, and either STUDIO_GITHUB_TOKEN or STUDIO_GITLAB_TOKEN
     * to push changes to your repository.
     */
    google?: {
      /**
       * The Google OAuth client ID.
       * @default process.env.STUDIO_GOOGLE_CLIENT_ID
       */
      clientId?: string
      /**
       * The Google OAuth client secret.
       * @default process.env.STUDIO_GOOGLE_CLIENT_SECRET
       */
      clientSecret?: string
    }
  }
  /**
   * The git repository information to connect to.
   */
  repository?: GitHubRepository | GitLabRepository
  /**
   * Enable Nuxt Studio to edit content and media files on your filesystem.
   */
  dev: boolean
  /**
   * Enable Nuxt Studio to edit content and media files on your filesystem.
   *
   * @deprecated Use the 'dev' option instead.
   */
  development?: {
    sync?: boolean
  }
  /**
   * i18n settings for the Studio.
   */
  i18n?: {
    /**
     * The default locale to use.
     * @default 'en'
     */
    defaultLocale?: string
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-studio',
    configKey: 'studio',
    version,
    docs: 'https://content.nuxt.com/studio',
  },
  defaults: {
    dev: true,
    route: '/_studio',
    repository: {
      provider: 'github',
      owner: '',
      repo: '',
      branch: 'main',
      rootDir: '',
      private: true,
    },
    auth: {
      github: {
        clientId: process.env.STUDIO_GITHUB_CLIENT_ID,
        clientSecret: process.env.STUDIO_GITHUB_CLIENT_SECRET,
      },
      gitlab: {
        applicationId: process.env.STUDIO_GITLAB_APPLICATION_ID,
        applicationSecret: process.env.STUDIO_GITLAB_APPLICATION_SECRET,
        instanceUrl: process.env.STUDIO_GITLAB_INSTANCE_URL || process.env.CI_SERVER_URL || 'https://gitlab.com',
      },
      google: {
        clientId: process.env.STUDIO_GOOGLE_CLIENT_ID,
        clientSecret: process.env.STUDIO_GOOGLE_CLIENT_SECRET,
      },
    },
    i18n: {
      defaultLocale: 'en',
    },
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = (...args: string[]) => resolver.resolve('./runtime', ...args)

    addServerImports([
      {
        name: 'setStudioUserSession',
        from: runtime('./server/utils/session'),
      },
      {
        name: 'clearStudioUserSession',
        from: runtime('./server/utils/session'),
      },
    ])

    if (nuxt.options.dev === false || options.development?.sync === false) {
      options.dev = false
    }

    if (!nuxt.options.dev && !nuxt.options._prepare) {
      validateAuthConfig(options)
    }

    // Enable checkoutOutdatedBuildInterval to detect new deployments
    nuxt.options.experimental = nuxt.options.experimental || {}
    nuxt.options.experimental.checkOutdatedBuildInterval = 1000 * 30

    nuxt.options.runtimeConfig.public.studio = {
      route: options.route!,
      dev: Boolean(options.dev),
      development: {
        server: process.env.STUDIO_DEV_SERVER,
      },
      // @ts-expect-error Autogenerated type does not match with options
      repository: options.repository,
      // @ts-expect-error Autogenerated type does not match with options
      i18n: options.i18n,
    }

    nuxt.options.runtimeConfig.studio = {
      auth: {
        sessionSecret: createHash('md5').update([
          options.auth?.github?.clientId,
          options.auth?.github?.clientSecret,
          options.auth?.gitlab?.applicationId,
          options.auth?.gitlab?.applicationSecret,
          options.auth?.google?.clientId,
          options.auth?.google?.clientSecret,
          process.env.STUDIO_GITHUB_TOKEN,
          process.env.STUDIO_GITLAB_TOKEN,
        ].join('')).digest('hex'),
        // @ts-expect-error autogenerated type doesn't match with project options
        github: options.auth?.github,
        // @ts-expect-error autogenerated type doesn't match with project options
        gitlab: options.auth?.gitlab,
        // @ts-expect-error autogenerated type doesn't match with project options
        google: options.auth?.google,
      },
      // @ts-expect-error Autogenerated type does not match with options
      repository: options.repository,
      // @ts-expect-error Autogenerated type does not match with options
      markdown: nuxt.options.content?.build?.markdown || {},
    }

    nuxt.options.vite = defu(nuxt.options.vite, {
      vue: {
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => tag === 'nuxt-studio',
          },
        },
      },
    })

    extendViteConfig((config) => {
      config.define ||= {}
      config.define['import.meta.preview'] = true

      config.optimizeDeps ||= {}
      config.optimizeDeps.include = [
        ...(config.optimizeDeps.include || []),
        'nuxt-studio > debug',
        'nuxt-studio > extend',
      ]
    })

    addPlugin(process.env.STUDIO_DEV_SERVER
      ? runtime('./plugins/studio.client.dev')
      : runtime('./plugins/studio.client'))

    const assetsStorage = createStorage({
      driver: fsDriver({
        base: resolve(nuxt.options.rootDir, 'public'),
      }),
    })

    addTemplate({
      filename: 'studio-public-assets.mjs',
      getContents: () => options.dev
        ? getAssetsStorageDevTemplate(assetsStorage, nuxt)
        : getAssetsStorageTemplate(assetsStorage, nuxt),
    })

    if (options.dev) {
      setupDevMode(nuxt, runtime, assetsStorage)
    }

    /* Server routes */
    addServerHandler({
      route: '/__nuxt_studio/auth/github',
      handler: runtime('./server/routes/auth/github.get'),
    })
    addServerHandler({
      route: '/__nuxt_studio/auth/google',
      handler: runtime('./server/routes/auth/google.get'),
    })
    addServerHandler({
      route: '/__nuxt_studio/auth/gitlab',
      handler: runtime('./server/routes/auth/gitlab.get'),
    })
    addServerHandler({
      route: '/__nuxt_studio/auth/session',
      handler: runtime('./server/routes/auth/session.get'),
    })

    addServerHandler({
      method: 'delete',
      route: '/__nuxt_studio/auth/session',
      handler: runtime('./server/routes/auth/session.delete'),
    })

    addServerHandler({
      route: options.route as string,
      handler: runtime('./server/routes/admin'),
    })

    addServerHandler({
      route: '/__nuxt_studio/meta',
      handler: runtime('./server/routes/meta'),
    })

    addServerHandler({
      route: '/sw.js',
      handler: runtime('./server/routes/sw'),
    })
  },
})
