import type { StudioHost } from '../../src/types'
import { vi } from 'vitest'
import { createMockDocument } from './document'
import { createMockMedia } from './media'
import { TreeRootId } from '../../src/utils/tree'
import { joinURL } from 'ufo'

// Simple implementation that mimics the real getFileSystemPath logic
const getFileSystemPath = (id: string) => {
  return `/${id.split('/').slice(1).join('/')}`
}

export const createMockHost = (): StudioHost => ({
  document: {
    get: vi.fn().mockImplementation(async (id: string) => createMockDocument(id)),
    create: vi.fn().mockImplementation(async (fsPath: string, _content: string) => {
      const id = fsPath.startsWith('docs/') ? fsPath : `docs${fsPath}`
      return createMockDocument(id)
    }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getFileSystemPath,
  },
  media: {
    get: vi.fn().mockImplementation(async (id: string) => createMockMedia(id)),
    create: vi.fn().mockImplementation(async (fsPath: string, _routePath: string, _content: string) => {
      const id = joinURL(TreeRootId.Media, fsPath)
      return createMockMedia(id)
    }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getFileSystemPath,
    list: vi.fn().mockResolvedValue([]),
  },
  app: {
    requestRerender: vi.fn(),
  },
} as never)
