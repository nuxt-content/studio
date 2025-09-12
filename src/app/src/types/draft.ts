import type { GithubFile } from './github'
import type { DatabaseItem } from './database'

export enum DraftStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Renamed = 'renamed',
  Opened = 'opened',
}
export interface DraftItem {
  id: string // nuxt/content id
  path: string // file path in content directory
  status: DraftStatus // status
}

export interface DraftFileItem extends DraftItem {
  originalDatabaseItem?: DatabaseItem // original collection document saved in db
  originalGithubFile?: GithubFile // file fetched on gh
  content?: string // Drafted raw markdown content
  document?: DatabaseItem // Drafted parsed AST (body, frontmatter...)
}

export interface DraftMediaItem extends DraftItem {
  oldPath?: string // Old path in public directory (used for revert a renamed file)
  content?: string // Base64 value
  url?: string // Public gh url

  // Image metas
  width?: number
  height?: number
  size?: number
  mimeType?: string
}
