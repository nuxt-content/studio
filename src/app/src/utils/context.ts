import { type StudioAction, type TreeItem, TreeStatus, StudioItemActionId, StudioBranchActionId, StudioFeature } from '../types'

export const oneStepActions: StudioItemActionId[] = [StudioItemActionId.RevertItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem]
export const twoStepActions: StudioItemActionId[] = [StudioItemActionId.CreateDocument, StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateMediaFolder, StudioItemActionId.RenameItem]

export const STUDIO_ITEM_ACTION_DEFINITIONS: StudioAction<StudioItemActionId>[] = [
  {
    id: StudioItemActionId.RevertItem,
    label: 'Revert changes',
    icon: 'i-lucide-undo',
    tooltip: 'Revert changes',
  },
  {
    id: StudioItemActionId.CreateDocument,
    label: 'Create file',
    icon: 'i-lucide-file-plus',
    tooltip: 'Create a new file',
  },
  {
    id: StudioItemActionId.UploadMedia,
    label: 'Upload media',
    icon: 'i-lucide-upload',
    tooltip: 'Upload media',
  },
  {
    id: StudioItemActionId.CreateDocumentFolder,
    label: 'Create folder',
    icon: 'i-lucide-folder-plus',
    tooltip: 'Create a new folder',
  },
  {
    id: StudioItemActionId.CreateMediaFolder,
    label: 'Create folder',
    icon: 'i-lucide-folder-plus',
    tooltip: 'Create a new folder',
  },
  {
    id: StudioItemActionId.RenameItem,
    label: 'Rename',
    icon: 'i-lucide-pencil',
    tooltip: 'Rename file',
  },
  {
    id: StudioItemActionId.DuplicateItem,
    label: 'Duplicate',
    icon: 'i-lucide-copy',
    tooltip: 'Duplicate file',
  },
  {
    id: StudioItemActionId.DeleteItem,
    label: 'Delete',
    icon: 'i-lucide-trash',
    tooltip: 'Delete file',
  },
] as const

export const STUDIO_BRANCH_ACTION_DEFINITIONS: StudioAction<StudioBranchActionId>[] = [{
  id: StudioBranchActionId.PublishBranch,
  label: 'Publish branch',
  icon: 'i-lucide-rocket',
  tooltip: 'Publish branch',
}] as const

export function computeItemActions(itemActions: StudioAction<StudioItemActionId>[], item: TreeItem | null, feature: StudioFeature | null): StudioAction<StudioItemActionId>[] {
  if (!item || !feature) {
    return []
  }

  const forbiddenActions: StudioItemActionId[] = []

  if (feature === StudioFeature.Media) {
    forbiddenActions.push(StudioItemActionId.DuplicateItem, StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateDocument)
  }
  else {
    forbiddenActions.push(StudioItemActionId.UploadMedia, StudioItemActionId.CreateMediaFolder)
  }

  // Item type filtering
  switch (item.type) {
    case 'root':
      forbiddenActions.push(StudioItemActionId.RenameItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem)
      break
    case 'file':
      forbiddenActions.push(StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateMediaFolder, StudioItemActionId.CreateDocument, StudioItemActionId.UploadMedia)
      break
    case 'directory':
      forbiddenActions.push(StudioItemActionId.DuplicateItem)
      break
  }

  // Draft status filtering
  switch (item.status) {
    case TreeStatus.Updated:
    case TreeStatus.Created:
      break
    case TreeStatus.Deleted:
      forbiddenActions.push(StudioItemActionId.DuplicateItem, StudioItemActionId.RenameItem, StudioItemActionId.DeleteItem)
      break
    case TreeStatus.Renamed:
      break
    default:
      forbiddenActions.push(StudioItemActionId.RevertItem)
      break
  }

  return itemActions.filter(action => !forbiddenActions.includes(action.id))
}
