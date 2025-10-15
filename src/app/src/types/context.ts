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
  RevertAllItems = 'revert-all-items',
}

export enum StudioBranchActionId {
  PublishBranch = 'publish-branch',
}

export interface StudioActionInProgress {
  id: StudioItemActionId | StudioBranchActionId
  item?: TreeItem
}

export interface StudioAction<K extends StudioItemActionId | StudioBranchActionId> {
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
  content: string
}

export interface RenameFileParams {
  id: string
  newFsPath: string
}

export interface UploadMediaParams {
  parentFsPath: string
  files: File[]
}

export interface PublishBranchParams {
  commitMessage: string
}

export type ActionHandlerParams = {
  // Items
  [StudioItemActionId.CreateFolder]: CreateFolderParams
  [StudioItemActionId.CreateDocument]: CreateFileParams
  [StudioItemActionId.UploadMedia]: UploadMediaParams
  [StudioItemActionId.RevertItem]: TreeItem
  [StudioItemActionId.RenameItem]: TreeItem | RenameFileParams
  [StudioItemActionId.DeleteItem]: TreeItem
  [StudioItemActionId.DuplicateItem]: TreeItem
  [StudioItemActionId.RevertAllItems]: never

  // Branches
  [StudioBranchActionId.PublishBranch]: PublishBranchParams
}
