import type { StudioHost } from '../../src/types'
import { vi } from 'vitest'
import { createMockDocument } from './document'

// Simple implementation that mimics the real getFileSystemPath logic
const getFileSystemPath = (id: string) => {
  return `/${id.split('/').slice(1).join('/')}`
}

export const createMockHost = (): StudioHost => ({
  document: {
    get: vi.fn().mockImplementation(async (id: string) => createMockDocument(id)),
    create: vi.fn().mockImplementation(async (fsPath: string, routePath: string, content: string) => {
      const id = fsPath.startsWith('docs/') ? fsPath : `docs${fsPath}`
      return createMockDocument(id, {
        path: routePath,
        stem: fsPath.split('/').pop()?.replace('.md', ''),
        body: {
          type: 'minimark',
          value: [content || 'Test content'],
        },
      })
    }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    getFileSystemPath,
  },
  app: {
    requestRerender: vi.fn(),
  },
} as never)
