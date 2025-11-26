import { ref } from 'vue'
import { ensure } from './utils/ensure'
import { joinURL, withoutTrailingSlash } from 'ufo'
import type { CollectionInfo, CollectionItemBase, DatabaseAdapter, ResolvedCollectionSource } from '@nuxt/content'
import type { ContentDatabaseAdapter } from '../types/content'
import { getCollectionByFilePath, generateIdFromFsPath, generateRecordDeletion, generateRecordInsert, generateFsPathFromId, getCollectionById } from './utils/collection'
import { normalizeDocument, isDocumentMatchingContent, generateDocumentFromContent, generateContentFromDocument, areDocumentsEqual, pickReservedKeysFromDocument, removeReservedKeysFromDocument } from './utils/document'
import { kebabCase } from 'scule'
import type { StudioHost, StudioUser, DatabaseItem, MediaItem, Repository } from 'nuxt-studio/app'
import type { RouteLocationNormalized, Router } from 'vue-router'
// @ts-expect-error queryCollection is not defined in .nuxt/imports.d.ts
import { clearError, getAppManifest, queryCollection, queryCollectionItemSurroundings, queryCollectionNavigation, queryCollectionSearchSections, useRuntimeConfig } from '#imports'
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
    const allCollections = useContent().collections || {}
    return allCollections
  }

  function useContentCollectionQuery(collection: string) {
    return useContent().queryCollection(collection)
  }

  // Helper to deduce fsPath from ID when source config is missing
  function getFsPathFromId(id: string, collectionName: string, source?: ResolvedCollectionSource): string {
    if (source) {
      return generateFsPathFromId(id, source)
    }
    // Fallback: remove collection name from ID
    const regex = new RegExp(`^${collectionName}[/:]`)
    return id.replace(regex, '')
  }

  function stripRootDir(path: string): string {
    if (!repository.rootDir) return path
    const rootDir = withoutTrailingSlash(repository.rootDir)
    if (path.startsWith(rootDir + '/')) {
      return path.substring(rootDir.length + 1)
    }
    if (path === rootDir) {
      return ''
    }
    return path
  }

  function prependRootDir(path: string): string {
    if (!repository.rootDir) return path
    return joinURL(repository.rootDir, path)
  }

  const host: StudioHost = {
    meta: {
      dev: false,
      components: () => meta.componentsMeta.value,
      defaultLocale: useRuntimeConfig().public.studio.i18n?.defaultLocale || 'en',
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
    user: {
      get: () => user,
    },
    document: {
      db: {
        get: async (fsPath: string): Promise<DatabaseItem | undefined> => {
          // Add rootDir to match collection pattern
          const fullPath = prependRootDir(fsPath)
          const collections = useContentCollections()
          const collectionInfo = getCollectionByFilePath(fullPath, collections)

          if (!collectionInfo) {
            // FALLBACK: Try to guess collection by ID
            for (const [name, _] of Object.entries(collections)) {
              const id = `${name}/${fullPath}`
              const item = await useContentCollectionQuery(name).where('id', '=', id).first()
              if (item) {
                return { ...item, fsPath }
              }
            }

            console.error(`[Nuxt Studio] Collection not found for fsPath: ${fsPath} (full: ${fullPath}).`)
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fullPath, collectionInfo)
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
              const sources = (Array.isArray(collection.source) ? collection.source : [collection.source]) as ResolvedCollectionSource[]
              const source = getCollectionSourceById(document.id, sources)

              // Use fallback if source is missing (likely remote repo)
              const fsPath = getFsPathFromId(document.id, collection.name, source)

              return {
                ...document,
                fsPath: stripRootDir(fsPath),
              }
            }).filter(Boolean) as DatabaseItem[]
          }))

          return documentsByCollection.flat()
        },
        create: async (fsPath: string, content: string) => {
          const fullPath = prependRootDir(fsPath)
          const existingDocument = await host.document.db.get(fsPath).catch(() => null)
          if (existingDocument) {
            throw new Error(`Cannot create document with fsPath "${fsPath}": document already exists.`)
          }

          const collectionInfo = getCollectionByFilePath(fullPath, useContentCollections())
          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fullPath, collectionInfo!)
          const document = await generateDocumentFromContent(id, content)
          const normalizedDocument = normalizeDocument(id, collectionInfo, document!)

          await host.document.db.upsert(fsPath, normalizedDocument)

          return {
            ...normalizedDocument,
            fsPath,
          }
        },
        upsert: async (fsPath: string, document: CollectionItemBase) => {
          const fullPath = prependRootDir(fsPath)
          const collections = useContentCollections()
          let collectionInfo = getCollectionByFilePath(fullPath, collections)

          // Fallback: try to get collection from document ID if path matching failed
          if (!collectionInfo && document.id) {
            try {
              collectionInfo = getCollectionById(document.id, collections)
            }
            catch {
              // ignore
            }
          }

          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath} (full: ${fullPath})`)
          }

          // Prefer existing document ID, otherwise generate one
          const id = document.id || generateIdFromFsPath(fullPath, collectionInfo)

          const normalizedDocument = normalizeDocument(id, collectionInfo, document)

          await useContentDatabaseAdapter(collectionInfo.name).exec(generateRecordDeletion(collectionInfo, id))
          await useContentDatabaseAdapter(collectionInfo.name).exec(generateRecordInsert(collectionInfo, normalizedDocument))
        },
        delete: async (fsPath: string) => {
          const fullPath = prependRootDir(fsPath)
          const collections = useContentCollections()
          let collectionInfo = getCollectionByFilePath(fullPath, collections)

          if (!collectionInfo) {
            // Fallback: brute-force find collection by checking if guessed ID exists
            for (const [name, _] of Object.entries(collections)) {
              const id = `${name}/${fullPath}`
              const item = await useContentCollectionQuery(name).where('id', '=', id).first()
              if (item) {
                collectionInfo = collections[name]
                break
              }
            }
          }

          if (!collectionInfo) {
            throw new Error(`Collection not found for fsPath: ${fsPath}`)
          }

          const id = generateIdFromFsPath(fullPath, collectionInfo)

          await useContentDatabaseAdapter(collectionInfo.name).exec(generateRecordDeletion(collectionInfo, id))
        },
      },
      utils: {
        areEqual: (document1: DatabaseItem, document2: DatabaseItem) => areDocumentsEqual(document1, document2),
        isMatchingContent: async (content: string, document: DatabaseItem) => isDocumentMatchingContent(content, document),
        pickReservedKeys: (document: DatabaseItem) => pickReservedKeysFromDocument(document),
        removeReservedKeys: (document: DatabaseItem) => removeReservedKeysFromDocument(document),
        detectActives: () => {
          const wrappers = document.querySelectorAll('[data-content-id]')
          return Array.from(wrappers).map((wrapper) => {
            const id = wrapper.getAttribute('data-content-id')!
            const title = id.split(/[/:]/).pop() || id

            let collection
            try {
              collection = getCollectionById(id, useContentCollections())
            }
            catch {
              return null
            }

            const sources = (Array.isArray(collection.source) ? collection.source : [collection.source]) as ResolvedCollectionSource[]
            const source = getCollectionSourceById(id, sources)

            // Use fallback logic
            const fsPath = getFsPathFromId(id, collection.name, source)

            return {
              fsPath: stripRootDir(fsPath),
              title,
            }
          }).filter(Boolean) as Array<{ fsPath: string, title: string }>
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

        try {
          const collection = getCollectionById(id, useContentCollections())
          const sources = (Array.isArray(collection.source) ? collection.source : [collection.source]) as ResolvedCollectionSource[]
          const source = getCollectionSourceById(id, sources)

          // Use fallback logic
          const fsPath = getFsPathFromId(id, collection.name, source)

          // @ts-expect-error studio:document:edit is not defined in types
          useNuxtApp().hooks.callHook('studio:document:edit', stripRootDir(fsPath))
        }
        catch (e) {
          console.warn(`[Nuxt Studio] Cannot edit document ${id}: ${e}`)
        }
      }
    })
    // Initialize styles
    host.ui.updateStyles()
  })()

  return host
}
