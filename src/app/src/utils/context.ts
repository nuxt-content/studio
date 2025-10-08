import { type StudioAction, type TreeItem, TreeStatus, StudioItemActionId } from '../types'
import { TreeRootId } from './tree'

export const oneStepActions: StudioItemActionId[] = [StudioItemActionId.RevertItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem]
export const twoStepActions: StudioItemActionId[] = [StudioItemActionId.CreateDocument, StudioItemActionId.CreateFolder, StudioItemActionId.RenameItem]

export const STUDIO_ITEM_ACTION_DEFINITIONS: StudioAction[] = [
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
    id: StudioItemActionId.CreateFolder,
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

export function computeActionItems(itemActions: StudioAction[], item?: TreeItem | null): StudioAction[] {
  if (!item) {
    return itemActions
  }

  const forbiddenActions: StudioItemActionId[] = []

  // Duplicate only available for documents
  if (item.id.startsWith(TreeRootId.Media)) {
    forbiddenActions.push(StudioItemActionId.DuplicateItem, StudioItemActionId.CreateFolder, StudioItemActionId.CreateDocument)
  }
  // Upload only available for medias
  else {
    forbiddenActions.push(StudioItemActionId.UploadMedia)
  }

  // Item type filtering
  switch (item.type) {
    case 'root':
      forbiddenActions.push(StudioItemActionId.RenameItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem)
      break
    case 'file':
      forbiddenActions.push(StudioItemActionId.CreateFolder, StudioItemActionId.CreateDocument, StudioItemActionId.UploadMedia)
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
