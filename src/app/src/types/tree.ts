export enum TreeStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Renamed = 'renamed',
  Opened = 'opened',
}

export interface TreeItem {
  name: string
  fsPath: string // unique identifier
  type: 'file' | 'directory' | 'root'
  prefix: string | null
  status?: TreeStatus
  routePath?: string
  children?: TreeItem[]
  hide?: boolean
}
