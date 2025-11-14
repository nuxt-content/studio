import { describe, it, expect } from 'vitest'
import { computeItemActions, STUDIO_ITEM_ACTION_DEFINITIONS } from '../../../src/utils/context'
import { StudioItemActionId, StudioFeature, type TreeItem } from '../../../src/types'
import { TreeStatus } from '../../../src/types'

describe('computeItemActions', () => {
  it('should return no actions when item is null', () => {
    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, null, StudioFeature.Content)
    expect(result).toEqual([])
  })

  it('should return no actions when feature is undefined', () => {
    const rootItem: TreeItem = {
      type: 'root',
      name: 'content',
      fsPath: '/',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem, null)
    expect(result).toEqual([])
  })

  /**************************************************
   ******************* Root items *******************
   **************************************************/
  it('should filter out actions for content root items', () => {
    const rootItem: TreeItem = {
      type: 'root',
      name: 'content',
      fsPath: '/',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for media root items', () => {
    const rootItem: TreeItem = {
      type: 'root',
      name: 'media',
      fsPath: '/',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem, StudioFeature.Media)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )

    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for media root items with UPDATED status', () => {
    const rootItem: TreeItem = {
      type: 'root',
      name: 'media',
      fsPath: '/',
      prefix: null,
      status: TreeStatus.Updated,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem, StudioFeature.Media)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )

    expect(result).toEqual(expectedActions)
  })

  /**************************************************
   ******************* File items *******************
   **************************************************/
  it('should filter out actions for content file items without draft status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft OPENED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
      status: TreeStatus.Opened,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft UPDATED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
      status: TreeStatus.Updated,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft CREATED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
      status: TreeStatus.Created,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.UploadMedia,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content file items with draft DELETED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
      status: TreeStatus.Deleted,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
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
      type: 'file',
      name: 'test.md',
      fsPath: 'test.md',
      prefix: null,
      status: TreeStatus.Renamed,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateMediaFolder
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
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )

    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft OPENED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
      status: TreeStatus.Opened,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft UPDATED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
      status: TreeStatus.Updated,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft CREATED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
      status: TreeStatus.Created,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft DELETED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
      status: TreeStatus.Deleted,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for content directory items with draft RENAMED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
      status: TreeStatus.Renamed,
    } as TreeItem

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Content)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.UploadMedia
      && action.id !== StudioItemActionId.CreateMediaFolder,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for media directory items', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      fsPath: 'folder',
      prefix: null,
    }

    const result = computeItemActions(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem, StudioFeature.Media)

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RevertItem
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.CreateDocumentFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )
    expect(result).toEqual(expectedActions)
  })
})
