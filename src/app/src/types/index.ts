import type { StudioUser } from './user'
import type { DatabaseItem } from './database'
import type { RouteLocationNormalized } from 'vue-router'
import type { MediaItem } from './media'
import type { Repository } from './git'
import type { ComponentMeta } from './component'

export * from './item'
export * from './draft'
export * from './database'
export * from './media'
export * from './user'
export * from './tree'
export * from './git'
export * from './context'
export * from './content'
export * from './component'
export * from './ui'
export * from './media'

export interface StudioHost {
  meta: {
    dev: boolean
    components: () => ComponentMeta[]
  }
  on: {
    routeChange: (fn: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => void
    mounted: (fn: () => void) => void
    beforeUnload: (fn: (event: BeforeUnloadEvent) => void) => void
    colorModeChange: (fn: (colorMode: 'light' | 'dark') => void) => void
    documentUpdate: (fn: (id: string, type: 'remove' | 'update') => void) => void
    mediaUpdate: (fn: (id: string, type: 'remove' | 'update') => void) => void
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
    get: (id: string) => Promise<DatabaseItem>
    getFileSystemPath: (id: string) => string
    list: () => Promise<DatabaseItem[]>
    upsert: (id: string, document: DatabaseItem) => Promise<void>
    create: (fsPath: string, content: string) => Promise<DatabaseItem>
    delete: (id: string) => Promise<void>
    detectActives: () => Array<{ id: string, title: string }>
  }
  media: {
    get: (id: string) => Promise<MediaItem>
    getFileSystemPath: (id: string) => string
    list: () => Promise<MediaItem[]>
    upsert: (id: string, media: MediaItem) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  user: {
    get: () => StudioUser
  }
  app: {
    requestRerender: () => void
    navigateTo: (path: string) => void
  }
}

export type UseStudioHost = () => StudioHost

declare global {
  interface Window {
    useStudioHost: UseStudioHost
  }
}
