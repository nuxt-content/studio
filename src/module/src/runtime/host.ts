import { ref } from 'vue'
import { ensure } from './utils/ensure'
import type { CollectionInfo, CollectionItemBase, CollectionSource, DatabaseAdapter } from '@nuxt/content'
import type { ContentDatabaseAdapter } from '../types/content'
import { getCollectionByFilePath, generateIdFromFsPath, generateRecordDeletion, generateRecordInsert, generateFsPathFromId, getCollectionById } from './utils/collection'
import { applyCollectionSchema, isDocumentMatchingContent, documentFromContent, contentFromDocument, areDocumentsEqual, pickReservedKeysFromDocument, cleanDataKeys, sanitizeDocumentTree, markdownRootFromComarkTree, isComarkTree, ensureComarkBody } from './utils/document'
import { getHostStyles, getSidebarWidth, adjustFixedElements } from './utils/sidebar'
import type { StudioHost, StudioUser, DatabaseItem, MediaItem, Repository } from 'nuxt-studio/app'
import type { RouteLocationNormalized, Router } from 'vue-router'
// @ts-expect-error queryCollection is not defined in .nuxt/imports.d.ts
import { clearError, getAppManifest, queryCollection, queryCollectionItemSurroundings, queryCollectionNavigation, queryCollectionSearchSections, useRuntimeConfig } from '#imports'
import { collections } from '#content/preview'
import { publicAssetsStorage, externalAssetsStorage } from '#build/studio-assets'
import { useHostMeta } from './composables/useMeta'
import { assignComponentsToGroups } from './utils/componentGroups'
import { generateIdFromFsPath as generateMediaIdFromFsPath, mediaItemFieldsFromKey } from './utils/media'
import { VIRTUAL_MEDIA_COLLECTION_NAME } from './utils/constants'
import { getCollectionSourceById } from './utils/source'
import { kebabCase } from 'scule'

const serviceWorkerVersion = 'v0.0.5'

