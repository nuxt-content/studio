import { describe, it, expect } from 'vitest'
import { computeActionItems, STUDIO_ITEM_ACTION_DEFINITIONS } from '../../src/utils/context'
import { StudioItemActionId, type TreeItem } from '../../src/types'
import { DraftStatus } from '../../src/types/draft'

describe('computeActionItems', () => {
  it('should return all actions when item is undefined', () => {
    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, undefined)
    expect(result).toEqual(STUDIO_ITEM_ACTION_DEFINITIONS)
  })

  /**************************************************
   ******************* Root items *******************
   **************************************************/
  it('should filter out actions for root items', () => {
    const rootItem: TreeItem = {
      type: 'root',
      name: 'content',
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, rootItem)

    expect(result.find(action => action.id === StudioItemActionId.RenameItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.DeleteItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem
      && action.id !== StudioItemActionId.DuplicateItem,
    )
    expect(result).toEqual(expectedActions)
  })

  /**************************************************
   ******************* File items *******************
   **************************************************/
  it('should filter out actions for file items without draft status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md'
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RevertItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for file items with draft OPENED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      status: DraftStatus.Opened,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RevertItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RevertItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for file items with draft UPDATED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      status: DraftStatus.Updated,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for file items with draft CREATED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      status: DraftStatus.Created,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for file items with draft DELETED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      status: DraftStatus.Deleted,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RenameItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.DeleteItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for file items with draft RENAMED status', () => {
    const fileItem: TreeItem = {
      type: 'file',
      name: 'test.md',
      status: DraftStatus.Renamed,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, fileItem)

    expect(result.find(action => action.id === StudioItemActionId.CreateFolder)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.CreateDocument)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RenameItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.CreateFolder
      && action.id !== StudioItemActionId.CreateDocument
      && action.id !== StudioItemActionId.RenameItem,
    )
    expect(result).toEqual(expectedActions)
  })

  /**************************************************
   ****************** Directory items ***************
   **************************************************/

  it('should filter out actions for directory items without draft status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RevertItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for directory items with draft OPENED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      status: DraftStatus.Opened,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RevertItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RevertItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for directory items with draft UPDATED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      status: DraftStatus.Updated,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for directory items with draft CREATED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      status: DraftStatus.Created,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for directory items with draft DELETED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      status: DraftStatus.Deleted,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RenameItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.DeleteItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem
      && action.id !== StudioItemActionId.DeleteItem,
    )
    expect(result).toEqual(expectedActions)
  })

  it('should filter out actions for directory items with draft RENAMED status', () => {
    const directoryItem: TreeItem = {
      type: 'directory',
      name: 'folder',
      status: DraftStatus.Renamed,
    } as TreeItem

    const result = computeActionItems(STUDIO_ITEM_ACTION_DEFINITIONS, directoryItem)

    expect(result.find(action => action.id === StudioItemActionId.DuplicateItem)).toBeUndefined()
    expect(result.find(action => action.id === StudioItemActionId.RenameItem)).toBeUndefined()

    const expectedActions = STUDIO_ITEM_ACTION_DEFINITIONS.filter(action =>
      action.id !== StudioItemActionId.DuplicateItem
      && action.id !== StudioItemActionId.RenameItem,
    )
    expect(result).toEqual(expectedActions)
  })
})
