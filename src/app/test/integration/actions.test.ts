import { describe, it, expect, beforeEach, vi } from 'vitest'
import { joinURL } from 'ufo'
import { DraftStatus, StudioItemActionId, StudioFeature, type StudioHost, type TreeItem, type DatabaseItem } from '../../src/types'
import { normalizeKey, generateUniqueDocumentFsPath, generateUniqueMediaFsPath } from '../utils'
import { createMockHost, clearMockHost, fsPathToId } from '../mocks/host'
import { createMockGit } from '../mocks/git'
import { createMockFile, createMockMedia, setupMediaMocks } from '../mocks/media'
import { createMockStorage } from '../mocks/composables'
import type { useGit } from '../../src/composables/useGit'
import { findItemFromFsPath } from '../../src/utils/tree'

const mockStorageDraft = createMockStorage()
const mockHost = createMockHost()
const mockGit = createMockGit()

let currentRouteName = 'content'

vi.mock('unstorage/drivers/indexedb', () => ({
  default: () => ({
    async getItem(key: string) {
      return mockStorageDraft.get(key) || null
    },
    async setItem(key: string, value: string) {
      mockStorageDraft.set(key, value)
    },
    async removeItem(key: string) {
      mockStorageDraft.delete(key)
    },
    async getKeys() {
      return Array.from(mockStorageDraft.keys())
    },
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return currentRouteName
    },
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

const cleanAndSetupContext = async (mockedHost: StudioHost, mockedGit: ReturnType<typeof useGit>) => {
  // Reset mocks
  vi.clearAllMocks()
  mockStorageDraft.clear()
  clearMockHost()

  // Reset all composables to kill previous instances
  vi.resetModules()

  // Re-import composables to get fresh instances after resetModules
  const { useDraftDocuments } = await import('../../src/composables/useDraftDocuments')
  const { useDraftMedias } = await import('../../src/composables/useDraftMedias')
  const { useTree } = await import('../../src/composables/useTree')
  const { useContext } = await import('../../src/composables/useContext')

  // Initialize document tree
  const draftDocuments = useDraftDocuments(mockedHost, mockedGit)
  const documentTree = useTree(StudioFeature.Content, mockedHost, draftDocuments)

  // Initialize media tree
  const draftMedias = useDraftMedias(mockedHost, mockedGit)
  const mediaTree = useTree(StudioFeature.Media, mockedHost, draftMedias)

  // Initialize context
  return useContext(mockedHost, mockedGit, documentTree, mediaTree)
}

describe('Document - Action Chains Integration Tests', () => {
  let filename: string
  let documentFsPath: string
  let documentId: string
  let context: Awaited<ReturnType<typeof cleanAndSetupContext>>

  beforeEach(async () => {
    currentRouteName = 'content'
    filename = 'document'
    documentFsPath = generateUniqueDocumentFsPath(filename)
    documentId = fsPathToId(documentFsPath, 'document')
    context = await cleanAndSetupContext(mockHost, mockGit)
  })

  it('Create > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    /* STEP 1: CREATE */
    await context.itemActionHandler[StudioItemActionId.CreateDocument]({
      fsPath: documentFsPath,
      content: 'Test content',
    })

    // Draft in Storage
    expect(mockStorageDraft.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)
    expect(storedDraft).toHaveProperty('fsPath', documentFsPath)
    expect(storedDraft.modified).toHaveProperty('id', documentId)
    expect(storedDraft.modified).toHaveProperty('fsPath', documentFsPath)
    expect(JSON.stringify(storedDraft.modified.body)).toContain('Test content')
    expect(storedDraft.original).toBeUndefined()

    // Draft in Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].original).toBeUndefined()

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)

    /* STEP 2: REVERT */
    await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

    // Draft in Storage
    expect(mockStorageDraft.size).toEqual(0)

    // Draft In memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(0)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.revert')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
  })

  it('Create > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    /* STEP 1: CREATE */
    await context.itemActionHandler[StudioItemActionId.CreateDocument]({
      fsPath: documentFsPath,
      content: 'Test content',
    })

    /* STEP 2: RENAME */
    const newFsPath = generateUniqueDocumentFsPath('document-renamed')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      newFsPath,
      item: {
        type: 'file',
        fsPath: documentFsPath,
      } as TreeItem,
    })

    // Draft in Storage
    expect(mockStorageDraft.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', fsPathToId(newFsPath, 'document'))
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.original).toBeUndefined()

    // Draft in Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0].status).toEqual(DraftStatus.Created)
    expect(list[0]).toHaveProperty('fsPath', newFsPath)
    expect(list[0].modified).toHaveProperty('id', fsPathToId(newFsPath, 'document'))
    expect(list[0].modified).toHaveProperty('fsPath', newFsPath)
    expect(list[0].original).toBeUndefined()

    // Tree
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('status', DraftStatus.Created)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
  })

  it('Create > Update > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    /* STEP 1: CREATE */
    await context.itemActionHandler[StudioItemActionId.CreateDocument]({
      fsPath: documentFsPath,
      content: 'Test content',
    })

    /* STEP 2: UPDATE */
    const currentDraft = context.activeTree.value.draft.list.value[0]
    const updatedDocument = {
      ...currentDraft.modified!,
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    } as DatabaseItem
    await context.activeTree.value.draft.update(documentFsPath, updatedDocument as DatabaseItem)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)
    expect(storedDraft).toHaveProperty('fsPath', documentFsPath)
    expect(storedDraft.modified).toHaveProperty('id', documentId)
    expect(storedDraft.modified).toHaveProperty('fsPath', documentFsPath)
    expect(storedDraft.modified).toHaveProperty('body', updatedDocument.body)
    expect(storedDraft.original).toBeUndefined()

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Created)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].original).toBeUndefined()

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)

    /* STEP 3: REVERT */
    await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

    // Storage
    expect(mockStorageDraft.size).toEqual(0)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(0)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.revert')
  })

  it('Select > Update > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create document in db and load tree
    await mockHost.document.db.create(documentFsPath, 'Test content')
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(documentFsPath)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const selectedDraft = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(selectedDraft).toHaveProperty('status', DraftStatus.Pristine)
    expect(selectedDraft).toHaveProperty('fsPath', documentFsPath)
    expect(selectedDraft.modified).toHaveProperty('id', documentId)
    expect(selectedDraft.modified).toHaveProperty('fsPath', documentFsPath)
    expect(selectedDraft.original).toHaveProperty('id', documentId)
    expect(selectedDraft.original).toHaveProperty('fsPath', documentFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Pristine)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('fsPath', documentFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)

    /* STEP 2: UPDATE */
    const currentDraft = context.activeTree.value.draft.list.value[0]
    const updatedDocument = {
      ...currentDraft.modified!,
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    } as DatabaseItem
    await context.activeTree.value.draft.update(documentFsPath, updatedDocument)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Updated)
    expect(storedDraft).toHaveProperty('fsPath', documentFsPath)
    expect(storedDraft.modified).toHaveProperty('id', documentId)
    expect(storedDraft.modified).toHaveProperty('fsPath', documentFsPath)
    expect(storedDraft.modified).toHaveProperty('body', updatedDocument.body)
    expect(storedDraft.original).toHaveProperty('id', documentId)
    expect(storedDraft.original).toHaveProperty('fsPath', documentFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Updated)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('fsPath', documentFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.root.value[0].status).toEqual('updated')

    /* STEP 3: REVERT */
    await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const revertedDraft = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(revertedDraft).toHaveProperty('status', DraftStatus.Pristine)
    expect(revertedDraft).toHaveProperty('fsPath', documentFsPath)
    expect(revertedDraft.modified).toHaveProperty('id', documentId)
    expect(revertedDraft.modified).toHaveProperty('fsPath', documentFsPath)
    expect(revertedDraft.original).toHaveProperty('id', documentId)
    expect(revertedDraft.original).toHaveProperty('fsPath', documentFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Pristine)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].original).toHaveProperty('fsPath', documentFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.update')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.revert')
  })

  it('Select > Update > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create document in db and load tree
    await mockHost.document.db.create(documentFsPath, 'Test content')
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(documentFsPath)

    /* STEP 2: UPDATE */
    const currentDraft = context.activeTree.value.draft.list.value[0]
    const updatedDocument = {
      ...currentDraft.modified!,
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    } as DatabaseItem
    await context.activeTree.value.draft.update(documentFsPath, updatedDocument)

    /* STEP 3: RENAME */
    const newFsPath = generateUniqueDocumentFsPath('document-renamed')
    const newId = fsPathToId(newFsPath, 'document')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: documentFsPath,
      } as TreeItem,
      newFsPath,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.original).toHaveProperty('id', documentId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)
    expect(JSON.stringify(createdDraftStorage.modified.body)).toContain('Updated content')

    // Deleted original draft
    const deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(2)

    expect(list[0].status).toEqual(DraftStatus.Deleted)
    expect(list[0]).toHaveProperty('fsPath', documentFsPath)
    expect(list[0].original).toHaveProperty('id', documentId)
    expect(list[0].original).toHaveProperty('fsPath', documentFsPath)
    expect(list[0].modified).toBeUndefined()

    expect(list[1].status).toEqual(DraftStatus.Created)
    expect(list[1]).toHaveProperty('fsPath', newFsPath)
    expect(list[1].original).toHaveProperty('id', documentId)
    expect(list[1].original).toHaveProperty('fsPath', documentFsPath)
    expect(list[1].modified).toHaveProperty('id', newId)
    expect(list[1].modified).toHaveProperty('fsPath', newFsPath)
    expect(JSON.stringify(list[1].modified!.body)).toContain('Updated content')

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.update')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
  })

  it('Select > Rename > Update', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create document in db and load tree
    await mockHost.document.db.create(documentFsPath, 'Test content')
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(documentFsPath)

    /* STEP 2: RENAME */
    const newFsPath = generateUniqueDocumentFsPath('document-renamed')
    const newId = fsPathToId(newFsPath, 'document')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: documentFsPath,
      } as TreeItem,
      newFsPath,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.original).toHaveProperty('id', documentId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)

    // Deleted original draft
    let deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(2)

    // Deleted original draft
    let deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === documentFsPath)
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory!.original).toHaveProperty('id', documentId)
    expect(deletedDraftMemory!.original).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftMemory!.modified).toBeUndefined()

    // Created renamed draft
    const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === newFsPath)
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftMemory!.original).toHaveProperty('id', documentId)
    expect(createdDraftMemory!.original).toHaveProperty('fsPath', documentFsPath)
    expect(createdDraftMemory!.modified).toHaveProperty('id', newId)
    expect(createdDraftMemory!.modified).toHaveProperty('fsPath', newFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)

    /* STEP 3: UPDATE */
    const currentDraft = context.activeTree.value.draft.list.value.find(item => item.fsPath === newFsPath)!
    const updatedDocument = {
      ...currentDraft.modified!,
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    } as DatabaseItem
    await context.activeTree.value.draft.update(newFsPath, updatedDocument)

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Updated renamed draft
    const updatedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(updatedDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(updatedDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(updatedDraftStorage.original).toHaveProperty('id', documentId)
    expect(updatedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(updatedDraftStorage.modified).toHaveProperty('id', newId)
    expect(updatedDraftStorage.modified).toHaveProperty('fsPath', newFsPath)
    expect(updatedDraftStorage.modified).toHaveProperty('body', updatedDocument.body)

    // Deleted original draft
    deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(2)

    // Deleted original draft
    deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === documentFsPath)
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory!.original).toHaveProperty('id', documentId)
    expect(deletedDraftMemory!.original).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftMemory!.modified).toBeUndefined()

    // Renamed original draft
    const updatedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === newFsPath)!
    expect(updatedDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(updatedDraftMemory).toHaveProperty('fsPath', newFsPath)
    expect(updatedDraftMemory!.original).toHaveProperty('id', documentId)
    expect(updatedDraftMemory!.original).toHaveProperty('fsPath', documentFsPath)
    expect(updatedDraftMemory!.modified).toHaveProperty('id', newId)
    expect(updatedDraftMemory!.modified).toHaveProperty('fsPath', newFsPath)
    expect(updatedDraftMemory!.modified).toHaveProperty('body', updatedDocument.body)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(3)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.load')
    // Update is not called because status is the same (from created to created)
    expect(consoleInfoSpy).not.toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.update')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
  })

  it('Select > Rename > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create document in db and load tree
    await mockHost.document.db.create(documentFsPath, 'Test content')
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(documentFsPath)

    /* STEP 2: RENAME */
    const newFsPath = generateUniqueDocumentFsPath('document-renamed')
    const _newId = fsPathToId(newFsPath, 'document')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: documentFsPath,
      } as TreeItem,
      newFsPath,
    })

    /* STEP 3: REVERT */
    const renamedTreeItem = context.activeTree.value.root.value[0]
    expect(renamedTreeItem).toHaveProperty('fsPath', newFsPath)

    await context.itemActionHandler[StudioItemActionId.RevertItem](renamedTreeItem)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const openedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(openedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(openedDraftStorage).toHaveProperty('fsPath', documentFsPath)
    expect(openedDraftStorage.modified).toHaveProperty('id', documentId)
    expect(openedDraftStorage.modified).toHaveProperty('fsPath', documentFsPath)
    expect(openedDraftStorage.original).toHaveProperty('id', documentId)
    expect(openedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list[0]).toHaveProperty('fsPath', documentFsPath)
    expect(list[0].modified).toHaveProperty('id', documentId)
    expect(list[0].modified).toHaveProperty('fsPath', documentFsPath)
    expect(list[0].original).toHaveProperty('id', documentId)
    expect(list[0].original).toHaveProperty('fsPath', documentFsPath)
    expect(list[0].original).toHaveProperty('fsPath', documentFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', documentFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.revert')
  })

  it('Select > Rename > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create document in db and load tree
    await mockHost.document.db.create(documentFsPath, 'Test content')
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(documentFsPath)

    /* STEP 2: RENAME */
    const newFsPath = generateUniqueDocumentFsPath('document-renamed')
    const _newId = fsPathToId(newFsPath, 'document')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: documentFsPath,
      } as TreeItem,
      newFsPath,
    })

    /* STEP 3: RENAME */
    const newFsPath2 = generateUniqueDocumentFsPath('document-renamed-again')
    const newId2 = fsPathToId(newFsPath2, 'document')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: newFsPath,
      } as TreeItem,
      newFsPath: newFsPath2,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Created renamed draft (newFsPath2)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath2))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath2)
    expect(createdDraftStorage.original).toHaveProperty('id', documentId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId2)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath2)

    // Deleted original draft (documentFsPath)
    const deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(documentFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(2)

    // Created renamed draft (newFsPath2)
    const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === newFsPath2)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', newFsPath2)
    expect(createdDraftMemory.original).toHaveProperty('id', documentId)
    expect(createdDraftMemory.original).toHaveProperty('fsPath', documentFsPath)
    expect(createdDraftMemory.modified).toHaveProperty('id', newId2)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', newFsPath2)

    // Deleted original draft (documentFsPath)
    const deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === documentFsPath)!
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('fsPath', documentFsPath)
    expect(deletedDraftMemory.original).toHaveProperty('id', documentId)
    expect(deletedDraftMemory.modified).toBeUndefined()

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath2)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
  })
})

