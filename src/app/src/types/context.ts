export enum StudioFeature {
  Content = 'content',
  Media = 'media',
  Config = 'config',
}

export enum StudioItemActionId {
  CreateFolder = 'create-folder',
  CreateFile = 'create-file',
  RevertItem = 'revert-item',
  RenameItem = 'rename-item',
  DeleteItem = 'delete-item',
  DuplicateItem = 'duplicate-item',
}

export interface StudioAction {
  id: StudioItemActionId
  label: string
  icon: string
  tooltip: string
  handler?: (...args: any) => void
}

export interface CreateFileParams {
  fsPath: string
  routePath: string
  content: string
}
