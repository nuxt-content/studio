import type { TreeItem } from './tree'

export enum StudioFeature {
  Content = 'content',
  Media = 'media',
}

export enum StudioItemActionId {
  CreateFolder = 'create-folder',
  CreateDocument = 'create-document',
  UploadMedia = 'upload-media',
  RevertItem = 'revert-item',
  RenameItem = 'rename-item',
  DeleteItem = 'delete-item',
  DuplicateItem = 'duplicate-item',
}

export interface StudioActionInProgress {
  id: StudioItemActionId
  item?: TreeItem
}

export interface StudioAction {
  id: StudioItemActionId
  label: string
  icon: string
  tooltip: string
  handler?: (args: ActionHandlerParams[StudioItemActionId]) => void
}

export interface CreateFileParams {
  fsPath: string
  routePath: string
  content: string
}

export interface RenameFileParams {
  id: string
  newNameWithExtension: string
}

export interface UploadMediaParams {
  directory: string
  files: File[]
}

export type ActionHandlerParams = {
  [StudioItemActionId.CreateFolder]: string
  [StudioItemActionId.CreateDocument]: CreateFileParams
  [StudioItemActionId.UploadMedia]: UploadMediaParams
  [StudioItemActionId.RevertItem]: string
  [StudioItemActionId.RenameItem]: RenameFileParams
  [StudioItemActionId.DeleteItem]: string
  [StudioItemActionId.DuplicateItem]: string
}
