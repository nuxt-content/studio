import type { TreeItem } from './tree'

export enum StudioFeature {
  Content = 'content',
  Media = 'media',
}

export enum StudioItemActionId {
  CreateFolder = 'create-folder',
  CreateDocument = 'create-document',
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
  handler?: (args: string & CreateFileParams & RenameFileParams) => void
}

export interface CreateFileParams {
  fsPath: string
  routePath: string
  content: string
}

export interface RenameFileParams {
  path: string
  file: TreeItem
}

export type ActionHandlerParams = {
  [StudioItemActionId.CreateFolder]: string
  [StudioItemActionId.CreateDocument]: CreateFileParams
  [StudioItemActionId.RevertItem]: string
  [StudioItemActionId.RenameItem]: RenameFileParams
  [StudioItemActionId.DeleteItem]: string
  [StudioItemActionId.DuplicateItem]: string
}
