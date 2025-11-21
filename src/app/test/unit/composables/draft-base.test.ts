import { describe, it, expect } from 'vitest'
import { useDraftBase } from '../../../src/composables/useDraftBase'
import { dbItemsList } from '../../mocks/database'
import { DraftStatus } from '../../../src/types'
import { createMockHost } from '../../mocks/host'

const { getStatus } = useDraftBase('document', createMockHost(), null as never, null as never)

describe('getStatus', () => {
  it('returns Deleted status when modified item is undefined', () => {
    const original = dbItemsList[0] // landing/index.md

    expect(getStatus(undefined as never, original)).toBe(DraftStatus.Deleted)
  })

  it('returns Created status when original is undefined', () => {
    const modified = dbItemsList[1] // docs/1.getting-started/2.introduction.md

    expect(getStatus(modified, undefined as never)).toBe(DraftStatus.Created)
  })

  it('returns Created status when original has different id', () => {
    const original = dbItemsList[0] // landing/index.md
    const modified = dbItemsList[1] // docs/1.getting-started/2.introduction.md

    expect(getStatus(modified, original)).toBe(DraftStatus.Created)
  })

  it('returns Updated status when markdown content is different', () => {
    const original = dbItemsList[1] // docs/1.getting-started/2.introduction.md
    const modified = {
      ...original,
      body: {
        type: 'minimark',
        value: ['text', 'Modified'],
      },
    }

    expect(getStatus(modified, original)).toBe(DraftStatus.Updated)
  })

  it('returns Pristine status when markdown content is identical', () => {
    const original = dbItemsList[1] // docs/1.getting-started/2.introduction.md

    expect(getStatus(original, original)).toBe(DraftStatus.Pristine)
  })
})
