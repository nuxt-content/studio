import { describe, it, expect, beforeEach, vi } from 'vitest'
import { type StudioHost, DraftStatus } from '../../../src/types'
import { createMockDocument, createMockStorage, createMockHooks } from '../../mocks/document'
import { createMockHost } from '../../mocks/host'
import { createMockGit } from '../../mocks/git'
import { useDraftDocuments } from '../../../src/composables/useDraftDocuments'
import { normalizeKey, generateUniqueDocumentId } from '../../utils'

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

describe('useDraftDocuments - Action Chains Integration Tests', () => {
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

    /*
      STEP 1: CREATE
    */
    await create(mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /*
      STEP 2: REVERT
    */
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

    /*
      STEP 1: CREATE
    */
    await create(mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    let storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /*
      STEP 2: UPDATE
    */
    await update(documentId, mockDocument)

    // Storage
    expect(mockStorage.size).toEqual(1)
    storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Created)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Created)

    /*
      STEP 3: REVERT
    */
    await revert(documentId)

    // Storage
    expect(mockStorage.size).toEqual(0)

    // In memory
    expect(list.value).toHaveLength(0)
  })

  it('Select > Update > Revert', async () => {
    const draftDocuments = useDraftDocuments(mockHost, mockGit as never)
    const { selectById, update, revert, list } = draftDocuments

    const mockDocument = createMockDocument(documentId)
    const fsPath = mockHost.document.getFileSystemPath(documentId)
    await mockHost.document.create(fsPath, mockDocument.path, '')

    /*
      STEP 1: SELECT
    */
    await selectById(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    let storedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(storedDraft).toHaveProperty('status', DraftStatus.Pristine)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Pristine)

    /*
      STEP 2: UPDATE
    */
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

    /*
      STEP 3: REVERT
    */
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

    const mockDocument = createMockDocument(documentId)
    const fsPath = mockHost.document.getFileSystemPath(documentId)
    const createdDocument = await mockHost.document.create(fsPath, mockDocument.path, '')

    /*
      STEP 1: SELECT
    */
    await selectById(documentId)

    // Storage
    expect(mockStorage.size).toEqual(1)
    const selectedDraft = JSON.parse(mockStorage.get(normalizeKey(documentId))!)
    expect(selectedDraft).toHaveProperty('status', DraftStatus.Pristine)

    // In memory
    expect(list.value).toHaveLength(1)
    expect(list.value[0].status).toEqual(DraftStatus.Pristine)

    /*
      STEP 2: RENAME
    */
    const newId = generateUniqueDocumentId()
    const renamedDraftItem = await rename(documentId, newId)

    // Storage
    expect(mockStorage.size).toEqual(2)

    const renamedDraftStorage = JSON.parse(mockStorage.get(normalizeKey(renamedDraftItem.id))!)
    expect(renamedDraftStorage).toHaveProperty('status', DraftStatus.Created)
    expect(renamedDraftStorage).toHaveProperty('id', newId)
    expect(renamedDraftStorage).toHaveProperty('original', createdDocument)

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

    // Renamed original draft
    const renamedDraftMemory = list.value.find(item => item.id === newId)
    expect(renamedDraftMemory).toHaveProperty('status', DraftStatus.Created)
    expect(renamedDraftMemory).toHaveProperty('id', newId)
    expect(renamedDraftMemory).toHaveProperty('original', createdDocument)

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
})