describe('Media - Action Chains Integration Tests', () => {
  let context: Awaited<ReturnType<typeof cleanAndSetupContext>>
  let mediaName: string
  let mediaFsPath: string
  let mediaId: string
  const parentPath = ''

  beforeEach(async () => {
    setupMediaMocks()

    currentRouteName = 'media'
    mediaFsPath = generateUniqueMediaFsPath('media', 'png')
    mediaId = fsPathToId(mediaFsPath, 'media')
    mediaName = mediaFsPath.split('/').pop()! // Extract filename from fsPath
    context = await cleanAndSetupContext(mockHost, mockGit)
  })

  it('Upload > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    const file = createMockFile(mediaName)

    /* STEP 1: UPLOAD */
    await context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: parentPath,
      files: [file],
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftStorage.original).toBeUndefined()
    expect(createdDraftStorage.modified).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    const createdDraftMemory = context.activeTree.value.draft.list.value[0]
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftMemory.original).toBeUndefined()
    expect(createdDraftMemory.modified).toHaveProperty('id', mediaId)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', mediaFsPath)

    /* STEP 2: REVERT */
    const mediaTreeItem = context.activeTree.value.root.value[0]
    await context.itemActionHandler[StudioItemActionId.RevertItem](mediaTreeItem)

    // Storage
    expect(mockStorageDraft.size).toEqual(0)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(0)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.revert')
  })

  it('Upload > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    const file = createMockFile(mediaName)

    /* STEP 1: UPLOAD */
    await context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: parentPath,
      files: [file],
    })

    /* STEP 2: RENAME */
    const newFsPath = generateUniqueMediaFsPath('media-renamed', 'png')
    const newId = fsPathToId(newFsPath, 'media')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: mediaFsPath,
      } as TreeItem,
      newFsPath,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.original).toBeUndefined()
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0].status).toEqual(DraftStatus.Created)
    expect(list[0]).toHaveProperty('fsPath', newFsPath)
    expect(list[0].original).toBeUndefined()
    expect(list[0].modified).toHaveProperty('id', newId)
    expect(list[0].modified).toHaveProperty('fsPath', newFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('status', DraftStatus.Created)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftMedias.rename')
  })

  it('Select > Delete > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create media in db and load tree
    await mockHost.media.upsert(mediaFsPath, createMockMedia(mediaId))
    await context.activeTree.value.draft.load()

    /* STEP 1: SELECT */
    await context.activeTree.value.selectItemByFsPath(mediaFsPath)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(createdDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    const createdDraftMemory = context.activeTree.value.draft.list.value[0]
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Pristine)
    expect(createdDraftMemory).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftMemory.original).toHaveProperty('id', mediaId)
    expect(createdDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftMemory.modified).toHaveProperty('id', mediaId)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', mediaFsPath)

    /* STEP 2: DELETE */
    const itemTreeToDelete = findItemFromFsPath(context.activeTree.value.root.value, mediaFsPath)
    await context.itemActionHandler[StudioItemActionId.DeleteItem](itemTreeToDelete!)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()
    expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    const deletedDraftMemory = context.activeTree.value.draft.list.value[0]
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftMemory.modified).toBeUndefined()
    expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)
    expect(deletedDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', mediaFsPath)

    /* STEP 3: REVERT */
    const mediaTreeItem = context.activeTree.value.root.value[0]
    await context.itemActionHandler[StudioItemActionId.RevertItem](mediaTreeItem)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const revertedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(revertedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(revertedDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(revertedDraftStorage.modified).toHaveProperty('id', mediaId)
    expect(revertedDraftStorage.modified).toHaveProperty('fsPath', mediaFsPath)
    expect(revertedDraftStorage.original).toHaveProperty('id', mediaId)
    expect(revertedDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list[0]).toHaveProperty('fsPath', mediaFsPath)
    expect(list[0].modified).toHaveProperty('id', mediaId)
    expect(list[0].modified).toHaveProperty('fsPath', mediaFsPath)
    expect(list[0].original).toHaveProperty('id', mediaId)
    expect(list[0].original).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', mediaFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.remove')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.revert')
  })

  it('Rename > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create media in db and load tree
    const mediaDbItem = createMockMedia(mediaId)
    await mockHost.media.upsert(mediaFsPath, mediaDbItem)
    await context.activeTree.value.draft.load()

    /* STEP 1: RENAME */
    await context.activeTree.value.selectItemByFsPath(mediaFsPath)

    const newFsPath = generateUniqueMediaFsPath('media-renamed', 'png')
    const newId = fsPathToId(newFsPath, 'media')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: mediaFsPath,
      } as TreeItem,
      newFsPath,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath)

    // Deleted original draft
    const deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()
    expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(2)

    // Created renamed draft
    const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === newFsPath)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftMemory.modified).toHaveProperty('id', newId)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', newFsPath)
    expect(createdDraftMemory.original).toHaveProperty('id', mediaId)
    expect(createdDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)

    // Deleted original draft
    const deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === mediaFsPath)!
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftMemory.modified).toBeUndefined()
    expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)
    expect(deletedDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath)

    /* STEP 2: REVERT */
    const renamedTreeItem = context.activeTree.value.root.value[0]
    expect(renamedTreeItem).toHaveProperty('fsPath', newFsPath)
    await context.itemActionHandler[StudioItemActionId.RevertItem](renamedTreeItem)

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const revertedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(revertedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(revertedDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(revertedDraftStorage.modified).toHaveProperty('id', mediaId)
    expect(revertedDraftStorage.modified).toHaveProperty('fsPath', mediaFsPath)
    expect(revertedDraftStorage.original).toHaveProperty('id', mediaId)
    expect(revertedDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list[0]).toHaveProperty('fsPath', mediaFsPath)
    expect(list[0].modified).toHaveProperty('id', mediaId)
    expect(list[0].modified).toHaveProperty('fsPath', mediaFsPath)
    expect(list[0].original).toHaveProperty('id', mediaId)
    expect(list[0].original).toHaveProperty('fsPath', mediaFsPath)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', mediaFsPath)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftMedias.rename')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.revert')
  })

  it('Rename > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    // Create media in db and load tree
    const mediaDbItem = createMockMedia(mediaId)
    await mockHost.media.upsert(mediaFsPath, mediaDbItem)
    await context.activeTree.value.draft.load()

    /* STEP 1: RENAME */
    await context.activeTree.value.selectItemByFsPath(mediaFsPath)

    const newFsPath = generateUniqueMediaFsPath('media-renamed', 'png')
    const _newId = fsPathToId(newFsPath, 'media')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      newFsPath,
      item: {
        type: 'file',
        fsPath: mediaFsPath,
      } as TreeItem,
    })

    /* STEP 2: RENAME */
    const newFsPath2 = generateUniqueMediaFsPath('media-renamed-again', 'png')
    const newId2 = fsPathToId(newFsPath2, 'media')
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      item: {
        type: 'file',
        fsPath: newFsPath,
      } as TreeItem,
      newFsPath: newFsPath2,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(newFsPath2))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', newFsPath2)
    expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId2)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', newFsPath2)

    // Deleted original draft
    const deletedDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(mediaFsPath))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftStorage.modified).toBeUndefined()
    expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)
    expect(deletedDraftStorage.original).toHaveProperty('fsPath', mediaFsPath)

    // Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(2)

    // Created renamed draft
    const createdDraftMemory = list.find(item => item.fsPath === newFsPath2)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', newFsPath2)
    expect(createdDraftMemory.modified).toHaveProperty('id', newId2)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', newFsPath2)
    expect(createdDraftMemory.original).toHaveProperty('id', mediaId)
    expect(createdDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)

    // Deleted original draft
    const deletedDraftMemory = list.find(item => item.fsPath === mediaFsPath)!
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)
    expect(deletedDraftMemory.original).toHaveProperty('fsPath', mediaFsPath)
    expect(deletedDraftMemory.modified).toBeUndefined()

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('fsPath', newFsPath2)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(4)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.load')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftMedias.rename')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftMedias.rename')
  })

  it('CreateMediaFolder > Upload > Revert Media', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    const folderName = 'media-folder'
    const folderPath = folderName
    const gitkeepFsPath = joinURL(folderPath, '.gitkeep')
    const gitkeepId = fsPathToId(gitkeepFsPath, 'media')

    /* STEP 1: CREATE FOLDER */
    await context.itemActionHandler[StudioItemActionId.CreateMediaFolder]({
      fsPath: folderPath,
    })

    // Storage
    expect(mockStorageDraft.size).toEqual(1)
    const gitkeepDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(gitkeepFsPath))!)
    expect(gitkeepDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(gitkeepDraftStorage).toHaveProperty('fsPath', gitkeepFsPath)
    expect(gitkeepDraftStorage.modified).toHaveProperty('id', gitkeepId)
    expect(gitkeepDraftStorage.modified).toHaveProperty('fsPath', gitkeepFsPath)
    expect(gitkeepDraftStorage.original).toBeUndefined()

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    const gitkeepDraftMemory = context.activeTree.value.draft.list.value[0]
    expect(gitkeepDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(gitkeepDraftMemory).toHaveProperty('fsPath', gitkeepFsPath)
    expect(gitkeepDraftMemory.modified).toHaveProperty('id', gitkeepId)
    expect(gitkeepDraftMemory.modified).toHaveProperty('fsPath', gitkeepFsPath)
    expect(gitkeepDraftMemory.original).toBeUndefined()

    // Tree - .gitkeep file exists but is hidden
    let rootTree = context.activeTree.value.root.value
    expect(rootTree).toHaveLength(1)
    expect(rootTree[0]).toHaveProperty('type', 'directory')
    expect(rootTree[0]).toHaveProperty('name', folderName)
    expect(rootTree[0].children).toHaveLength(1)
    expect(rootTree[0].children![0]).toHaveProperty('fsPath', gitkeepFsPath)
    expect(rootTree[0].children![0]).toHaveProperty('hide', true)

    /* STEP 2: UPLOAD MEDIA IN FOLDER */
    const file = createMockFile(mediaName)
    const uploadedMediaFsPath = joinURL(folderPath, mediaName)
    const uploadedMediaId = fsPathToId(uploadedMediaFsPath, 'media')
    await context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: folderPath,
      files: [file],
    })

    // Storage - .gitkeep has been removed
    expect(mockStorageDraft.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorageDraft.get(normalizeKey(uploadedMediaFsPath))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('fsPath', uploadedMediaFsPath)
    expect(createdDraftStorage.original).toBeUndefined()
    expect(createdDraftStorage.modified).toHaveProperty('id', uploadedMediaId)
    expect(createdDraftStorage.modified).toHaveProperty('fsPath', uploadedMediaFsPath)

    // Memory - .gitkeep has been removed
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.fsPath === uploadedMediaFsPath)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('fsPath', uploadedMediaFsPath)
    expect(createdDraftMemory.modified).toHaveProperty('id', uploadedMediaId)
    expect(createdDraftMemory.modified).toHaveProperty('fsPath', uploadedMediaFsPath)
    expect(createdDraftMemory.original).toBeUndefined()

    // Tree - .gitkeep has been removed
    rootTree = context.activeTree.value.root.value
    expect(rootTree).toHaveLength(1)
    expect(rootTree[0]).toHaveProperty('type', 'directory')
    expect(rootTree[0]).toHaveProperty('name', folderName)
    expect(rootTree[0].children).toHaveLength(1)
    expect(rootTree[0].children![0]).toHaveProperty('fsPath', uploadedMediaFsPath)

    /* STEP 3: REVERT UPLOADED MEDIA */
    const uploadedMediaTreeItem = context.activeTree.value.root.value[0].children!.find(item => item.fsPath === uploadedMediaFsPath)!
    await context.itemActionHandler[StudioItemActionId.RevertItem](uploadedMediaTreeItem!)

    // Storage
    expect(mockStorageDraft.size).toEqual(0)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(0)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(3)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.revert')
  })

  it('CreateMediaFolder > Upload > Revert Media', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    const folderName = 'media-folder'
    const folderPath = folderName

    /* STEP 1: CREATE MEDIA FOLDER */
    await context.itemActionHandler[StudioItemActionId.CreateMediaFolder]({
      fsPath: folderPath,
    })

    /* STEP 2: UPLOAD MEDIA IN FOLDER */
    const file = createMockFile(mediaName)
    await context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: folderPath,
      files: [file],
    })

    /* STEP 3: REVERT FOLDER */
    const folderTreeItem = context.activeTree.value.root.value[0]
    await context.itemActionHandler[StudioItemActionId.RevertItem](folderTreeItem!)

    // Storage
    expect(mockStorageDraft.size).toEqual(0)

    // Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.root.value).toHaveLength(0)

    // Hooks
    expect(consoleInfoSpy).toHaveBeenCalledTimes(3)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:media:updated have been called by', 'useDraftBase.revert')
  })
})
