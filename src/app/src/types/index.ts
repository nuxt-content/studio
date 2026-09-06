import type { ComputedRef } from 'vue'
import type { StudioUser } from './user'
import type { DatabaseItem } from './database'
import type { RouteLocationNormalized } from 'vue-router'
import type { MediaItem, MediaConfig } from './media'
import type { Repository } from './git'
import type { ComponentMeta, CommandConfig, SuggestionConfig } from './editor'
import type { MarkdownParsingOptions, SyntaxHighlightTheme } from './content'
import type { CollectionInfo } from '@nuxt/content'

export * from './file'
export * from './item'
export * from './draft'
export * from './database'
export * from './user'
export * from './tree'
export * from './git'
export * from './context'
export * from './editor'
export * from './config'
export * from './media'
export * from './content'
export * from './ai'

export interface StudioHost {
  meta: {
    dev: boolean
    media?: MediaConfig
    git?: {
      commit?: {
        messagePrefix?: string
      }
    }
    ai: {
      enabled: boolean
      experimental: {
        collectionContext: boolean
      }
      context: {
        collectionName: string
        contentFolder: string
      }
    }
    editor: {
      components: {
        get: () => ComponentMeta[]
        hasNuxtUI: ComputedRef<boolean>
        getGroups: (fallbackLabel: string) => Array<{ label: string, components: ComponentMeta[] }>
      }
      commands: CommandConfig
      suggestion: SuggestionConfig
      iconLibraries?: string[]
      highlightTheme: SyntaxHighlightTheme
      markdown?: { contentHeading?: boolean }
    }
    defaultLocale: string
  }
  on: {
    routeChange: (fn: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => void
    mounted: (fn: () => void) => void
    beforeUnload: (fn: (event: BeforeUnloadEvent) => void) => void
    colorModeChange: (fn: (colorMode: 'light' | 'dark') => void) => void
    manifestUpdate: (fn: (id: string) => void) => void
    documentUpdate: (fn: (fsPath: string, type: 'remove' | 'update') => void) => void
    mediaUpdate: (fn: (fsPath: string, type: 'remove' | 'update') => void) => void
    requestDocumentEdit: (fn: (fsPath: string) => void) => void
  }
  ui: {
    colorMode: 'light' | 'dark'
    activateStudio: () => void
    deactivateStudio: () => void
    expandSidebar: () => void
    collapseSidebar: () => void
    updateStyles: () => void
  }
  repository: Repository
  document: {
    db: {
      get: (fsPath: string) => Promise<DatabaseItem | undefined>
      list: () => Promise<DatabaseItem[]>
      upsert: (fsPath: string, document: DatabaseItem) => Promise<void>
      create: (fsPath: string, content: string) => Promise<DatabaseItem>
      delete: (fsPath: string) => Promise<void>
    }
    utils: {
      areEqual: (document1: DatabaseItem, document2: DatabaseItem) => Promise<boolean>
      isMatchingContent: (content: string, document: DatabaseItem) => Promise<boolean>
      pickReservedKeys: (document: DatabaseItem) => DatabaseItem
      cleanDataKeys: (document: DatabaseItem) => DatabaseItem
      // Legacy compat — delete when @nuxt/content returns MarkdownDocument natively.
      ensureComarkBody: (document: DatabaseItem) => DatabaseItem
      detectActives: () => Array<{ fsPath: string, title: string }>
    }
    generate: {
      documentFromContent: (id: string, content: string, options?: MarkdownParsingOptions) => Promise<DatabaseItem | null>
      contentFromDocument: (document: DatabaseItem) => Promise<string | null>
    }
  }
  media: {
    get: (fsPath: string) => Promise<MediaItem>
    list: () => Promise<MediaItem[]>
    upsert: (fsPath: string, media: MediaItem) => Promise<void>
    delete: (fsPath: string) => Promise<void>
  }
  collection: {
    getByFsPath: (fsPath: string) => CollectionInfo | undefined
    list: () => CollectionInfo[]
  }
  user: {
    get: () => StudioUser
  }
  app: {
    getManifestId: () => Promise<string>
    requestRerender: () => void
    navigateTo: (path: string) => void
    getCurrentRoute: () => RouteLocationNormalized
    registerServiceWorker: () => void
    unregisterServiceWorker: () => void
  }
}

export type UseStudioHost = () => StudioHost

declare global {
  interface Window {
    useStudioHost: UseStudioHost
  }
}
