import { vi } from 'vitest'
import type { GithubFile } from '../../src/types/git'
import type { useGit } from '../../src/composables/useGit'

export const createMockGit = (githubFile?: GithubFile): ReturnType<typeof useGit> => ({
  fetchFile: vi.fn().mockResolvedValue(githubFile || createMockGithubFile()),
} as never)

export const createMockGithubFile = (overrides?: Partial<GithubFile>): GithubFile => ({
  path: 'content/document.md',
  name: 'document.md',
  content: 'Test content',
  sha: 'abc123',
  size: 100,
  encoding: 'utf-8',
  type: 'file',
  url: 'https://example.com/document.md',
  html_url: 'https://example.com/document.md',
  git_url: 'https://example.com/document.md',
  download_url: 'https://example.com/document.md',
  _links: {
    self: 'https://example.com/document.md',
    git: 'https://example.com/document.md',
    html: 'https://example.com/document.md',
  },
  ...overrides,
})
