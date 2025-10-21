import { describe, it, expect, beforeEach, vi } from 'vitest'
import { joinURL } from 'ufo'
import { DraftStatus, StudioItemActionId, TreeRootId, StudioFeature, type StudioHost, type DraftItem, type MediaItem } from '../../src/types'
import { normalizeKey, generateUniqueDocumentId, generateUniqueMediaId, generateUniqueMediaName } from '../utils'
import { createMockHost, clearMockHost } from '../mocks/host'
import { createMockGit } from '../mocks/git'
import { createMockFile, setupMediaMocks } from '../mocks/media'
import { createMockDocument } from '../mocks/document'
import { createMockStorage, createMockUI } from '../mocks/composables'
import type { useUI } from '../../src/composables/useUI'
import type { useGit } from '../../src/composables/useGit'
import { findItemFromId } from '../../src/utils/tree'

const mockStorage = createMockStorage()
const mockUI = createMockUI()
const mockHost = createMockHost()
const mockGit = createMockGit()

let currentRouteName = 'content'

vi.mock('unstorage/drivers/indexedb', () => ({
  default: () => ({
    async getItem(key: string) {
      return mockStorage.get(key) || null
    },
    async setItem(key: string, value: string) {
      mockStorage.set(key, value)
    },
    async removeItem(key: string) {
      mockStorage.delete(key)
    },
    async getKeys() {
      return Array.from(mockStorage.keys())
    },
  }),
}))

// Mock vue-router
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

const cleanAndSetupContext = async (mockedHost: StudioHost, mockedGit: ReturnType<typeof useGit>, mockedUI: ReturnType<typeof useUI>) => {
  // Reset mocks
  vi.clearAllMocks()
  mockStorage.clear()
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
  const documentTree = useTree(StudioFeature.Content, mockedHost, mockedUI, draftDocuments)

  // Initialize media tree
  const draftMedias = useDraftMedias(mockedHost, mockedGit)
  const mediaTree = useTree(StudioFeature.Media, mockedHost, mockedUI, draftMedias)

  // Initialize context
  const context = useContext(mockedHost, mockedGit, documentTree, mediaTree)

  return context
}

