import { defineNuxtModule, createResolver, addPlugin, extendViteConfig, addServerHandler, addServerImports, useLogger, hasNuxtModule } from '@nuxt/kit'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defu } from 'defu'
import { version } from '../../../package.json'
import { setupDevMode } from './dev'
import { validateAuthConfig } from './auth'
import { setExternalMediaStorage, setDefaultMediaStorage } from './medias'
import { setAIFeature } from './ai'
import type { CommandConfig, SuggestionConfig } from '../../app/src/types/editor'

const logger = useLogger('nuxt-studio')

interface EditorOptions {
  /**
   * Commands to exclude from the editor.
   * @example ['style', 'insert', 'blockquote'] will hide the Style and Insert sections and the blockquote command.
   */
  commands?: CommandConfig
  /**
   * Component filtering options.
   */
  components?: {
    /**
     * Patterns to include components.
     * If a pattern contains a /, it will be treated as a path filter.
     * Otherwise, it will be treated as a name filter.
     */
    include?: string[]
    /**
     * Patterns to exclude components.
     * If a pattern contains a /, it will be treated as a path filter.
     * Otherwise, it will be treated as a name filter.
     */
    exclude?: string[]
    /**
     * Custom groups for the slash command menu.
     * When defined, components are organized into these groups instead of a single flat list.
     */
    groups?: Array<{
      /**
       * Label for the group.
       * @example 'Landing Page Components'
       */
      label: string
      /**
       * Patterns to include components in the group.
       * @example ['content*', 'app/components/content/landing/**']
       */
      include: string[]
    }>
    /**
     * Whether components not matching any group appear in a fallback "Components" group.
     * @default 'include'
     */
    ungrouped?: 'include' | 'omit'
  }
  /**
   * Restricts the Iconify collection prefixes available in every Studio icon picker
   * @example ['material-symbols', 'lucide']
   */
  iconLibraries?: string[]
  /**
   * TipTap slash menu suggestion settings.
   */
  suggestion?: SuggestionConfig
}

interface MediaUploadOptions {
  /**
   * Enable external storage for media uploads.
   * When enabled, media files are uploaded to cloud storage (S3, Vercel Blob, Cloudflare R2, etc.)
   * instead of being committed to Git. NuxtHub auto-detects the driver from environment variables.
   *
   * @default false
   */
  external?: boolean

  /**
   * The maximum file size for media uploads.
   * @default 10 * 1024 * 1024 (10MB)
   */
  maxFileSize?: number

  /**
   * The allowed types for media uploads.
   * @default ['image/*', 'video/*', 'audio/*']
   */
  allowedTypes?: string[]

  /**
   * The public CDN URL for the media files.
   * Falls back to the blob URL returned by the storage provider if not set.
   * @default NUXT_PUBLIC_STUDIO_MEDIA_PUBLIC_URL
   */
  publicUrl?: string

  /**
   * The prefix used for files stored in external storage.
   * Files are stored as `<prefix>/<path>` in the bucket.
   * @default 'studio'
   */
  prefix?: string
}

interface RepositoryOptions {
  /**
   * The owner of the git repository.
   */
  owner?: string
  /**
   * The repository name.
   */
  repo?: string
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

interface GitHubRepositoryOptions extends RepositoryOptions {
  provider: 'github'
  /**
   * GitHub instance base web URL (for GitHub Enterprise Server).
   * Must be the web origin without a trailing slash and without `/api/v3`,
   * for example: `https://github.com` or `https://ghe.example.com`.
   * @default 'https://github.com'
   */
  instanceUrl?: string
}

interface GitLabRepositoryOptions extends RepositoryOptions {
  provider: 'gitlab'
  /**
   * The GitLab instance URL (for self-hosted instances).
   * @default 'https://gitlab.com'
   */
  instanceUrl?: string
}

export interface ModuleOptions {
  /**
   * The route to access the studio login page.
   * @default '/_studio'
   */
  route?: string

