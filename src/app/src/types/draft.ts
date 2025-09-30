import type { GithubFile } from './git'
import type { DatabaseItem } from './database'
import type { MediaItem } from './media'

export enum DraftStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Renamed = 'renamed',
  Opened = 'opened',
}

export interface DraftItem<T = DatabaseItem | MediaItem> {
  id: string // nuxt/content id
  fsPath: string // file path in content directory
  status: DraftStatus // status

  githubFile?: GithubFile // file fetched on gh
  original?: T
  modified?: T
  /**
   * - String: Markdown for docuemnts
   * - Buffer: Media content
   */
  raw?: string | Buffer
}

// export interface DraftItem extends DraftItem {
//   originalDatabaseItem?: DatabaseItem // original collection document saved in db
//   originalGithubFile?: GithubFile // file fetched on gh
//   content?: string // Drafted raw markdown content
//   document?: DatabaseItem // Drafted parsed AST (body, frontmatter...)
// }

// export interface DraftItem extends DraftItem {
//   originalMediaItem?: MediaItem // original collection document saved in db
//   originalGithubFile?: GithubFile // file fetched on gh
//   content?: Buffer // Drafted raw media content
//   media?: MediaItem // Drafted parsed AST (body, frontmatter...)

//   //
//   oldPath?: string // Old path in public directory (used for revert a renamed file)
//   // content?: string // Base64 value
//   url?: string // Public gh url

//   // Image metas
//   width?: number
//   height?: number
//   size?: number
//   mimeType?: string
// }