describe('Document - Action Chains Integration Tests', () => {
  let documentId: string
  let context: Awaited<ReturnType<typeof cleanAndSetupContext>>

  beforeEach(async () => {
    currentRouteName = 'content'
    documentId = generateUniqueDocumentId()
    context = await cleanAndSetupContext(mockHost, mockGit, mockUI)
  })

  it('Create > Revert', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')

    /* STEP 1: CREATE */
    const fsPath = mockHost.document.getFileSystemPath(documentId)
    await context.itemActionHandler[StudioItemActionId.CreateDocument]({
      fsPath,
      content: 'Test content',
    })

    // Draft in Storage
    expect(mockStorage.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)
    expect(storedDraft).toHaveProperty('id', documentId)
    expect(storedDraft.modified).toHaveProperty('id', documentId)
    expect(storedDraft.original).toBeUndefined()

    // Draft in Memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(1)
    expect(context.activeTree.value.draft.list.value[0]).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].modified).toHaveProperty('id', documentId)
    expect(context.activeTree.value.draft.list.value[0].original).toBeUndefined()

    // Tree
    expect(context.activeTree.value.currentItem.value).toHaveProperty('id', documentId)
    expect(context.activeTree.value.currentItem.value).toHaveProperty('status', DraftStatus.Created)
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('id', documentId)

    /* STEP 2: REVERT */
    await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

    // Draft in Storage
    expect(mockStorage.size).toEqual(0)

    // Draft In memory
    expect(context.activeTree.value.draft.list.value).toHaveLength(0)

    // Tree
    expect(context.activeTree.value.currentItem.value).toHaveProperty('type', 'root')
    expect(context.activeTree.value.root.value).toHaveLength(0)

    /* VERIFY HOOKS */
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.revert')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
  })

  it('Create > Rename', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info')
    /* STEP 1: CREATE */
    const fsPath = mockHost.document.getFileSystemPath(documentId)
    await context.itemActionHandler[StudioItemActionId.CreateDocument]({
      fsPath,
      content: 'Test content',
    })

    /* STEP 2: RENAME */
    const newId = generateUniqueDocumentId()
    const newFsPath = mockHost.document.getFileSystemPath(newId)
    const draftItem = context.activeTree.value.draft.list.value[0]
    await context.itemActionHandler[StudioItemActionId.RenameItem]({
      id: draftItem.id,
      newFsPath,
    })

    // Draft in Storage
    expect(mockStorage.size).toEqual(1)
    const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('id', newId)
    expect(createdDraftStorage.original).toBeUndefined()
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)

    // Draft in Memory
    const list = context.activeTree.value.draft.list.value
    expect(list).toHaveLength(1)
    expect(list[0].status).toEqual(DraftStatus.Created)
    expect(list[0].id).toEqual(newId)
    expect(list[0].original).toBeUndefined()
    expect(list[0].modified).toHaveProperty('id', newId)

    // Tree
    expect(context.activeTree.value.currentItem.value).toHaveProperty('type', 'root')
    expect(context.activeTree.value.root.value).toHaveLength(1)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('id', newId)
    expect(context.activeTree.value.root.value[0]).toHaveProperty('status', DraftStatus.Created)

    /* VERIFY HOOKS */
    expect(consoleInfoSpy).toHaveBeenCalledTimes(2)
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftBase.create')
    expect(consoleInfoSpy).toHaveBeenCalledWith('studio:draft:document:updated have been called by', 'useDraftDocuments.rename')
  })

  // it('Create > Update > Revert', async () => {
  //   const mockDocument = createMockDocument(documentId)

  //   /* STEP 1: CREATE */
  //   const fsPath = mockHost.document.getFileSystemPath(documentId)
  //   await context.itemActionHandler[StudioItemActionId.CreateDocument]({
  //     fsPath,
  //     content: mockDocument.body.value.join('\n'),
  //   })

  //   /* STEP 2: UPDATE */
  //   await context.activeTree.value.draft.update(documentId, mockDocument)

  //   // Storage
  //   expect(mockStorage.size).toEqual(1)
  //   const storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

  //   // Memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(1)
  //   expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Created)

  //   // Tree
  //   expect(context.activeTree.value.root.value).toHaveLength(1)

  //   /* STEP 3: REVERT */
  //   await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

  //   // Storage
  //   expect(mockStorage.size).toEqual(0)

  //   // Memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(0)

  //   // Tree
  //   expect(context.activeTree.value.currentItem.value).toHaveProperty('type', 'root')
  //   expect(context.activeTree.value.root.value).toHaveLength(0)
  // })

  // it('Select > Update > Revert', async () => {
  //   /* STEP 1: SELECT */
  //   await context.activeTree.value.draft.selectById(documentId)

  //   /* STEP 2: UPDATE */
  //   const updatedDocument = createMockDocument(documentId, {
  //     body: {
  //       type: 'minimark',
  //       value: ['Updated content'],
  //     },
  //   })
  //   await context.activeTree.value.draft.update(documentId, updatedDocument)

  //   // Storage
  //   expect(mockStorage.size).toEqual(1)
  //   const storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(storedDraft).toHaveProperty('status', DraftStatus.Updated)

  //   // Memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(1)
  //   expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Updated)

  //   // Tree
  //   expect(context.activeTree.value.root.value).toHaveLength(1)
  //   expect(context.activeTree.value.root.value[0].status).toEqual('updated')

  //   /* STEP 3: REVERT */
  //   await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

  //   // Storage
  //   expect(mockStorage.size).toEqual(1)
  //   const revertedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(revertedDraft).toHaveProperty('status', DraftStatus.Pristine)

  //   // Memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(1)
  //   expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Pristine)

  //   // Tree
  //   expect(context.activeTree.value.root.value).toHaveLength(1)
  //   expect(context.activeTree.value.root.value[0].status).toEqual('opened')
  // })

  // it('Select > Update > Rename', async () => {
  //   /* STEP 1: SELECT */
  //   await context.activeTree.value.draft.selectById(documentId)

  //   /* STEP 2: UPDATE */
  //   const updatedDocument = createMockDocument(documentId, {
  //     body: {
  //       type: 'minimark',
  //       value: ['Updated content'],
  //     },
  //   })

  //   await context.activeTree.value.draft.update(documentId, updatedDocument)

  //   /* STEP 3: RENAME */
  //   const newId = generateUniqueDocumentId()
  //   const newFsPath = mockHost.document.getFileSystemPath(newId)
  //   const draftItem = context.activeTree.value.draft.list.value.find(d => d.id === documentId)!
  //   await context.itemActionHandler[StudioItemActionId.RenameItem]({
  //     id: draftItem.id,
  //     newFsPath,
  //   })

  //   // Storage
  //   expect(mockStorage.size).toEqual(2)

  //   // Created renamed draft
  //   const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
  //   expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
  //   expect(createdDraftStorage).toHaveProperty('id', newId)
  //   expect(createdDraftStorage.original).toHaveProperty('id', documentId)
  //   expect(createdDraftStorage.modified).toHaveProperty('id', newId)
  //   expect(createdDraftStorage.modified).toHaveProperty('body', updatedDocument.body)

  //   // Deleted original draft
  //   const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftStorage).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.modified).toBeUndefined()

  //   // In memory
  //   const list = context.activeTree.value.draft.list.value
  //   expect(list).toHaveLength(2)

  //   expect(list[0].status).toEqual(DraftStatus.Deleted)
  //   expect(list[0].id).toEqual(documentId)
  //   expect(list[0].original).toHaveProperty('id', documentId)
  //   expect(list[0].modified).toBeUndefined()

  //   expect(list[1].status).toEqual(DraftStatus.Created)
  //   expect(list[1].id).toEqual(newId)
  //   expect(list[1].original).toHaveProperty('id', documentId)
  //   expect(list[1].modified).toHaveProperty('id', newId)
  //   expect(list[1].modified).toHaveProperty('body', updatedDocument.body)
  // })

  // it('Select > Rename > Update', async () => {
  //   /* STEP 1: SELECT */
  //   await context.activeTree.value.draft.selectById(documentId)

  //   // Storage
  //   expect(mockStorage.size).toEqual(1)
  //   const selectedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(selectedDraft).toHaveProperty('status', DraftStatus.Pristine)

  //   // In memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(1)
  //   expect(context.activeTree.value.draft.list.value[0].status).toEqual(DraftStatus.Pristine)

  //   /* STEP 2: RENAME */
  //   const newId = generateUniqueDocumentId()
  //   const newFsPath = mockHost.document.getFileSystemPath(newId)
  //   const draftItem = context.activeTree.value.draft.list.value[0]
  //   await context.itemActionHandler[StudioItemActionId.RenameItem]({
  //     id: draftItem.id,
  //     newFsPath,
  //   })

  //   // Storage
  //   expect(mockStorage.size).toEqual(2)

  //   // Created renamed draft
  //   const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
  //   expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
  //   expect(createdDraftStorage).toHaveProperty('id', newId)
  //   expect(createdDraftStorage.original).toHaveProperty('id', documentId)

  //   // Deleted original draft
  //   let deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftStorage).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.original).toHaveProperty('id', documentId)

  //   // In memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(2)

  //   // Deleted original draft
  //   let deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === documentId)
  //   expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftMemory!.original).toHaveProperty('id', documentId)

  //   // Created renamed draft
  //   const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === newId)
  //   expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
  //   expect(createdDraftMemory).toHaveProperty('id', newId)
  //   expect(createdDraftMemory!.original).toHaveProperty('id', documentId)

  //   /**
  //    * STEP 3: UPDATE
  //    */
  //   const updatedDocument = createMockDocument(newId, {
  //     body: {
  //       type: 'minimark',
  //       value: ['Updated content'],
  //     },
  //   })
  //   await context.activeTree.value.draft.update(newId, updatedDocument)

  //   // Storage
  //   expect(mockStorage.size).toEqual(2)

  //   // Updated renamed draft
  //   const updatedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
  //   expect(updatedDraftStorage).toHaveProperty('status', DraftStatus.Created)
  //   expect(updatedDraftStorage).toHaveProperty('id', newId)
  //   expect(updatedDraftStorage.original).toHaveProperty('id', documentId)

  //   // Deleted original draft
  //   deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftStorage).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.original).toHaveProperty('id', documentId)

  //   // In memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(2)

  //   // Deleted original draft
  //   deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === documentId)
  //   expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftMemory!.original).toHaveProperty('id', documentId)
  //   expect(deletedDraftMemory!.modified).toBeUndefined()

  //   // Renamed original draft
  //   const updatedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === newId)!
  //   expect(updatedDraftMemory).toHaveProperty('status', DraftStatus.Created)
  //   expect(updatedDraftMemory).toHaveProperty('id', newId)
  //   expect(updatedDraftMemory!.original).toHaveProperty('id', documentId)
  //   expect(updatedDraftMemory!.modified).toHaveProperty('id', newId)
  // })

  // it('Select > Rename > Revert', async () => {
  //   /* STEP 1: SELECT */
  //   await context.activeTree.value.draft.selectById(documentId)

  //   /* STEP 2: RENAME */
  //   const newId = generateUniqueDocumentId()
  //   const newFsPath = mockHost.document.getFileSystemPath(newId)
  //   const draftItem = context.activeTree.value.draft.list.value[0]
  //   await context.itemActionHandler[StudioItemActionId.RenameItem]({
  //     id: draftItem.id,
  //     newFsPath,
  //   })

  //   /* STEP 3: REVERT */
  //   await context.itemActionHandler[StudioItemActionId.RevertItem](context.activeTree.value.currentItem.value)

  //   // Storage
  //   expect(mockStorage.size).toEqual(1)
  //   const openedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(openedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
  //   expect(openedDraftStorage).toHaveProperty('id', documentId)
  //   expect(openedDraftStorage.modified).toHaveProperty('id', documentId)
  //   expect(openedDraftStorage.original).toHaveProperty('id', documentId)

  //   // In memory
  //   const list = context.activeTree.value.draft.list.value
  //   expect(list).toHaveLength(1)
  //   expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
  //   expect(list[0]).toHaveProperty('id', documentId)
  //   expect(list[0].modified).toHaveProperty('id', documentId)
  //   expect(list[0].original).toHaveProperty('id', documentId)
  // })

  // it('Select > Rename > Rename', async () => {
  //   /* STEP 1: SELECT */
  //   await context.activeTree.value.draft.selectById(documentId)

  //   /* STEP 2: RENAME */
  //   const newId = generateUniqueDocumentId()
  //   const newFsPath = mockHost.document.getFileSystemPath(newId)
  //   let draftItem = context.activeTree.value.draft.list.value[0]
  //   await context.itemActionHandler[StudioItemActionId.RenameItem]({
  //     id: draftItem.id,
  //     newFsPath,
  //   })

  //   /* STEP 3: RENAME */
  //   const newId2 = generateUniqueDocumentId()
  //   const newFsPath2 = mockHost.document.getFileSystemPath(newId2)
  //   draftItem = context.activeTree.value.draft.list.value.find(d => d.id === newId)!
  //   await context.itemActionHandler[StudioItemActionId.RenameItem]({
  //     id: draftItem.id,
  //     newFsPath: newFsPath2,
  //   })

  //   // Storage
  //   expect(mockStorage.size).toEqual(2)

  //   // Created renamed draft (newId2)
  //   const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId2))!)
  //   expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
  //   expect(createdDraftStorage).toHaveProperty('id', newId2)
  //   expect(createdDraftStorage.original).toHaveProperty('id', documentId)
  //   expect(createdDraftStorage.modified).toHaveProperty('id', newId2)

  //   // Deleted original draft (documentId)
  //   const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
  //   expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftStorage).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
  //   expect(deletedDraftStorage.modified).toBeUndefined()

  //   // In memory
  //   expect(context.activeTree.value.draft.list.value).toHaveLength(2)

  //   // Created renamed draft (newId2)
  //   const createdDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === newId2)!
  //   expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
  //   expect(createdDraftMemory).toHaveProperty('id', newId2)
  //   expect(createdDraftMemory.original).toHaveProperty('id', documentId)
  //   expect(createdDraftMemory.modified).toHaveProperty('id', newId2)

  //   // Deleted original draft (documentId)
  //   const deletedDraftMemory = context.activeTree.value.draft.list.value.find(item => item.id === documentId)!
  //   expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
  //   expect(deletedDraftMemory).toHaveProperty('id', documentId)
  //   expect(deletedDraftMemory.original).toHaveProperty('id', documentId)
  //   expect(deletedDraftMemory.modified).toBeUndefined()
  // })
})

