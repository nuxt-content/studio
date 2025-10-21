import { type StudioHost, TreeRootId, type DatabaseItem } from '../../src/types'
import { vi } from 'vitest'
import { createMockDocument } from './document'
import { createMockMedia } from './media'
import { joinURL } from 'ufo'
import type { MediaItem } from '../../src/types/media'

// Simple implementation that mimics the real getFileSystemPath logic
const getFileSystemPath = (id: string) => {
  return `${id.split('/').slice(1).join('/')}`
}

const documentDb = new Map<string, DatabaseItem>()
const mediaDb = new Map<string, MediaItem>()

export const createMockHost = (): StudioHost => ({
  document: {
    get: vi.fn().mockImplementation(async (id: string) => {
      if (documentDb.has(id)) {
        return documentDb.get(id)
      }
      const document = createMockDocument(id)
      documentDb.set(id, document)
      return document
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, content: string) => {
      // Add dummy collection prefix
      const id = joinURL('docs', fsPath)
      const document = createMockDocument(id, {
        body: {
          type: 'minimark',
          value: [content?.trim() || 'Test content'],
        },
      })
      documentDb.set(id, document)
      return document
    }),
    upsert: vi.fn().mockImplementation(async (id: string, document: DatabaseItem) => {
      documentDb.set(id, document)
    }),
    delete: vi.fn().mockImplementation(async (id: string) => {
      documentDb.delete(id)
    }),
    list: vi.fn().mockImplementation(async () => {
      return Array.from(documentDb.values())
    }),
    getFileSystemPath,
  },
  media: {
    get: vi.fn().mockImplementation(async (id: string) => {
      if (mediaDb.has(id)) {
        return mediaDb.get(id)
      }
      const media = createMockMedia(id)
      mediaDb.set(id, media)
      return media
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, _routePath: string, _content: string) => {
      const id = joinURL(TreeRootId.Media, fsPath)
      const media = createMockMedia(id)
      mediaDb.set(id, media)
      return media
    }),
    upsert: vi.fn().mockImplementation(async (id: string, media: MediaItem) => {
      mediaDb.set(id, media)
    }),
    delete: vi.fn().mockImplementation(async (id: string) => {
      mediaDb.delete(id)
    }),
    getFileSystemPath,
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
