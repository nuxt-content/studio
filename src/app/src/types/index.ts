import type { CollectionItemBase, PageCollectionItemBase, DataCollectionItemBase } from '@nuxt/content'

export interface ContentStudioUser {
  githubId: string,
  githubToken: string,
  name: string,
  avatar: string,
  email: string,
  provider: 'github' | 'google',
}


export interface StudioHost {
  on: {
    routeChange: (fn: () => void) => void
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
  requestRerender: () => void
}

export type UseStudioHost = (user: ContentStudioUser) => StudioHost

declare global {
  interface Window {
    useStudioHost: UseStudioHost
  }
}

export interface DatabaseItem extends CollectionItemBase {
  [key: string]: unknown
}

export interface DatabasePageItem extends PageCollectionItemBase {
  [key: string]: unknown
}

export interface DatabaseDataItem extends DataCollectionItemBase {
  [key: string]: unknown
}

export interface GithubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  content?: string
  encoding?: string
  _links: {
    self: string
    git: string
    html: string
  }
}

export interface DraftFileItem {
  id: string // nuxt/content id
  path: string // file path in content directory
  originalDatabaseItem?: DatabaseItem // original collection document saved in db
  originalGithubFile?: GithubFile // file fetched on gh
  content?: string // Drafted raw markdown content
  document?: DatabaseItem // Drafted parsed AST (body, frontmatter...)
  status: 'deleted' | 'created' | 'updated' // Draft status
}

export interface DraftFileItem {
  id: string // nuxt/content id
  path: string // file path in public directory
  oldPath?: string // Old path in public directory (used for revert a renamed file)
  content?: string // Base64 value
  url?: string // Public gh url

  // Image metas
  width?: number
  height?: number
  size?: number
  mimeType?: string

  status: 'deleted' | 'created' | 'updated' // Draft status
}

// export interface ConfigItem { ... }
