import { describe, it, expect } from 'vitest'
import { computeItemActions, STUDIO_ITEM_ACTION_DEFINITIONS } from '../../../src/utils/context'
import { StudioItemActionId, type TreeItem, TreeRootId } from '../../../src/types'
import { TreeStatus } from '../../../src/types'

describe('computeItemActions', () => {
  it('should return all actions when item is undefined', () => {
    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, undefined)
    expect(result).toEqual(STUDIO_ITEM_ACTION_DEFINITIONS)
  })

  /**************************************************
   ******************* Root items *******************
   **************************************************/
  it('should filter out actions for content root items', () => {
    const rootItem: TreeItem = {
      id: TreeRootId.Content,
      type: 'root',
      name: 'content',
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.RevertItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for media root items', () => {
    const rootItem: TreeItem = {
      id: TreeRootId.Media,
      type: 'root',
      name: 'media',
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )

    expect(result).toEqual(expectedActions)
  })

  /**************************************************
   ******************* File items *******************
   **************************************************/
  it('should filter out actions for content file items without draft status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft OPENED status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
      status: TreeStatus.Opened,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft UPDATED status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
      status: TreeStatus.Updated,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft CREATED status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
      status: TreeStatus.Created,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft DELETED status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
      status: TreeStatus.Deleted,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft RENAMED status', () => {
    const fileItem: TreeItem = {
      id: 'docs/test.md',
      type: 'file',
      name: 'test.md',
      status: TreeStatus.Renamed,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  /**************************************************
   ****************** Directory items ***************
   **************************************************/

  it('should filter out actions for content directory items without draft status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )

    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft OPENED status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
      status: TreeStatus.Opened,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft UPDATED status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
      status: TreeStatus.Updated,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft CREATED status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
      status: TreeStatus.Created,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft DELETED status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
      status: TreeStatus.Deleted,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft RENAMED status', () => {
    const directoryItem: TreeItem = {
      id: 'docs/folder',
      type: 'directory',
      name: 'folder',
      status: TreeStatus.Renamed,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for media directory items', () => {
    const directoryItem: TreeItem = {
      id: `${TreeRootId.Media}/folder`,
      type: 'directory',
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )
    expect(result).toEqual(expectedActions)
  })
})