// describe('Media draft - Action Chains Integration Tests', () => {
//   let context: ReturnType<typeof useContext>
//   let mediaName: string
//   let mediaId: string
//   const parentPath = '/'

//   beforeEach(async () => {
//     // Setup media-related mocks
//     setupMediaMocks()
//     currentRouteName = 'media'

//     mediaName = generateUniqueMediaName()
//     mediaId = joinURL(TreeRootId.Media, mediaName)

//     context = await cleanAndSetupContext(mockHost, mockGit, mockUI)
//   })

//   it('Upload > Revert', async () => {
//     const file = createMockFile(mediaName)

//     /* STEP 1: UPLOAD */
//     await context.itemActionHandler[StudioItemActionId.UploadMedia]({
//       parentFsPath: parentPath,
//       files: [file],
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(1)
//     const storedDraft: DraftItem<MediaItem> = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(storedDraft).toHaveProperty('status', DraftStatus.Created)
//     expect(storedDraft).toHaveProperty('id', mediaId)
//     expect(storedDraft.original).toBeUndefined()
//     expect(storedDraft.modified).toHaveProperty('id', mediaId)

//     // Memory
//     let list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)
//     expect(list[0]).toHaveProperty('status', DraftStatus.Created)
//     expect(list[0]).toHaveProperty('id', mediaId)
//     expect(list[0].original).toBeUndefined()
//     expect(list[0].modified).toHaveProperty('id', mediaId)

