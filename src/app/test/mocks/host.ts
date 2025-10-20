import { type StudioHost, TreeRootId, type DatabaseItem } from '../../src/types'
import { vi } from 'vitest'
import { createMockDocument } from './document'
import { createMockMedia } from './media'
import { joinURL } from 'ufo'
import type { MediaItem } from '../../src/types/media'

// Simple implementation that mimics the real getFileSystemPath logic
const getFileSystemPath = (id: string) => {
  return `/${id.split('/').slice(1).join('/')}`
}

const documentDb = new Map<string, DatabaseItem>()
const mediaDb = new Map<string, MediaItem>()

export const createMockHost = (): StudioHost => ({
  document: {
    get: vi.fn().mockImplementation(async (id: string) => {
      if (documentDb.has(id)) {
        return documentDb.get(id)
      }
      return createMockDocument(id)
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, content: string) => {
      // Add dummy collection prefix
      const id = `docs${fsPath}`
      const document = createMockDocument(id, {
        body: {
          type: 'minimark',
          value: [content?.trim() || 'Test content'],
        },
      })
      // Store the created document
      documentDb.set(id, document)
      return document
    }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockImplementation(async () => {
      return Array.from(documentDb.values())
    }),
    getFileSystemPath,
  },
  media: {
    get: vi.fn().mockImplementation(async (id: string) => {
      // Return from store if exists, otherwise create new mock
      if (mediaDb.has(id)) {
        return mediaDb.get(id)
      }
      return createMockMedia(id)
    }),
    create: vi.fn().mockImplementation(async (fsPath: string, _routePath: string, _content: string) => {
      const id = joinURL(TreeRootId.Media, fsPath)
      const media = createMockMedia(id)
      // Store the created media
      mediaDb.set(id, media)
      return media
    }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getFileSystemPath,
    list: vi.fn().mockImplementation(async () => {
      // Return all stored media as an array
      return Array.from(mediaDb.values())
    }),
  },
  app: {
    requestRerender: vi.fn(),
  },
} as never)

export const clearMockHost = () => {
  documentDb.clear()
  mediaDb.clear()
}
