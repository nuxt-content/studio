import { type StudioAction, StudioFeature, type TreeItem } from '../types'
import { DraftStatus } from '../types/draft'
import { StudioItemActionId } from '../types/context'

export const FEATURE_DISPLAY_MAP = {
  [StudioFeature.Content]: 'Content files',
  [StudioFeature.Media]: 'Media library',
} as const

export const oneStepActions: StudioItemActionId[] = [StudioItemActionId.RevertItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem]
export const twoStepActions: StudioItemActionId[] = [StudioItemActionId.CreateDocument, StudioItemActionId.CreateFolder, StudioItemActionId.RenameItem]

export const STUDIO_ITEM_ACTION_DEFINITIONS: StudioAction[] = [
  {
    id: StudioItemActionId.CreateFolder,
    label: 'Create folder',
    icon: 'i-lucide-folder-plus',
    tooltip: 'Create a new folder',
  },
  {
    id: StudioItemActionId.CreateDocument,
    label: 'Create file',
    icon: 'i-lucide-file-plus',
    tooltip: 'Create a new file',
  },
  {
    id: StudioItemActionId.RevertItem,
    label: 'Revert changes',
    icon: 'i-lucide-undo',
    tooltip: 'Revert changes',
  },
  {
    id: StudioItemActionId.RenameItem,
    label: 'Rename',
    icon: 'i-lucide-pencil',
    tooltip: 'Rename file',
  },
  {
    id: StudioItemActionId.DeleteItem,
    label: 'Delete',
    icon: 'i-lucide-trash',
    tooltip: 'Delete file',
  },
  {
    id: StudioItemActionId.DuplicateItem,
    label: 'Duplicate',
    icon: 'i-lucide-copy',
    tooltip: 'Duplicate file',
  },
] as const

export function computeActionItems(itemActions: StudioAction[], item?: TreeItem | null): StudioAction[] {
  if (!item) {
    return itemActions
  }

  const forbiddenActions: StudioItemActionId[] = []

  if (item.type === 'root') {
    return itemActions.filter(action => ![StudioItemActionId.RenameItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem].includes(action.id))
  }

  // Item type filtering
  switch (item.type) {
    case 'file':
      forbiddenActions.push(StudioItemActionId.CreateFolder, StudioItemActionId.CreateDocument)
      break
    case 'directory':
      forbiddenActions.push(StudioItemActionId.DuplicateItem)
      break
  }

  // Draft status filtering
  switch (item.status) {
    case DraftStatus.Updated:
    case DraftStatus.Created:
      break
    case DraftStatus.Deleted:
      forbiddenActions.push(StudioItemActionId.DuplicateItem, StudioItemActionId.RenameItem, StudioItemActionId.DeleteItem)
      break
    case DraftStatus.Renamed:
      forbiddenActions.push(StudioItemActionId.RenameItem)
      break
    default:
      forbiddenActions.push(StudioItemActionId.RevertItem)
      break
  }

  return itemActions.filter(action => !forbiddenActions.includes(action.id))
}