  /**
   * AI-powered content generation settings.
   */
  ai?: {
    /**
     * The Vercel AI Gateway key for AI features.
     * When set, AI-powered content generation will be enabled.
     *
     * Set via `NUXT_STUDIO_AI_API_KEY` environment variable at runtime.
     */
    apiKey?: string
    /**
     * Contextual information to guide AI content generation.
     */
    context?: {
      /**
       * The title of the project.
       * @default Reads from package.json name field
       */
      title?: string
      /**
       * The description of the project.
       * @default Reads from package.json description field
       */
      description?: string
      /**
       * The writing style to use (e.g., "technical documentation", "blog post", "marketing copy").
       */
      style?: string
      /**
       * The tone to use (e.g., "friendly and concise", "formal and professional", "casual").
       */
      tone?: string
      /**
       * Collection configuration for storing AI context files.
       * Each collection can have its own CONTEXT.md file.
       */
      collection?: {
        /**
         * The name of the collection storing AI context files.
         * @default 'studio'
         */
        name?: string
        /**
         * The folder where context files are stored.
         * @default '.studio'
         */
        folder?: string
      }
    }
    /**
     * Experimental AI features.
     */
    experimental?: {
      /**
       * Enable loading collection-specific context files from the studio collection.
       * When enabled, AI will load writing guidelines from `.studio/{collection-name}.md`.
       * @default false
       */
      collectionContext?: boolean
    }
  }

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
       * @default NUXT_STUDIO_AUTH_GITHUB_CLIENT_ID
       */
      clientId?: string
      /**
       * The GitHub OAuth client secret.
       * @default NUXT_STUDIO_AUTH_GITHUB_CLIENT_SECRET
       */
      clientSecret?: string
      /**
       * GitHub instance base web URL (for GitHub Enterprise Server).
       * Must be the web origin without a trailing slash and without `/api/v3`,
       * for example: `https://github.com` or `https://ghe.example.com`.
       * @default 'https://github.com'
       */
      instanceUrl?: string
      /**
       * Comma-separated list of allowed email addresses.
       * @default NUXT_STUDIO_AUTH_GITHUB_MODERATORS
       */
      moderators?: string
    }
    /**
     * The GitLab OAuth credentials.
     */
    gitlab?: {
      /**
       * The GitLab OAuth application ID.
       * @default NUXT_STUDIO_AUTH_GITLAB_APPLICATION_ID
       */
      applicationId?: string
      /**
       * The GitLab OAuth application secret.
       * @default NUXT_STUDIO_AUTH_GITLAB_APPLICATION_SECRET
       */
      applicationSecret?: string
      /**
       * The GitLab instance URL (for self-hosted instances).
       * @default 'https://gitlab.com'
       */
      instanceUrl?: string
      /**
       * Comma-separated list of allowed email addresses.
       * @default NUXT_STUDIO_AUTH_GITLAB_MODERATORS
       */
      moderators?: string
    }
    /**
     * The Google OAuth credentials.
     * Note: When using Google OAuth, you must set NUXT_STUDIO_AUTH_GOOGLE_MODERATORS to a comma-separated
     * list of authorized email addresses, and either NUXT_STUDIO_GIT_GITHUB_TOKEN or NUXT_STUDIO_GIT_GITLAB_TOKEN
     * to push changes to your repository.
     */
    google?: {
      /**
       * The Google OAuth client ID.
       * @default NUXT_STUDIO_AUTH_GOOGLE_CLIENT_ID
       */
      clientId?: string
      /**
       * The Google OAuth client secret.
       * @default NUXT_STUDIO_AUTH_GOOGLE_CLIENT_SECRET
       */
      clientSecret?: string
      /**
       * Comma-separated list of authorized email addresses.
       * Required when using Google OAuth.
       * @default NUXT_STUDIO_AUTH_GOOGLE_MODERATORS
       */
      moderators?: string
    }
    /**
     * SSO server credentials for Single Sign-On across multiple Nuxt Studio sites.
     * This enables authentication via a centralized SSO server (like nuxt-studio-sso).
     * When users authenticate with GitHub on the SSO server, their GitHub token is
     * automatically passed through, eliminating the need for NUXT_STUDIO_GIT_GITHUB_TOKEN.
     */
    sso?: {
      /**
       * The SSO server URL (e.g., 'https://auth.example.com').
       * @default NUXT_STUDIO_AUTH_SSO_SERVER_URL
       */
      serverUrl?: string
      /**
       * The SSO client ID.
       * @default NUXT_STUDIO_AUTH_SSO_CLIENT_ID
       */
      clientId?: string
      /**
       * The SSO client secret.
       * @default NUXT_STUDIO_AUTH_SSO_CLIENT_SECRET
       */
      clientSecret?: string
    }
  }
  /**
   * The git repository information to connect to.
   */
  repository?: GitHubRepositoryOptions | GitLabRepositoryOptions
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
  /**
   * Editor configuration options (components, commands, icon libraries).
   */
  editor?: EditorOptions
  /**
   * @deprecated Use `editor` instead.
   */
  meta?: EditorOptions
  /**
   * Git configuration options.
   */
  git?: {
    /**
     * Commit configuration for content editor publishes.
     */
    commit?: {
      /**
       * Prefix to prepend to all commit messages (e.g. 'feat:', 'docs:', 'content:').
       * Should include trailing colon for conventional commit format.
       * @default '' (no prefix)
       */
      messagePrefix?: string
    }
  }
  /**
   * Media upload configuration for OSS (Object Storage Service) integration.
   * Allows uploading media files to external storage providers like S3, Cloudinary, etc.
   */
  media?: MediaUploadOptions
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
    ai: {
      context: {
        title: '',
        description: '',
        style: '',
        tone: '',
        collection: {
          name: 'studio',
          folder: '.studio',
        },
      },
    },
    repository: {
      provider: 'github',
      owner: undefined,
      repo: undefined,
      branch: undefined,
      rootDir: '',
      private: true,
      instanceUrl: undefined,
    },
    auth: {
      github: {
        clientId: undefined,
        clientSecret: undefined,
        instanceUrl: 'https://github.com',
      },
      gitlab: {
        applicationId: undefined,
        applicationSecret: undefined,
        instanceUrl: 'https://gitlab.com',
      },
      google: {
        clientId: undefined,
        clientSecret: undefined,
      },
      sso: {
        serverUrl: undefined,
        clientId: undefined,
        clientSecret: undefined,
      },
    },
    i18n: {
      defaultLocale: 'en',
    },
    git: {
      commit: {
        messagePrefix: '',
      },
    },
    editor: {
      commands: {
        exclude: [],
      },
      components: {
        include: [],
        exclude: [],
        groups: undefined,
        ungrouped: 'include',
      },
      suggestion: {
        limit: 200,
      },
    },
    media: {
      external: false,
      publicUrl: undefined,
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/*', 'video/*', 'audio/*'],
      prefix: 'studio',
    },
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = (...args: string[]) => resolver.resolve('./runtime', ...args)
    const editorOptions = options.editor ?? options.meta

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

    const isProdBuild = nuxt.options.dev === false && nuxt.options._prepare === false

    if (isProdBuild && options.repository?.owner && options.repository?.repo) {
      logger.info(`Using repository (build-time config): ${options.repository?.provider}:${options.repository?.owner}/${options.repository?.repo}#${options.repository?.branch}`)
    }

    if (isProdBuild && !options.repository?.owner && !options.repository?.repo) {
      logger.warn([
        'Repository owner and repository name are not configured at build time.',
        'They can be supplied at runtime via:',
        '  - NUXT_PUBLIC_STUDIO_REPOSITORY_OWNER / NUXT_PUBLIC_STUDIO_REPOSITORY_REPO / NUXT_PUBLIC_STUDIO_REPOSITORY_BRANCH',
        '  - CI platform env vars: VERCEL_GIT_* or Netlify REPOSITORY_URL / BRANCH (resolved at server runtime)',
        'Note: GITHUB_ACTIONS / GITLAB_CI env vars are build-time only; use NUXT_PUBLIC_STUDIO_REPOSITORY_* for those deployments.',
      ].join('\n'))
    }

    if (isProdBuild) {
      validateAuthConfig(options)
    }

    if (options.ai) {
      await setAIFeature(options, nuxt, runtime)
    }

    // Enable checkoutOutdatedBuildInterval to detect new deployments
    nuxt.options.experimental = nuxt.options.experimental || {}
    nuxt.options.experimental.checkOutdatedBuildInterval = 1000 * 30

    let isExternalMediaEnabled = options.media?.external
    if (isExternalMediaEnabled) {
      const isNuxtHubInstalled = hasNuxtModule('@nuxthub/core')
      // @ts-expect-error must be installed by user before enabling external media storage
      if (!isNuxtHubInstalled || !nuxt.options.hub?.blob) {
        logger.warn('You must install and enable @nuxthub/core blob storage to use external media storage. Falling back to default assets storage.')
        isExternalMediaEnabled = false
      }
    }

    if (!isExternalMediaEnabled && !options.media!.publicUrl) {
      options.media!.publicUrl = resolve(nuxt.options.rootDir, 'public')
    }

    // Public runtime config
    nuxt.options.runtimeConfig.public.studio = {
      route: options.route!,
      dev: Boolean(options.dev),
      development: {
        server: process.env.STUDIO_DEV_SERVER,
      },
      ai: {
        // Honest build-time baseline; the studio-env middleware recomputes this at runtime
        // once NUXT_STUDIO_AI_API_KEY is resolved.
        enabled: Boolean(options.ai?.apiKey),
        context: {
          collectionName: options.ai?.context?.collection?.name as string,
          contentFolder: options.ai?.context?.collection?.folder as string,
        },
        experimental: {
          collectionContext: Boolean(options.ai?.experimental?.collectionContext),
        },
      },
      // @ts-expect-error Autogenerated type does not match with options
      repository: options.repository,
      // @ts-expect-error Autogenerated type does not match with options
      i18n: options.i18n,
      // @ts-expect-error Autogenerated type does not match with options
      media: { ...options.media, external: isExternalMediaEnabled },
      git: { commit: { messagePrefix: options.git?.commit?.messagePrefix ?? '' } },
      iconLibraries: editorOptions?.iconLibraries,
      commands: { exclude: [], ...editorOptions?.commands },
      suggestion: { limit: 200, ...editorOptions?.suggestion },
    }

    // Studio runtime config
    nuxt.options.runtimeConfig.studio = {
      ai: {
        apiKey: options.ai?.apiKey || '',
        context: options.ai?.context as never,
        experimental: options.ai?.experimental,
      },
      auth: {
        sessionSecret: '',
        github: {
          clientId: options.auth?.github?.clientId || '',
          clientSecret: options.auth?.github?.clientSecret || '',
          instanceUrl: options.auth!.github!.instanceUrl!,
          redirectUrl: '',
          moderators: '',
        },
        gitlab: {
          applicationId: options.auth?.gitlab?.applicationId || '',
          applicationSecret: options.auth?.gitlab?.applicationSecret || '',
          instanceUrl: options.auth!.gitlab!.instanceUrl!,
          redirectUrl: '',
          moderators: '',
        },
        google: {
          clientId: options.auth?.google?.clientId || '',
          clientSecret: options.auth?.google?.clientSecret || '',
          redirectUrl: '',
          moderators: '',
        },
        sso: {
          serverUrl: options.auth?.sso?.serverUrl || '',
          clientId: options.auth?.sso?.clientId || '',
          clientSecret: options.auth?.sso?.clientSecret || '',
          redirectUrl: '',
        },
      },
      git: {
        commit: { messagePrefix: options.git?.commit?.messagePrefix ?? '' },
        githubToken: '',
        gitlabToken: '',
      },
      // @ts-expect-error Autogenerated type does not match with options
      repository: options.repository,
      // @ts-expect-error EditorOptions | undefined doesn't match the autogenerated shape
      editor: editorOptions,
      // @ts-expect-error Autogenerated type does not match with options
      markdown: nuxt.options.content?.build?.markdown || {},
      // @ts-expect-error Autogenerated type does not match with options (optional booleans vs required)
      media: {
        ...options.media,
        publicUrl: options.media?.publicUrl || '',
      },
    }

    // Vite config
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
        // [DEV] Pre-bundled
        'nuxt-studio/app',
      ]

      // [PROD] Externalize the pre-bundled Studio app
      // Avoid vite to process bundle
      config.plugins ||= []
      config.plugins.push({
        name: 'nuxt-studio:externalize-app',
        enforce: 'pre',
        apply: 'build',
        resolveId(id) {
          if (id === 'nuxt-studio/app') {
            return { id: `/_studio-app/${version}/main.js`, external: true }
          }
        },
      })
    })

    // Serve the pre-built Studio app as public assets.
    const distAppDir = [
      resolver.resolve('../../dist/app'), // compiled version
      resolver.resolve('../../../dist/app'), // source version
    ].find(existsSync)
    if (distAppDir) {
      nuxt.hook('nitro:config', (nitroConfig) => {
        nitroConfig.publicAssets ||= []
        nitroConfig.publicAssets.push({
          dir: distAppDir,
          baseURL: `/_studio-app/${version}`,
          maxAge: 60 * 60 * 24 * 365,
        })
      })
    }

    addPlugin(process.env.STUDIO_DEV_SERVER
      ? runtime('./plugins/studio.client.dev')
      : runtime('./plugins/studio.client'))

    addServerHandler({ middleware: true, handler: runtime('./server/middleware/studio-env') })

    let publicAssetsStorage
    if (isExternalMediaEnabled) {
      await setExternalMediaStorage(nuxt, runtime)
    }
    else {
      publicAssetsStorage = setDefaultMediaStorage(nuxt, options)
    }

    if (options.dev) {
      setupDevMode(nuxt, runtime, publicAssetsStorage)
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
      route: '/__nuxt_studio/auth/sso',
      handler: runtime('./server/routes/auth/sso.get'),
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
      route: '/__nuxt_studio/ipx/**',
      handler: runtime('./server/routes/ipx/[...path]'),
    })

    addServerHandler({
      route: '/sw.js',
      handler: runtime('./server/routes/sw'),
    })
  },
})
