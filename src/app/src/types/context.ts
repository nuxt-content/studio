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

export interface StudioAction<K extends StudioItemActionId = StudioItemActionId> {
  id: K
  label: string
  icon: string
  tooltip: string
  handler?: (args: ActionHandlerParams[K]) => void
}

export interface CreateFolderParams {
  fsPath: string
}
export interface CreateFileParams {
  fsPath: string
  routePath: string
  content: string
}

export interface RenameFileParams {
  id: string
  newFsPath: string
}

export interface UploadMediaParams {
  directory: string
  files: File[]
}

export type ActionHandlerParams = {
  [StudioItemActionId.CreateFolder]: CreateFolderParams
  [StudioItemActionId.CreateDocument]: CreateFileParams
  [StudioItemActionId.UploadMedia]: UploadMediaParams
  [StudioItemActionId.RevertItem]: TreeItem
  [StudioItemActionId.RenameItem]: TreeItem | RenameFileParams // Two steps actions (item to rename first then rename params)
  [StudioItemActionId.DeleteItem]: TreeItem
  [StudioItemActionId.DuplicateItem]: TreeItem
}
