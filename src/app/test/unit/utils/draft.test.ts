import { describe, it, expect } from 'vitest'
import { checkConflict, findDescendantsFromFsPath } from '../../../src/utils/draft'
import { draftItemsList } from '../../../test/mocks/draft'
import { createMockHost } from '../../../test/mocks/host'
import { DraftStatus } from '../../../src/types/draft'
import type { DatabaseItem, DraftItem } from '../../../src/types'

describe('findDescendantsFromFsPath', () => {
  it('returns exact match for a root level file', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, 'index.md')
    expect(descendants).toHaveLength(1)
    expect(descendants[0].fsPath).toBe('index.md')
  })

  it('returns empty array for non-existent fsPath', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, 'non-existent/file.md')
    expect(descendants).toHaveLength(0)
  })

  it('returns all descendants files for a directory path', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, '1.getting-started')

    expect(descendants).toHaveLength(5)

    expect(descendants.some(item => item.fsPath === '1.getting-started/2.introduction.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/3.installation.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/4.configuration.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/1.studio.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/2.deployment.md')).toBe(true)
  })

  it('returns all descendants for a nested directory path', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, '1.getting-started/1.advanced')

    expect(descendants).toHaveLength(2)

    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/1.studio.md')).toBe(true)
    expect(descendants.some(item => item.fsPath === '1.getting-started/1.advanced/2.deployment.md')).toBe(true)
  })

  it('returns all descendants for root item', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, '/')

    expect(descendants).toHaveLength(draftItemsList.length)
  })

  it('returns only the file itself when searching for a specific file', () => {
    const descendants = findDescendantsFromFsPath(draftItemsList, '1.getting-started/1.advanced/1.studio.md')

    expect(descendants).toHaveLength(1)
    expect(descendants[0].fsPath).toBe('1.getting-started/1.advanced/1.studio.md')
  })
})

describe('checkConflict', () => {
  it('does not report a conflict for a bare fence stored with the `language: text` mdc artifact', async () => {
    const host = createMockHost()
    const remoteContent = '```\nassets/\n  icons/\n    my-logo.svg\n```\n'

    const draftItem: DraftItem<DatabaseItem> = {
      fsPath: 'test.md',
      status: DraftStatus.Pristine,
      remoteFile: {
        provider: 'github',
        name: 'test.md',
        path: 'test.md',
        sha: 'abc',
        size: remoteContent.length,
        url: '',
        content: remoteContent,
        encoding: 'utf-8',
      },
      original: {
        id: 'docs/test.md',
        path: '/test.md',
        stem: 'test',
        extension: 'md',
        body: {
          nodes: [['pre', { language: 'text' }, ['code', { __ignoreMap: '' }, 'assets/\n  icons/\n    my-logo.svg']]],
          frontmatter: {},
          meta: {},
        },
      } as unknown as DatabaseItem,
    }

    const conflict = await checkConflict(host, draftItem)
    expect(conflict).toBeUndefined()
  })

  it('still reports a conflict when the remote content genuinely diverges', async () => {
    const host = createMockHost()

    const draftItem: DraftItem<DatabaseItem> = {
      fsPath: 'test.md',
      status: DraftStatus.Pristine,
      remoteFile: {
        provider: 'github',
        name: 'test.md',
        path: 'test.md',
        sha: 'abc',
        size: 0,
        url: '',
        content: 'Remote content\n',
        encoding: 'utf-8',
      },
      original: {
        id: 'docs/test.md',
        path: '/test.md',
        stem: 'test',
        extension: 'md',
        body: { nodes: [['p', {}, 'Local content']], frontmatter: {}, meta: {} },
      } as unknown as DatabaseItem,
    }

    const conflict = await checkConflict(host, draftItem)
    expect(conflict).toEqual({
      remoteContent: 'Remote content\n',
      localContent: 'Local content\n',
    })
  })
})
