import { describe, it, expect, beforeEach, vi } from 'vitest'
import { type DraftItem, type MediaItem, type StudioHost, DraftStatus, TreeRootId } from '../../src/types'
import { createMockDocument } from '../mocks/document'
import { createMockFile, setupMediaMocks } from '../mocks/media'
import { createMockHost } from '../mocks/host'
import { createMockGit } from '../mocks/git'
import { createMockStorage, createMockHooks } from '../mocks/draft'
import { useDraftDocuments } from '../../src/composables/useDraftDocuments'
import { useDraftMedias } from '../../src/composables/useDraftMedias'
import { normalizeKey, generateUniqueDocumentId, generateUniqueMediaName, generateUniqueMediaId } from '../utils'
import { joinURL } from 'ufo'

// Use the existing utilities from mocks/document.ts
const mockStorage = createMockStorage()
const mockHooks = createMockHooks()

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

vi.mock('../../../src/composables/useHooks', () => ({
  useHooks: () => mockHooks,
}))

vi.mock('../../../src/utils/content', () => ({
  generateContentFromDocument: vi.fn().mockResolvedValue('Generated content'),
}))

// Mock createSharedComposable to return function directly (no sharing)
vi.mock('@vueuse/core', () => ({
  createSharedComposable: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
}))

describe('Document draft - Action Chains Integration Tests', () => {
  let mockHost: StudioHost
  let mockGit: ReturnType<typeof createMockGit>
  let documentId: string

  beforeEach(() => {
    // Reset mocks using the pattern from mocks/document.ts
    vi.clearAllMocks()
    mockStorage.clear()
    mockHooks.callHook.mockResolvedValue(undefined)

    // Create unique test document ID for each test
    documentId = generateUniqueDocumentId()

    // Create fresh mock instances using utilities
    mockGit = createMockGit()
    mockHost = createMockHost()
  })

  it('Create > Revert', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { create, revert, list } = draftDocuments

    const mockDocument = createMockDocument(documentId)

    /* STEP 1: CREATE */
    await create(mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /* STEP 2: REVERT */
    await revert(documentId)

    // Storage
    expect(mockStorage.size).toEqual(0)

    // In memory
    expect(list.value).toHaveLength(0)
  })

  it('Create > Update > Revert', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { create, update, revert, list } = draftDocuments

    const mockDocument = createMockDocument(documentId)

    /* STEP 1: CREATE */
    await create(mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    let storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /* STEP 2: UPDATE */
    await update(documentId, mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /* STEP 3: REVERT */
    await revert(documentId)

    // Storage
    expect(mockStorage.size).toEqual(0)

    // In memory
    expect(list.value).toHaveLength(0)
  })

  it('Select > Update > Revert', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { selectById, update, revert, list } = draftDocuments

    /* STEP 1: SELECT */
    await selectById(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    let storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Pristine)

    /* STEP 2: UPDATE */
    const updatedDocument = createMockDocument(documentId, {
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    })
    await update(documentId, updatedDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Updated)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Updated)

    /* STEP 3: REVERT */
    await revert(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Pristine)
  })

  it('Select > Rename > Update', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { selectById, rename, update, list } = draftDocuments

    const createdDocument = createMockDocument(documentId)

    /* STEP 1: SELECT */
    await selectById(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const selectedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(selectedDraft).toHaveProperty('status', DraftStatus.Pristine)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Pristine)

    /* STEP 2: RENAME */
    const newId = generateUniqueDocumentId()
    const newFsPath = mockHost.document.getFileSystemPath(newId)
    await rename([{ id: documentId, newFsPath }])

    // Storage
    expect(mockStorage.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('id', newId)
    expect(createdDraftStorage).toHaveProperty('original', createdDocument)

    // Deleted original draft
    let deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('id', documentId)
    expect(deletedDraftStorage).toHaveProperty('original', createdDocument)

    // In memory
    expect(list.value).toHaveLength(2)

    // Deleted original draft
    let deletedDraftMemory = list.value.find(item => item.id === documentId)
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('original', createdDocument)

    // Created renamed draft
    const createdDraftMemory = list.value.find(item => item.id === newId)
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('id', newId)
    expect(createdDraftMemory).toHaveProperty('original', createdDocument)

    /**
     * STEP 3: UPDATE
     */
    const updatedDocument = createMockDocument(newId, {
      body: {
        type: 'minimark',
        value: ['Updated content'],
      },
    })
    await update(newId, updatedDocument)

    // Storage
    expect(mockStorage.size).toEqual(2)

    // Updated renamed draft
    const updatedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
    expect(updatedDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(updatedDraftStorage).toHaveProperty('id', newId)
    expect(updatedDraftStorage).toHaveProperty('original', createdDocument)

    // Deleted original draft
    deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('id', documentId)
    expect(deletedDraftStorage).toHaveProperty('original', createdDocument)

    // In memory
    expect(list.value).toHaveLength(2)

    // Deleted original draft
    deletedDraftMemory = list.value.find(item => item.id === documentId)
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('original', createdDocument)

    // Renamed original draft
    const updatedDraftMemory = list.value.find(item => item.id === newId)
    expect(updatedDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(updatedDraftMemory).toHaveProperty('original', createdDocument)
  })

  it('Select > Rename > Revert', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { selectById, rename, revert, list } = draftDocuments

    /* STEP 1: SELECT */
    await selectById(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const initialDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(initialDraft).toHaveProperty('status', DraftStatus.Pristine)

    /* STEP 2: RENAME */
    const newId = generateUniqueDocumentId()
    const newFsPath = mockHost.document.getFileSystemPath(newId)
    await rename([{ id: documentId, newFsPath }])

    // Storage
    expect(mockStorage.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('id', newId)
    expect(createdDraftStorage.original).toHaveProperty('id', documentId)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)

    // Deleted original draft
    const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.original).toHaveProperty('id', documentId)
    expect(deletedDraftStorage.modified).toBeUndefined()

    // In memory
    expect(list.value).toHaveLength(2)

    // Created renamed draft
    const createdDraftMemory = list.value.find(item => item.id === newId)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('id', newId)
    expect(createdDraftMemory.original).toHaveProperty('id', documentId)
    expect(createdDraftMemory.modified).toHaveProperty('id', newId)

    // Deleted original draft
    const deletedDraftMemory = list.value.find(item => item.id === documentId)!
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('id', documentId)
    expect(deletedDraftMemory.original).toHaveProperty('id', documentId)
    expect(deletedDraftMemory.modified).toBeUndefined()

    /* STEP 2: REVERT */
    await revert(newId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const openedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(openedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(openedDraftStorage).toHaveProperty('id', documentId)
    expect(openedDraftStorage.modified).toHaveProperty('id', documentId)
    expect(openedDraftStorage.original).toHaveProperty('id', documentId)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list.value[0]).toHaveProperty('id', documentId)
    expect(list.value[0].modified).toHaveProperty('id', documentId)
    expect(list.value[0].original).toHaveProperty('id', documentId)
  })
})

describe('Media draft - Action Chains Integration Tests', () => {
  let mockHost: StudioHost
  let mockGit: ReturnType<typeof createMockGit>
  let mediaName: string
  let mediaId: string
  let parentPath: string

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorage.clear()
    mockHooks.callHook.mockResolvedValue(undefined)

    // Setup media-related mocks
    setupMediaMocks()

    // Create unique test document ID for each test
    parentPath = '/'
    mediaName = generateUniqueMediaName()
    mediaId = joinURL(TreeRootId.Media, mediaName)

    // Create fresh mock instances using utilities
    mockGit = createMockGit()
    mockHost = createMockHost()
  })

  it('Upload > Revert', async () => {
    const draftMedias = useDraftMedias(mockHost, mockGit as never)
    const { upload, revert, list } = draftMedias

    const file = createMockFile(mediaName)

    /* STEP 1: UPLOAD */
    await upload(parentPath, file)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const storedDraft: DraftItem<MediaItem> = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)
    expect(storedDraft).toHaveProperty('id', mediaId)
    expect(storedDraft.original).toBeUndefined()
    expect(storedDraft.modified).toHaveProperty('id', mediaId)

    // Memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Created)
    expect(list.value[0]).toHaveProperty('id', mediaId)
    expect(list.value[0].original).toBeUndefined()
    expect(list.value[0].modified).toHaveProperty('id', mediaId)

    /* STEP 2: REVERT */
    await revert(mediaId)

    // Storage
    expect(mockStorage.size).toEqual(0)

    // Memory
    expect(list.value).toHaveLength(0)
  })

  it('Select > Delete > Revert', async () => {
    const draftMedias = useDraftMedias(mockHost, mockGit as never)
    const { remove, revert, list } = draftMedias

    /* STEP 1: SELECT */
    await draftMedias.selectById(mediaId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    let storedDraft: DraftItem<MediaItem> = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)
    expect(storedDraft).toHaveProperty('id', mediaId)
    expect(storedDraft.original).toHaveProperty('id', mediaId)
    expect(storedDraft.modified).toHaveProperty('id', mediaId)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list.value[0]).toHaveProperty('id', mediaId)
    expect(list.value[0].modified).toHaveProperty('id', mediaId)
    expect(list.value[0].original).toHaveProperty('id', mediaId)

    /* STEP 2: DELETE */
    await remove([mediaId])

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Deleted)
    expect(storedDraft).toHaveProperty('id', mediaId)
    expect(storedDraft.modified).toBeUndefined()
    expect(storedDraft.original).toBeDefined()

    // Memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Deleted)
    expect(list.value[0]).toHaveProperty('id', mediaId)
    expect(list.value[0].modified).toBeUndefined()
    expect(list.value[0].original).toBeDefined()

    /* STEP 3: REVERT */
    await revert(mediaId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)
    expect(storedDraft).toHaveProperty('id', mediaId)
    expect(storedDraft.modified).toBeDefined()
    expect(storedDraft.original).toBeDefined()

    // Memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list.value[0]).toHaveProperty('id', mediaId)
    expect(list.value[0].modified).toBeDefined()
    expect(list.value[0].original).toBeDefined()
  })

  it('Rename > Revert', async () => {
    const draftMedias = useDraftMedias(mockHost, mockGit as never)
    const { rename, revert, list } = draftMedias

    const newId = generateUniqueMediaId()
    const newFsPath = mockHost.media.getFileSystemPath(newId)

    /* STEP 1: RENAME */
    await rename([{ id: mediaId, newFsPath }])

    // Storage
    expect(mockStorage.size).toEqual(2)

    // Created renamed draft
    const createdDraftStorage = JSON.parse(mockStorage.get(normalizeKey(newId))!)
    expect(createdDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftStorage).toHaveProperty('id', newId)
    expect(createdDraftStorage.original).toHaveProperty('id', mediaId)
    expect(createdDraftStorage.modified).toHaveProperty('id', newId)

    // Deleted original draft
    const deletedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(deletedDraftStorage).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftStorage).toHaveProperty('id', mediaId)
    expect(deletedDraftStorage.modified).toBeUndefined()
    expect(deletedDraftStorage.original).toHaveProperty('id', mediaId)

    // In memory
    expect(list.value).toHaveLength(2)

    // Created renamed draft
    const createdDraftMemory = list.value.find(item => item.id === newId)!
    expect(createdDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(createdDraftMemory).toHaveProperty('id', newId)
    expect(createdDraftMemory.modified).toHaveProperty('id', newId)
    expect(createdDraftMemory.original).toHaveProperty('id', mediaId)

    // Deleted original draft
    const deletedDraftMemory = list.value.find(item => item.id === mediaId)!
    expect(deletedDraftMemory).toHaveProperty('status', DraftStatus.Deleted)
    expect(deletedDraftMemory).toHaveProperty('id', mediaId)
    expect(deletedDraftMemory.modified).toBeUndefined()
    expect(deletedDraftMemory.original).toHaveProperty('id', mediaId)

    /* STEP 2: REVERT */
    await revert(newId)

    // Storage
    expect(mockStorage.size).toEqual(1)

    const openedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(mediaId))!)
    expect(openedDraftStorage).toHaveProperty('status', DraftStatus.Pristine)
    expect(openedDraftStorage).toHaveProperty('id', mediaId)
    expect(openedDraftStorage.modified).toHaveProperty('id', mediaId)
    expect(openedDraftStorage.original).toHaveProperty('id', mediaId)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0]).toHaveProperty('status', DraftStatus.Pristine)
    expect(list.value[0]).toHaveProperty('id', mediaId)
    expect(list.value[0].modified).toHaveProperty('id', mediaId)
    expect(list.value[0].original).toHaveProperty('id', mediaId)
  })
})
