import type { DraftStatus } from './draft'

export interface Repository {
  provider: 'github'
  owner: string
  repo: string
  branch: string
  rootDir: string
}

export interface GitOptions {
  owner: string
  repo: string
  branch: string
  rootDir: string
  token: string
  authorName: string
  authorEmail: string
}

export interface RawFile {
  path: string
  content: string | null
  status: DraftStatus
  encoding?: 'utf-8' | 'base64'
}

// GITHUB
export interface GithubFile {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  content?: string
  encoding?: string
  _links: {
    self: string
    git: string
    html: string
  }
}
