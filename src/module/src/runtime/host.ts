import { ref } from 'vue'
import { ensure } from './utils/ensure'
import type { CollectionItemBase, DatabaseAdapter } from '@nuxt/content'
import type { ContentDatabaseAdapter } from '../types/content'
import { createCollectionDocument, generateRecordDeletion, generateRecordInsert, getCollectionInfo } from './utils/collections'
import { kebabCase } from 'lodash'
import type { UseStudioHost, StudioHost, StudioUser, DatabaseItem } from 'nuxt-studio/app'
import type { RouteLocationNormalized, Router } from 'vue-router'
import { queryCollection, queryCollectionItemSurroundings, queryCollectionNavigation, queryCollectionSearchSections } from '#imports'
import { collections } from '#content/preview'

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

declare global {
  interface Window {
    useStudioHost: UseStudioHost
  }
}

// TODO: Move styles and these logics out of host (Maybe have a injectCSS util in host)
function getHostStyles(): Record<string, Record<string, string>> & { css?: string } {
  const currentWidth = getSidebarWidth()
  return {
    'body[data-studio-active]': {
      transition: 'margin 0.3s ease',
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

export function useStudioHost(user: StudioUser): StudioHost {
  const isMounted = ref(false)
  let localDatabaseAdapter: ContentDatabaseAdapter | null = null

  function useNuxtApp() {
    return window.useNuxtApp!()
  }

  function useContent() {
    const $content = useNuxtApp().$content as { loadLocalDatabase: () => ContentDatabaseAdapter } || {}
    return {
      ...$content,
      queryCollection,
      queryCollectionItemSurroundings,
      queryCollectionNavigation,
      queryCollectionSearchSections,
      collections
    }
  }

  function useContentDatabaseAdapter(collection: string): DatabaseAdapter {
    return localDatabaseAdapter!(collection)
  }

  function useContentCollections() {
    return useContent().collections
  }

  function useContentCollectionQuery(collection: string) {
    return useContent().queryCollection(collection)
  }

  const host: StudioHost = {
    on: {
      routeChange: (fn: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => {
        const router = useNuxtApp().$router as Router
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
    },
    ui: {
      activateStudio: () => {
        document.body.setAttribute('data-studio-active', 'true')
        // host.ui.expandToolbar()
        // host.ui.updateStyles()
      },
      deactivateStudio: () => {
        document.body.removeAttribute('data-studio-active')
        // host.ui.collapseToolbar()
        host.ui.collapseSidebar()
        host.ui.updateStyles()
      },
      // expandToolbar: () => {
      //   document.body.setAttribute('data-expand-toolbar', 'true')
      //   host.ui.updateStyles()
      // },
      // collapseToolbar: () => {
      //   document.body.removeAttribute('data-expand-toolbar')
      //   host.ui.updateStyles()
      // },
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
    // New API
    user: {
      get: () => user,
    },

    document: {
      get: async (id: string): Promise<DatabaseItem> => {
        return useContentCollectionQuery(id.split('/')[0] as string).where('id', '=', id).first() as unknown as Promise<DatabaseItem>
      },
      getFileSystemPath: (id: string) => {
        return getCollectionInfo(id, useContentCollections()).path
      },
      list: async (): Promise<DatabaseItem[]> => {
        const collections = Object.keys(useContentCollections()).filter(c => c !== 'info')
        const contents = await Promise.all(collections.map(async (collection) => {
          return await useContentCollectionQuery(collection).all() as DatabaseItem[]
        }))
        return contents.flat()
      },
      upsert: async (id: string, upsertedDocument: CollectionItemBase) => {
        id = id.replace(/:/g, '/')

        const collection = getCollectionInfo(id, useContentCollections()).collection
        const doc = createCollectionDocument(collection, id, upsertedDocument)

        await useContentDatabaseAdapter(collection.name).exec(generateRecordDeletion(collection, id))
        await useContentDatabaseAdapter(collection.name).exec(generateRecordInsert(collection, doc))
      },
      delete: async (id: string) => {
        id = id.replace(/:/g, '/')

        const collection = getCollectionInfo(id, useContentCollections()).collection
        await useContentDatabaseAdapter(collection.name).exec(generateRecordDeletion(collection, id))
      },
      detectActives: () => {
        // TODO: introduce a new convention to detect data contents [data-content-id!]
        const wrappers = document.querySelectorAll('[data-content-id]')
        return Array.from(wrappers).map((wrapper) => {
          const id = wrapper.getAttribute('data-content-id')!
          const title = id.split(/[/:]/).pop() || id
          return {
            id,
            title,
          }
        })
      },
    },

    app: {
      requestRerender: () => {
        useNuxtApp().hooks.callHookParallel('app:data:refresh')
      },
      navigateTo: (path: string) => {
        useNuxtApp().$router.push(path)
      },
    },
  }

  ;(async () => {
    host.ui.activateStudio()
    // Trigger dummy query to make sure content database is loaded on the client
    // TODO: browse collections and call one of them
    ensure(() => useContent().queryCollection !== void 0, 500)
      // .then(() => useContentCollectionQuery("docs").first())
      .then(() => ensure(() => useContent().loadLocalDatabase !== void 0))
      .then(() => useContent().loadLocalDatabase())
      .then((_localDatabaseAdapter) => {
        localDatabaseAdapter = _localDatabaseAdapter
        isMounted.value = true
      })
  })()

  return host
}