//     /* STEP 2: REVERT */
//     const draftItem = context.activeTree.value.draft.list.value[0]
//     await context.itemActionHandler[StudioItemActionId.RevertItem]({
//       id: draftItem.id,
//       name: draftItem.id.split('/').pop() || '',
//       fsPath: draftItem.fsPath,
//       type: 'file',
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(0)

//     // Memory
//     list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(0)
//   })

//   it('Upload > Rename', async () => {
//     const file = createMockFile(mediaName)

//     /* STEP 1: UPLOAD */
//     await context.itemActionHandler[StudioItemActionId.UploadMedia]({
//       parentFsPath: parentPath,
//       files: [file],
//     })

//     /* STEP 2: RENAME */
//     const newId = generateUniqueMediaId()
//     const newFsPath = mockHost.media.getFileSystemPath(newId)
//     const draftItem = context.activeTree.value.draft.list.value[0]
//     await context.itemActionHandler[StudioItemActionId.RenameItem]({
//       id: draftItem.id,
//       newFsPath,
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(1)

//     // Created renamed draft
//     const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
//     expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftStorage).toHaveProperty('id', newId)
//     expect(createdDraftStorage.original).toBeUndefined()
//     expect(createdDraftStorage.modified).toHaveProperty('id', newId)

//     // In memory
//     const list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)

