export enum TreeRootId {
  Content = 'content',
  Media = 'public-assets',
}

export enum TreeStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Renamed = 'renamed',
  Opened = 'opened',
}

export interface TreeItem {
  name: string
  fsPath: string // can be used as id
  type: 'file' | 'directory' | 'root'
  prefix: number | null
  collections: string[]
  status?: TreeStatus
  routePath?: string
  children?: TreeItem[]
  hide?: boolean
  id: string
}
