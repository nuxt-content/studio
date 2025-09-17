import type { StudioUser } from './user'
import type { DatabaseItem } from './database'
import type { RouteLocationNormalized } from 'vue-router'

export * from './draft'
export * from './database'
export * from './user'
export * from './tree'
export * from './github'
export * from './context'
export * from './content'

export interface StudioHost {
  on: {
    routeChange: (fn: (to: RouteLocationNormalized, from: RouteLocationNormalized) => void) => void
    mounted: (fn: () => void) => void
    beforeUnload: (fn: (event: BeforeUnloadEvent) => void) => void
  }
  ui: {
    activateStudio: () => void
    deactivateStudio: () => void
    expandSidebar: () => void
    collapseSidebar: () => void
    expandToolbar: () => void
    collapseToolbar: () => void
    updateStyles: () => void
  }
  document: {
    get: (id: string) => Promise<DatabaseItem>
    getFileSystemPath: (id: string) => string
    list: () => Promise<DatabaseItem[]>
    upsert: (id: string, upsertedDocument: DatabaseItem) => Promise<void>
    delete: (id: string) => Promise<void>
    detectActives: () => Array<{ id: string, title: string }>
  }
  user: {
    get: () => StudioUser
  }
  app: {
    requestRerender: () => void
    navigateTo: (path: string) => void
  }
}

export type UseStudioHost = (user: StudioUser) => StudioHost

declare global {
  interface Window {
    useStudioHost: UseStudioHost
  }
}
