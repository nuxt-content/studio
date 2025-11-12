import type { StudioUser } from './user'
import type { DatabaseItem } from './database'
import type { RouteLocationNormalized } from 'vue-router'
import type { MediaItem } from './media'
import type { Repository } from './git'
import type { ComponentMeta } from './component'

export * from './file'
export * from './item'
export * from './draft'
export * from './database'
export * from './user'
export * from './tree'
export * from './git'
export * from './context'
export * from './component'
export * from './config'
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
    manifestUpdate: (fn: (id: string) => void) => void
    documentUpdate: (fn: (fsPath: string, type: 'remove' | 'update') => void) => void
    mediaUpdate: (fn: (fsPath: string, type: 'remove' | 'update') => void) => void
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
    get: (fsPath: string) => Promise<DatabaseItem | undefined>
    list: () => Promise<DatabaseItem[]>
    upsert: (fsPath: string, document: DatabaseItem) => Promise<void>
    create: (fsPath: string, content: string) => Promise<DatabaseItem>
    delete: (fsPath: string) => Promise<void>
    detectActives: () => Array<{ fsPath: string, title: string }>
  }
  media: {
    get: (fsPath: string) => Promise<MediaItem>
    list: () => Promise<MediaItem[]>
    upsert: (fsPath: string, media: MediaItem) => Promise<void>
    delete: (fsPath: string) => Promise<void>
  }
  user: {
    get: () => StudioUser
  }
  app: {
    getManifestId: () => Promise<string>
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
