import type { DatabasePageItem } from '../../src/types'

export const createMockDocument = (id: string, overrides?: Partial<DatabasePageItem>) => ({
  id,
  path: `${id.split('/').pop()?.replace('.md', '')}`,
  stem: id.split('/').pop()?.replace('.md', '') || 'document',
  extension: 'md',
  body: {
    type: 'minimark',
    value: ['Test content'],
  },
  meta: {},
  ...overrides,
})
