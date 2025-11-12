import type { StudioHost, DatabaseItem } from '../../src/types'
import { VirtualMediaCollectionName } from '../../src/utils/media'
import { vi } from 'vitest'
import { createMockDocument } from './document'
import { createMockMedia } from './media'
import { joinURL } from 'ufo'
import type { MediaItem } from '../../src/types/media'

// Helper to convert fsPath to id (simulates module's internal mapping)
export const fsPathToId = (fsPath: string, type: 'document' | 'media') => {
  if (type === 'media') {
    return joinURL(VirtualMediaCollectionName, fsPath)
  }
  // For documents, prefix with a collection name
  return joinURL('docs', fsPath)
}

// Helper to convert id back to fsPath (simulates module's internal mapping)
export const idToFsPath = (id: string) => {
  return id.split('/').slice(1).join('/')
}

const documentDb = new Map<string, DatabaseItem>()
const mediaDb = new Map<string, MediaItem>()

export const createMockHost = (): StudioHost => ({
  document: {
    get: vi.fn().mockImplementation(async (fsPath: string) => {
      const id = fsPathToId(fsPath, 'document')
      if (documentDb.has(id)) {
        return documentDb.get(id)
      }
      const document = createMockDocument(id)
      documentDb.set(id, document)
      return document
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, content: string) => {
      const id = fsPathToId(fsPath, 'document')
      const document = createMockDocument(id, { body: { type: 'minimark', value: [content?.trim() || 'Test content'] }, fsPath })
      documentDb.set(id, document)
      return document
    }),
    upsert: vi.fn().mockImplementation(async (fsPath: string, document: DatabaseItem) => {
      const id = fsPathToId(fsPath, 'document')
      documentDb.set(id, document)
    }),
    delete: vi.fn().mockImplementation(async (fsPath: string) => {
      const id = fsPathToId(fsPath, 'document')
      documentDb.delete(id)
    }),
    list: vi.fn().mockImplementation(async () => {
      return Array.from(documentDb.values())
    }),
  },
  media: {
    get: vi.fn().mockImplementation(async (fsPath: string) => {
      const id = fsPathToId(fsPath, 'media')
      if (mediaDb.has(id)) {
        return mediaDb.get(id)
      }
      const media = createMockMedia(id)
      mediaDb.set(id, media)
      return media
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, _routePath: string, _content: string) => {
      const id = fsPathToId(fsPath, 'media')
      const media = createMockMedia(id)
      mediaDb.set(id, media)
      return media
    }),
    upsert: vi.fn().mockImplementation(async (fsPath: string, media: MediaItem) => {
      const id = fsPathToId(fsPath, 'media')
      mediaDb.set(id, media)
    }),
    delete: vi.fn().mockImplementation(async (fsPath: string) => {
      const id = fsPathToId(fsPath, 'media')
      mediaDb.delete(id)
    }),
    list: vi.fn().mockImplementation(async () => {
      return Array.from(mediaDb.values())
    }),
  },
  app: {
    requestRerender: vi.fn(),
    navigateTo: vi.fn(),
  },
} as never)

export const clearMockHost = () => {
  documentDb.clear()
  mediaDb.clear()
}
