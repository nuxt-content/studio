import { describe, it, expect } from 'vitest'
import type { DatabaseItem } from '../../src/types/database'
import { getDraftStatus } from '../../src/utils/draft'
import { DraftStatus } from '../../src/types/draft'
import { dbItemsList } from '../mocks/database'

describe('getDraftStatus', () => {
  it('draft is CREATED if originalDatabaseItem is not defined', () => {
    const originalDatabaseItem: DatabaseItem = undefined as never
    const draft: DatabaseItem = {
      id: 'landing/index.md',
      title: 'Home',
      body: {},
      description: 'Home page',
      extension: 'md',
      stem: 'index',
      meta: {},
    }

    const status = getDraftStatus(draft, originalDatabaseItem)
    expect(status).toBe(DraftStatus.Created)
  })

  it('draft is OPENED if originalDatabaseItem is defined and is the same as draftedDocument', () => {
    const originalDatabaseItem: DatabaseItem = dbItemsList[0]
    const draft: DatabaseItem = originalDatabaseItem

    const status = getDraftStatus(draft, originalDatabaseItem)
    expect(status).toBe(DraftStatus.Opened)
  })

  it('draft is UPDATED if originalDatabaseItem is defined and is different from draftedDocument', () => {
    const originalDatabaseItem: DatabaseItem = dbItemsList[0]
    const draft: DatabaseItem = {
      ...originalDatabaseItem,
      title: 'Upadted',
    }

    const status = getDraftStatus(draft, originalDatabaseItem)
    expect(status).toBe(DraftStatus.Updated)
  })
})
