import { type StudioAction, type TreeItem, TreeStatus, StudioItemActionId, StudioBranchActionId, StudioFeature } from '../types'

export const oneStepActions: StudioItemActionId[] = [StudioItemActionId.RevertItem, StudioItemActionId.DeleteItem, StudioItemActionId.DuplicateItem]
export const twoStepActions: StudioItemActionId[] = [StudioItemActionId.CreateDocument, StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateMediaFolder, StudioItemActionId.RenameItem]

export const STUDIO_ITEM_ACTION_DEFINITIONS: StudioAction<StudioItemActionId>[] = [
  {
    id: StudioItemActionId.RevertItem,
    label: 'studio.actions.labels.revert-item',
    icon: 'i-lucide-undo',
    tooltip: 'studio.actions.tooltips.revert-item',
  },
  {
    id: StudioItemActionId.CreateDocument,
    label: 'studio.actions.labels.create-document',
    icon: 'i-lucide-file-plus',
    tooltip: 'studio.actions.tooltips.create-document',
  },
  {
    id: StudioItemActionId.UploadMedia,
    label: 'studio.actions.labels.upload-media',
    icon: 'i-lucide-upload',
    tooltip: 'studio.actions.tooltips.upload-media',
  },
  {
    id: StudioItemActionId.CreateDocumentFolder,
    label: 'studio.actions.labels.create-document-folder',
    icon: 'i-lucide-folder-plus',
    tooltip: 'studio.actions.tooltips.create-document-folder',
  },
  {
    id: StudioItemActionId.CreateMediaFolder,
    label: 'studio.actions.labels.create-media-folder',
    icon: 'i-lucide-folder-plus',
    tooltip: 'studio.actions.tooltips.create-media-folder',
  },
  {
    id: StudioItemActionId.RenameItem,
    label: 'studio.actions.labels.rename-item',
    icon: 'i-lucide-pencil',
    tooltip: 'studio.actions.tooltips.rename-item',
  },
  {
    id: StudioItemActionId.DuplicateItem,
    label: 'studio.actions.labels.duplicate-item',
    icon: 'i-lucide-copy',
    tooltip: 'studio.actions.tooltips.duplicate-item',
  },
  {
    id: StudioItemActionId.DeleteItem,
    label: 'studio.actions.labels.delete-item',
    icon: 'i-lucide-trash',
    tooltip: 'studio.actions.tooltips.delete-item',
  },
] as const

export const STUDIO_BRANCH_ACTION_DEFINITIONS: StudioAction<StudioBranchActionId>[] = [{
  id: StudioBranchActionId.PublishBranch,
  label: 'studio.actions.labels.publish-branch',
  icon: 'i-lucide-rocket',
  tooltip: 'studio.actions.tooltips.publish-branch',
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