function getLocalColorMode(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useStudioHost(user: StudioUser, repository: Repository): StudioHost {
  let localDatabaseAdapter: ContentDatabaseAdapter | null = null
  let colorMode = getLocalColorMode()

  const isMounted = ref(false)
  const meta = useHostMeta()

  function useNuxtApp() {
    return window.useNuxtApp!()
  }

  function useRouter() {
    return useNuxtApp().$router as unknown as Router
  }

  function useContent() {
    const $content = useNuxtApp().$content as { loadLocalDatabase: () => ContentDatabaseAdapter } || {}
    return {
      ...$content,
      queryCollection,
      queryCollectionItemSurroundings,
      queryCollectionNavigation,
      queryCollectionSearchSections,
      collections,
    }
  }

  function useContentDatabaseAdapter(collection: string): DatabaseAdapter {
    return localDatabaseAdapter!(collection)
  }

  function useContentCollections(): Record<string, CollectionInfo> {
    return Object.fromEntries(
      Object.entries(useContent().collections).filter(([, collection]) => {
        if (!collection.source.length || collection.source.some((source: CollectionSource) => source.repository || (source as unknown as { _custom: boolean })._custom)) {
          return false
        }
        return true
      }),
    )
  }

  function useContentCollectionQuery(collection: string) {
    return useContent().queryCollection(collection)
  }

  const studioConfig = useRuntimeConfig().public.studio
  const aiConfig = studioConfig.ai
  const mediaConfig = studioConfig.media

  const host: StudioHost = {
    meta: {
      dev: false,
      media: mediaConfig,
      git: studioConfig.git,
      ai: {
        enabled: aiConfig?.enabled ?? false,
        experimental: {
          collectionContext: aiConfig?.experimental?.collectionContext ?? false,
        },
        context: {
          collectionName: aiConfig.context.collectionName,
          contentFolder: aiConfig.context.contentFolder,
        },
      },
      editor: {
        components: {
          hasNuxtUI: meta.components.hasNuxtUI,
          get: () => meta.components.list.value,
          getGroups: (fallbackLabel: string) => {
            if (meta.components.groups.value.length === 0) return []
            return assignComponentsToGroups(
              meta.components.list.value,
              meta.components.groups.value,
              meta.components.ungrouped.value,
              fallbackLabel,
            )
          },
        },
        commands: studioConfig.commands ?? { exclude: [] },
        suggestion: studioConfig.suggestion ?? { limit: 200 },
        iconLibraries: studioConfig.iconLibraries,
        get highlightTheme() { return meta.highlightTheme.value! },
        get markdown() { return meta.markdownConfig.value },
      },
      defaultLocale: studioConfig.i18n?.defaultLocale || 'en',
    },
    on: {
      routeChange: (fn: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => {
        const router = useRouter()
        router?.afterEach?.((to, from) => {
          fn(to, from)
        })
      },
      mounted: (fn: () => void) => ensure(() => isMounted.value, 400).then(fn),
      beforeUnload: (fn: (event: BeforeUnloadEvent) => void) => {
        host.ui.deactivateStudio()
        ensure(() => isMounted.value).then(() => {
          window.addEventListener('beforeunload', fn)
        })
      },
      colorModeChange: (fn: (colorMode: 'light' | 'dark') => void) => {
        // Watch for changes to the color mode
        const localColorModeObserver = new MutationObserver(() => {
          colorMode = getLocalColorMode()
          fn(colorMode)
        })
        localColorModeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        })
      },
      manifestUpdate: (fn: (id: string) => void) => {
        useNuxtApp().hooks.hookOnce('app:manifest:update', meta => fn(meta!.id))
      },
      documentUpdate: (_fn: (id: string, type: 'remove' | 'update') => void) => {
        // no operation
      },
      mediaUpdate: (_fn: (id: string, type: 'remove' | 'update') => void) => {
        // no operation
      },
      requestDocumentEdit: (fn: (fsPath: string) => void) => {
        // @ts-expect-error studio:document:edit is not defined in types
        useNuxtApp().hooks.hook('studio:document:edit', fn)
      },
    },
    ui: {
      colorMode,
      activateStudio: () => {
        document.body.setAttribute('data-studio-active', 'true')
      },
      deactivateStudio: () => {
        document.body.removeAttribute('data-studio-active')
        host.ui.collapseSidebar()
        host.ui.updateStyles()
      },
      expandSidebar: () => {
        document.body.setAttribute('data-expand-sidebar', 'true')
        host.ui.updateStyles()
      },
      collapseSidebar: () => {
        document.body.removeAttribute('data-expand-sidebar')
        host.ui.updateStyles()
      },
      updateStyles: () => {
        const hostStyles = getHostStyles()
        const styles: string = Object.keys(hostStyles).map((selector) => {
          const styleText = Object.entries(hostStyles[selector]!).map(([key, value]) => `${kebabCase(key)}: ${value}`).join(';')
          return `${selector} { ${styleText} }`
        }).join('')

        let styleElement = document.querySelector('[data-studio-style]')
        if (!styleElement) {
          styleElement = document.createElement('style')
          styleElement.setAttribute('data-studio-style', '')
          document.head.appendChild(styleElement)
        }
        styleElement.textContent = styles

        const isSidebarExpanded = document.body.hasAttribute('data-expand-sidebar')
        adjustFixedElements(isSidebarExpanded ? getSidebarWidth() : 0)
      },
    },
    repository,
    user: {
      get: () => user,
    },
    document: {
      db: {
        get: async (fsPath: string): Promise<DatabaseItem | undefined> => {
          const collectionInfo = getCollectionByFilePath(fsPath, useContentCollections())
          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fsPath, collectionInfo)
          const item = await useContentCollectionQuery(collectionInfo.name).where('id', '=', id).first()

          // item.meta = {}

          if (!item) {
            return undefined
          }

          return ensureComarkBody(sanitizeDocumentTree({ ...item, fsPath }, collectionInfo))
        },
        list: async (): Promise<DatabaseItem[]> => {
          const collections = Object.values(useContentCollections()).filter(collection => collection.name !== 'info')
          const documentsByCollection = await Promise.all(collections.map(async (collection) => {
            const documents = await useContentCollectionQuery(collection.name).all() as DatabaseItem[]

            return documents.map((document) => {
              const source = getCollectionSourceById(document.id, collection.source)
              const fsPath = generateFsPathFromId(document.id, source!)

              return ensureComarkBody(sanitizeDocumentTree({ ...document, fsPath }, collection))
            })
          }))

          return documentsByCollection.flat()
        },
        create: async (fsPath: string, content: string) => {
          const existingDocument = await host.document.db.get(fsPath)
          if (existingDocument) {
            throw new Error(`Cannot create document with fsPath "${fsPath}": document already exists.`)
          }

          const collectionInfo = getCollectionByFilePath(fsPath, useContentCollections())
          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fsPath, collectionInfo!)
          const generateOptions = { collectionType: collectionInfo.type, compress: true }
          const document = await documentFromContent(id, content, generateOptions)
          const normalizedDocument = applyCollectionSchema(id, collectionInfo, document!)

          await host.document.db.upsert(fsPath, normalizedDocument)

          return ensureComarkBody(sanitizeDocumentTree({ ...normalizedDocument, fsPath }, collectionInfo))
        },
        upsert: async (fsPath: string, document: CollectionItemBase) => {
          const collectionInfo = getCollectionByFilePath(fsPath, useContentCollections())
          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fsPath, collectionInfo)

          // Convert MarkdownDocument body back to MarkdownRoot before storing in DB
          const body = (document as DatabaseItem).body
          const documentToStore = isComarkTree(body)
            ? { ...document, body: markdownRootFromComarkTree(body) as unknown }
            : document

          const normalizedDocument = applyCollectionSchema(id, collectionInfo, documentToStore)

          await useContentDatabaseAdapter(collectionInfo.name).exec(generateRecordDeletion(collectionInfo, id))
          await useContentDatabaseAdapter(collectionInfo.name).exec(generateRecordInsert(collectionInfo, normalizedDocument))
        },
        delete: async (fsPath: string) => {
          const collection = getCollectionByFilePath(fsPath, useContentCollections())
          if (!collection) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fsPath, collection)

          await useContentDatabaseAdapter(collection.name).exec(generateRecordDeletion(collection, id))
        },
      },
      utils: {
        areEqual: async (document1: DatabaseItem, document2: DatabaseItem) => areDocumentsEqual(document1, document2),
        isMatchingContent: async (content: string, document: DatabaseItem) => isDocumentMatchingContent(content, document),
        pickReservedKeys: (document: DatabaseItem) => pickReservedKeysFromDocument(document),
        cleanDataKeys: (document: DatabaseItem) => cleanDataKeys(document),
        ensureComarkBody: (document: DatabaseItem) => ensureComarkBody(document),
        detectActives: () => {
          // TODO: introduce a new convention to detect data contents [data-content-id!]
          const wrappers = document.querySelectorAll('[data-content-id]')
          return Array.from(wrappers).map((wrapper) => {
            const id = wrapper.getAttribute('data-content-id')!
            const title = id.split(/[/:]/).pop() || id

            const collection = getCollectionById(id, useContentCollections())

            const source = getCollectionSourceById(id, collection.source)

            const fsPath = generateFsPathFromId(id, source!)

            return {
              fsPath,
              title,
            }
          })
        },
      },
      generate: {
        documentFromContent: async (id: string, content: string) => {
          const collection = getCollectionById(id, useContentCollections())

          const generateOptions = { collectionType: collection.type, compress: true }
          return await documentFromContent(id, content, generateOptions)
        },
        contentFromDocument: async (document: DatabaseItem) => contentFromDocument(document),
      },
    },
    media: (() => {
      // Helper to select appropriate storage based on config
      const getStorage = () => (host.meta.media?.external ? externalAssetsStorage : publicAssetsStorage)!

      return {
        get: async (fsPath: string): Promise<MediaItem> => {
          return await getStorage().getItem(generateMediaIdFromFsPath(fsPath)) as MediaItem
        },
        list: async (): Promise<MediaItem[]> => {
          const keys = await getStorage().getKeys()
          // production's pre-baked storage keys carry the collection prefix; dev/external keys don't
          const collectionPrefix = new RegExp(`^${VIRTUAL_MEDIA_COLLECTION_NAME}:`)
          return keys.map((key: string): MediaItem => {
            const rawKey = key.replace(collectionPrefix, '')
            return mediaItemFieldsFromKey(rawKey)
          })
        },
        upsert: async (fsPath: string, media: MediaItem) => {
          const id = generateMediaIdFromFsPath(fsPath)
          await getStorage().setItem(id, { ...media, id })
        },
        delete: async (fsPath: string) => {
          const id = generateMediaIdFromFsPath(fsPath)
          await getStorage().removeItem(id)
        },
      }
    })(),

    app: {
      getManifestId: async () => {
        const manifest = await getAppManifest()
        return manifest!.id
      },
      requestRerender: async () => {
        if (useNuxtApp().payload.error) {
          await clearError({ redirect: `?t=${Date.now()}` })
        }
        useNuxtApp().hooks.callHookParallel('app:data:refresh')
      },
      navigateTo: (path: string) => {
        useRouter().push(path)
      },
      getCurrentRoute: () => useRouter().currentRoute.value,
      registerServiceWorker: () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register(`/sw.js?${serviceWorkerVersion}`)
        }
      },
      unregisterServiceWorker: () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            regs.forEach((reg) => {
              // This is the URL you used in navigator.serviceWorker.register('/my-sw.js')
              const scriptURL = reg.active?.scriptURL
                || reg.waiting?.scriptURL
                || reg.installing?.scriptURL

              // Check for exact match or contains
              if (scriptURL && scriptURL.endsWith(`/sw.js?${serviceWorkerVersion}`)) {
                reg.unregister()
              }
            })
          })
        }
      },
    },
    collection: {
      getByFsPath: (fsPath: string) => getCollectionByFilePath(fsPath, useContentCollections()),
      list: () => Object.values(useContentCollections()),
    },
  }

  ;(async () => {
    host.ui.activateStudio()
    // TODO: ensure logic is enough and all collections are registerded
    ensure(() => useContent().queryCollection !== void 0, 500)
      // .then(() => useContentCollectionQuery("docs").first())
      .then(() => ensure(() => useContent().loadLocalDatabase !== void 0))
      .then(() => useContent().loadLocalDatabase())
      .then((_localDatabaseAdapter) => {
        localDatabaseAdapter = _localDatabaseAdapter
        isMounted.value = true
      }).then(() => {
        return meta.fetch()
      })

    document.body.addEventListener('dblclick', (event: MouseEvent) => {
      let element = event.target as HTMLElement
      while (element) {
        if (element.getAttribute('data-content-id')) {
          break
        }
        element = element.parentElement as HTMLElement
      }
      if (element) {
        const id = element.getAttribute('data-content-id')!
        const collection = getCollectionById(id, useContentCollections())
        const source = getCollectionSourceById(id, collection.source)
        const fsPath = generateFsPathFromId(id, source!)

        // @ts-expect-error studio:document:edit is not defined in types
        useNuxtApp().hooks.callHook('studio:document:edit', fsPath)
      }
    })
    // Initialize styles
    host.ui.updateStyles()
  })()

  return host
}
