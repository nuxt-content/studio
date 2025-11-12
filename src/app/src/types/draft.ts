import type { GithubFile } from './git'
import type { DatabaseItem } from './database'
import type { MediaItem } from './media'

export enum DraftStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Pristine = 'pristine',
}

export interface ContentConflict {
  githubContent: string
  localContent: string
}

export interface DraftItem<T = DatabaseItem | MediaItem> {
  fsPath: string // file path in content directory
  status: DraftStatus // status

  githubFile?: GithubFile // file fetched on gh
  original?: T
  modified?: T
  /**
   * - Buffer media content
   */
  raw?: string | Buffer
  /**
   * Version of the draft
   * Incremented when the draft is updated
   * Used to detect changes when the draft is saved
   */
  version?: number
  /**
   * Content conflict detection
   */
  conflict?: ContentConflict
}
