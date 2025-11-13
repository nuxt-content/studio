import { ref } from 'vue'
import { ensure } from './utils/ensure'
import type { CollectionInfo, CollectionItemBase, CollectionSource, DatabaseAdapter } from '@nuxt/content'
import type { ContentDatabaseAdapter } from '../types/content'
import { getCollectionByFilePath, generateIdFromFsPath, generateRecordDeletion, generateRecordInsert, generateFsPathFromId, getCollectionById } from './utils/collection'
import { normalizeDocument, isDocumentMatchingContent, generateDocumentFromContent, generateContentFromDocument, areDocumentsEqual, pickReservedKeysFromDocument, removeReservedKeysFromDocument } from './utils/document'
import { kebabCase } from 'scule'
import type { StudioHost, StudioUser, DatabaseItem, MediaItem, Repository } from 'nuxt-studio/app'
import type { RouteLocationNormalized, Router } from 'vue-router'
// @ts-expect-error queryCollection is not defined in .nuxt/imports.d.ts
import { clearError, getAppManifest, queryCollection, queryCollectionItemSurroundings, queryCollectionNavigation, queryCollectionSearchSections } from '#imports'
import { collections } from '#content/preview'
import { publicAssetsStorage } from '#build/studio-public-assets'
import { useHostMeta } from './composables/useMeta'
import { generateIdFromFsPath as generateMediaIdFromFsPath } from './utils/media'
import { getCollectionSourceById } from './utils/source'

const serviceWorkerVersion = 'v0.0.2'

function getSidebarWidth(): number {
  let sidebarWidth = 440
  // Try to get width from localStorage if available
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedWidth = localStorage.getItem('studio-sidebar-width')
    if (savedWidth) {
      const width = Number.parseInt(savedWidth, 10)
      if (!Number.isNaN(width)) {
        sidebarWidth = width
        return width
      }
    }
  }
  return sidebarWidth
}

// TODO: Move styles and these logics out of host (Maybe have a injectCSS util in host)
function getHostStyles(): Record<string, Record<string, string>> & { css?: string } {
  const currentWidth = getSidebarWidth()
  return {
    'body[data-studio-active]': {
      transition: 'margin 0.2s ease',
    },
    'body[data-studio-active][data-expand-sidebar]': {
      marginLeft: `${currentWidth}px`,
    },
    // 'body[data-studio-active][data-expand-toolbar]': {
    //   marginTop: '60px',
    // },
    // 'body[data-studio-active][data-expand-sidebar][data-expand-toolbar]': {
    //   marginLeft: `${currentWidth}px`,
    //   marginTop: '60px',
    // },
  }
}

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

  const host: StudioHost = {
    meta: {
      dev: false,
      components: () => meta.componentsMeta.value,
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
          if (selector === 'css') return hostStyles.css || ''
          const styleText = Object.entries(hostStyles[selector] as Record<string, string>).map(([key, value]) => `${kebabCase(key)}: ${value}`).join(';')
          return `${selector} { ${styleText} }`
        }).join('')
        let styleElement = document.querySelector('[data-studio-style]')
        if (!styleElement) {
          styleElement = document.createElement('style')
          styleElement.setAttribute('data-studio-style', '')
          document.head.appendChild(styleElement)
        }
        styleElement.textContent = styles
      },
    },
    repository,
    // New API
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

          if (!item) {
            return undefined
          }

          return {
            ...item,
            fsPath,
          }
        },
        list: async (): Promise<DatabaseItem[]> => {
          const collections = Object.values(useContentCollections()).filter(collection => collection.name !== 'info')
          const documentsByCollection = await Promise.all(collections.map(async (collection) => {
            const documents = await useContentCollectionQuery(collection.name).all() as DatabaseItem[]

            return documents.map((document) => {
              const source = getCollectionSourceById(document.id, collection.source)
              const fsPath = generateFsPathFromId(document.id, source!)

              return {
                ...document,
                fsPath,
              }
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
          const document = await generateDocumentFromContent(id, content)
          const normalizedDocument = normalizeDocument(id, collectionInfo, document!)

          await host.document.db.upsert(fsPath, normalizedDocument)

          return {
            ...normalizedDocument,
            fsPath,
          }
        },
        upsert: async (fsPath: string, document: CollectionItemBase) => {
          const collectionInfo = getCollectionByFilePath(fsPath, useContentCollections())
          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fsPath, collectionInfo)

          const normalizedDocument = normalizeDocument(id, collectionInfo, document)

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
        areEqual: (document1: DatabaseItem, document2: DatabaseItem) => areDocumentsEqual(document1, document2),
        isMatchingContent: async (content: string, document: DatabaseItem) => isDocumentMatchingContent(content, document),
        pickReservedKeys: (document: DatabaseItem) => pickReservedKeysFromDocument(document),
        removeReservedKeys: (document: DatabaseItem) => removeReservedKeysFromDocument(document),
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
        documentFromContent: async (id: string, content: string) => generateDocumentFromContent(id, content),
        contentFromDocument: async (document: DatabaseItem) => generateContentFromDocument(document),
      },
    },

    media: {
      get: async (fsPath: string): Promise<MediaItem> => {
        return await publicAssetsStorage.getItem(generateMediaIdFromFsPath(fsPath)) as MediaItem
      },
      list: async (): Promise<MediaItem[]> => {
        return await Promise.all(await publicAssetsStorage.getKeys().then(keys => keys.map(key => publicAssetsStorage.getItem(key)))) as MediaItem[]
      },
      upsert: async (fsPath: string, media: MediaItem) => {
        const id = generateMediaIdFromFsPath(fsPath)
        await publicAssetsStorage.setItem(generateMediaIdFromFsPath(fsPath), { ...media, id })
      },
      delete: async (fsPath: string) => {
        await publicAssetsStorage.removeItem(generateMediaIdFromFsPath(fsPath))
      },
    },

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
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register(`/sw.js?${serviceWorkerVersion}`)
        }
        return meta.fetch()
      })
  })()

  return host
}