//     // Created renamed draft
//     const createdDraftMemory = list.find(item => item.id === newId)!
//     expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftMemory).toHaveProperty('id', newId)
//     expect(createdDraftMemory.original).toBeUndefined()
//     expect(createdDraftMemory.modified).toHaveProperty('id', newId)
//   })

//   it('Select > Delete > Revert', async () => {
//     /* STEP 1: SELECT */
//     await context.activeTree.value.draft.selectById(mediaId)

//     // Storage
//     expect(mockStorage.size).toEqual(1)
//     let storedDraft: DraftItem<MediaItem> = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)
//     expect(storedDraft).toHaveProperty('id', mediaId)
//     expect(storedDraft.original).toHaveProperty('id', mediaId)
//     expect(storedDraft.modified).toHaveProperty('id', mediaId)

//     // In memory
//     let list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)
//     expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
//     expect(list[0]).toHaveProperty('id', mediaId)
//     expect(list[0].modified).toHaveProperty('id', mediaId)
//     expect(list[0].original).toHaveProperty('id', mediaId)

//     /* STEP 2: DELETE */
//     const itemTreeToDelete = findItemFromId(context.activeTree.value.current.value, mediaId)

//     await context.itemActionHandler[StudioItemActionId.DeleteItem](itemTreeToDelete!)

//     // Storage
//     expect(mockStorage.size).toEqual(1)
//     storedDraft = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(storedDraft).toHaveProperty('status', DraftStatus.Deleted)
//     expect(storedDraft).toHaveProperty('id', mediaId)
//     expect(storedDraft.modified).toBeUndefined()
//     expect(storedDraft.original).toBeDefined()

//     // Memory
//     list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)
//     expect(list[0]).toHaveProperty('status', DraftStatus.Deleted)
//     expect(list[0]).toHaveProperty('id', mediaId)
//     expect(list[0].modified).toBeUndefined()
//     expect(list[0].original).toBeDefined()

//     /* STEP 3: REVERT */
//     const treeItem = findItemFromId(context.activeTree.value.current.value, mediaId)
//     await context.itemActionHandler[StudioItemActionId.RevertItem](treeItem!)

//     // Storage
//     expect(mockStorage.size).toEqual(1)
//     storedDraft = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)
//     expect(storedDraft).toHaveProperty('id', mediaId)
//     expect(storedDraft.modified).toBeDefined()
//     expect(storedDraft.original).toBeDefined()

//     // Memory
//     list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)
//     expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
//     expect(list[0]).toHaveProperty('id', mediaId)
//     expect(list[0].modified).toBeDefined()
//     expect(list[0].original).toBeDefined()
//   })

