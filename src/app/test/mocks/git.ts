import { vi } from 'vitest'
import type { GithubFile } from '../../src/types/git'

export const createMockGit = (remoteFile?: GithubFile) => ({
  provider: 'github',
  name: 'GitHub',
  icon: 'i-simple-icons:github',
  api: {
    fetchFile: vi.fn().mockResolvedValue(remoteFile || createMockGithubFile()),
    commitFiles: vi.fn().mockResolvedValue({ success: true, commitSha: 'abc123', url: 'https://example.com/commit/abc123' }),
    getRepositoryUrl: vi.fn().mockReturnValue('https://github.com/owner/repo'),
    getBranchUrl: vi.fn().mockReturnValue('https://github.com/owner/repo/tree/main'),
    getCommitUrl: vi.fn().mockReturnValue('https://github.com/owner/repo/commit/abc123'),
    getContentRootDirUrl: vi.fn().mockReturnValue('https://github.com/owner/repo/tree/main/content'),
    getRepositoryInfo: vi.fn().mockReturnValue({ owner: 'owner', repo: 'repo', branch: 'main', provider: 'github' }),
  },
})

export const createMockGithubFile = (overrides?: Partial<GithubFile>): GithubFile => ({
  provider: 'github',
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
