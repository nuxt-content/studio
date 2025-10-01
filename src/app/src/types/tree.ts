export enum TreeStatus {
  Deleted = 'deleted',
  Created = 'created',
  Updated = 'updated',
  Renamed = 'renamed',
  Opened = 'opened',
}

export interface TreeItem {
  id: string
  name: string
  fsPath: string
  type: 'file' | 'directory' | 'root'
  status?: TreeStatus
  routePath?: string
  children?: TreeItem[]
  /**
   * Preview image for the item inside the tree
   */
  preview?: string
}