//   it('Rename > Revert', async () => {
//     const newId = generateUniqueMediaId()
//     const newFsPath = mockHost.media.getFileSystemPath(newId)

//     /* STEP 1: RENAME */
//     await context.itemActionHandler[StudioItemActionId.RenameItem]({
//       id: mediaId,
//       newFsPath,
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(2)

//     // Created renamed draft
//     const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
//     expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftStorage).toHaveProperty('id', newId)
//     expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
//     expect(createdDraftStorage.modified).toHaveProperty('id', newId)

//     // Deleted original draft
//     const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
//     expect(deletedDraftStorage).toHaveProperty('id', mediaId)
//     expect(deletedDraftStorage.modified).toBeUndefined()
//     expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)

//     // In memory
//     let list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(2)

//     // Created renamed draft
//     const createdDraftMemory = list.find(item => item.id === newId)!
//     expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftMemory).toHaveProperty('id', newId)
//     expect(createdDraftMemory.modified).toHaveProperty('id', newId)
//     expect(createdDraftMemory.original).toHaveProperty('id', mediaId)

//     // Deleted original draft
//     const deletedDraftMemory = list.find(item => item.id === mediaId)!
//     expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
//     expect(deletedDraftMemory).toHaveProperty('id', mediaId)
//     expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)
//     expect(deletedDraftMemory.modified).toBeUndefined()

//     /* STEP 2: REVERT */
//     const renamedDraftItem = context.activeTree.value.draft.list.value.find(d => d.id === newId)!
//     await context.itemActionHandler[StudioItemActionId.RevertItem]({
//       id: renamedDraftItem.id,
//       name: renamedDraftItem.id.split('/').pop() || '',
//       fsPath: renamedDraftItem.fsPath,
//       type: 'file',
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(1)

//     const openedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(openedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
//     expect(openedDraftStorage).toHaveProperty('id', mediaId)
//     expect(openedDraftStorage.modified).toHaveProperty('id', mediaId)
//     expect(openedDraftStorage.original).toHaveProperty('id', mediaId)

//     // In memory
//     list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(1)
//     expect(list[0]).toHaveProperty('status', DraftStatus.Pristine)
//     expect(list[0]).toHaveProperty('id', mediaId)
//     expect(list[0].modified).toHaveProperty('id', mediaId)
//     expect(list[0].original).toHaveProperty('id', mediaId)
//   })

//   it('Rename > Rename', async () => {
//     const newId = generateUniqueMediaId()
//     const newFsPath = mockHost.media.getFileSystemPath(newId)

//     /* STEP 1: RENAME */
//     await context.itemActionHandler[StudioItemActionId.RenameItem]({
//       id: mediaId,
//       newFsPath,
//     })
//     /* STEP 2: RENAME */
//     const newId2 = generateUniqueMediaId()
//     const newFsPath2 = mockHost.media.getFileSystemPath(newId2)
//     const renamedDraftItem = context.activeTree.value.draft.list.value.find(d => d.id === newId)!
//     await context.itemActionHandler[StudioItemActionId.RenameItem]({
//       id: renamedDraftItem.id,
//       newFsPath: newFsPath2,
//     })

//     // Storage
//     expect(mockStorage.size).toEqual(2)

//     // Created renamed draft
//     const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId2))!)
//     expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftStorage).toHaveProperty('id', newId2)
//     expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
//     expect(createdDraftStorage.modified).toHaveProperty('id', newId2)

//     // Deleted original draft
//     const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
//     expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
//     expect(deletedDraftStorage).toHaveProperty('id', mediaId)
//     expect(deletedDraftStorage.modified).toBeUndefined()
//     expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)

//     // In memory
//     const list = context.activeTree.value.draft.list.value
//     expect(list).toHaveLength(2)

//     // Created renamed draft
//     const createdDraftMemory = list.find(item => item.id === newId2)!
//     expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
//     expect(createdDraftMemory).toHaveProperty('id', newId2)
//     expect(createdDraftMemory.modified).toHaveProperty('id', newId2)
//     expect(createdDraftMemory.original).toHaveProperty('id', mediaId)

//     // Deleted original draft
//     const deletedDraftMemory = list.find(item => item.id === mediaId)!
//     expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
//     expect(deletedDraftMemory).toHaveProperty('id', mediaId)
//     expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)
//     expect(deletedDraftMemory.modified).toBeUndefined()
//   })
// })
