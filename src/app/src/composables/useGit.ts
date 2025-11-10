import { ofetch } from 'ofetch'
import { createSharedComposable } from '@vueuse/core'
import type { RawFile, GitFile, GitOptions, CommitFilesOptions, CommitResult, GitProvider } from '../types'
import { DraftStatus } from '../types/draft'

import { joinURL } from 'ufo'

export const useDevelopmentGit = (_options: GitOptions): GitProvider => {
  return {
    fetchFile: (_path: string, _options: { cached?: boolean } = {}): Promise<GitFile | null> => Promise.resolve(null),
    commitFiles: (_files: RawFile[], _message: string): Promise<CommitResult | null> => Promise.resolve(null),
    getRepositoryUrl: () => '',
    getBranchUrl: () => '',
    getCommitUrl: () => '',
    getContentRootDirUrl: () => '',
    getRepositoryInfo: () => ({ owner: '', repo: '', branch: '', provider: 'github' as const }),
  }
}

function createGitHubProvider(options: GitOptions): GitProvider {
  const { owner, repo, token, branch, rootDir, authorName, authorEmail } = options
  const gitFiles: Record<string, GitFile> = {}

  // Support both token formats: "token {token}" for classic PATs, "Bearer {token}" for OAuth/fine-grained PATs
  const authHeader = token.startsWith('ghp_') ? `token ${token}` : `Bearer ${token}`

  const $api = ofetch.create({
    baseURL: `https://api.github.com/repos/${owner}/${repo}`,
    headers: {
      Authorization: authHeader,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  async function fetchFile(path: string, { cached = false }: { cached?: boolean } = {}): Promise<GitFile | null> {
    path = joinURL(rootDir, path)
    if (cached) {
      const file = gitFiles[path]
      if (file) {
        return file
      }
    }

    try {
      const ghFile: GitFile = await $api(`/contents/${path}?ref=${branch}`)
      if (cached) {
        gitFiles[path] = ghFile
      }
      return ghFile
    }
    catch (error) {
      // Handle different types of errors gracefully
      if ((error as { status?: number }).status === 404) {
        console.warn(`File not found on GitHub: ${path}`)
        return null
      }

      console.error(`Failed to fetch file from GitHub: ${path}`, error)

      // For development, show alert. In production, you might want to use a toast notification
      if (process.env.NODE_ENV === 'development') {
        alert(`Failed to fetch file: ${path}\n${(error as { message?: string }).message || error}`)
      }

      return null
    }
  }

  function commitFiles(files: RawFile[], message: string): Promise<CommitResult | null> {
    if (!token) {
      return Promise.resolve(null)
    }

    files = files
      .filter(file => file.status !== DraftStatus.Pristine)
      .map(file => ({ ...file, path: joinURL(rootDir, file.path) }))

    return commitFilesToGitHub({
      owner,
      repo,
      branch,
      files,
      message,
      authorName,
      authorEmail,
    })
  }

  async function commitFilesToGitHub({ owner, repo, branch, files, message, authorName, authorEmail }: CommitFilesOptions) {
    // Get latest commit SHA
    const refData = await $api(`/git/refs/heads/${branch}`)
    const latestCommitSha = refData.object.sha

    // Get base tree SHA
    const commitData = await $api(`/git/commits/${latestCommitSha}`)
    const baseTreeSha = commitData.tree.sha

    // Create blobs and prepare tree
    const tree = []
    for (const file of files) {
      if (file.status === DraftStatus.Deleted) {
        // For deleted files, set sha to null to remove them from the tree
        tree.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: null,
        })
      }
      else {
        // For new/modified files, create blob and use its sha
        const blobData = await $api(`/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding,
          }),
        })
        tree.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        })
      }
    }

    // Create new tree
    const treeData = await $api(`/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    })

    // Create new commit
    const newCommit = await $api(`/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [latestCommitSha],
        author: {
          name: authorName,
          email: authorEmail,
          date: new Date().toISOString(),
        },
      }),
    })

    // Update branch ref
    await $api(`/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha }),
    })

    return {
      success: true,
      commitSha: newCommit.sha,
      url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    }
  }

  function getRepositoryUrl() {
    return `https://github.com/${owner}/${repo}`
  }

  function getBranchUrl() {
    return `https://github.com/${owner}/${repo}/tree/${branch}`
  }

  function getCommitUrl(sha: string) {
    return `https://github.com/${owner}/${repo}/commit/${sha}`
  }

  function getContentRootDirUrl() {
    return `https://github.com/${owner}/${repo}/tree/${branch}/${rootDir}/content`
  }

  function getRepositoryInfo() {
    return {
      owner,
      repo,
      branch,
      provider: 'github' as const,
    }
  }

  return {
    fetchFile,
    commitFiles,
    getRepositoryUrl,
    getBranchUrl,
    getCommitUrl,
    getContentRootDirUrl,
    getRepositoryInfo,
  }
}

function createGitLabProvider(options: GitOptions): GitProvider {
  const { owner, repo, token, branch, rootDir, authorName, authorEmail, instanceUrl = 'https://gitlab.com' } = options
  const gitFiles: Record<string, GitFile> = {}

  // GitLab uses project path (namespace/project) encoded as project ID
  const projectPath = encodeURIComponent(`${owner}/${repo}`)
  const baseURL = `${instanceUrl}/api/v4`

  const $api = ofetch.create({
    baseURL: `${baseURL}/projects/${projectPath}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  async function fetchFile(path: string, { cached = false }: { cached?: boolean } = {}): Promise<GitFile | null> {
    path = joinURL(rootDir, path)
    if (cached) {
      const file = gitFiles[path]
      if (file) {
        return file
      }
    }

    try {
      const encodedPath = encodeURIComponent(path)
      // GitLab API returns base64-encoded content when using /repository/files endpoint (without /raw)
      const fileMetadata = await $api(`/repository/files/${encodedPath}?ref=${branch}`)

      const gitFile: GitFile = {
        name: path.split('/').pop() || path,
        path,
        sha: fileMetadata.blob_id,
        size: fileMetadata.size,
        url: fileMetadata.file_path,
        content: fileMetadata.content,
        encoding: 'base64' as const,
        provider: 'gitlab' as const,
      }

      if (cached) {
        gitFiles[path] = gitFile
      }
      return gitFile
    }
    catch (error) {
      // Handle different types of errors gracefully
      if ((error as { status?: number }).status === 404) {
        console.warn(`File not found on GitLab: ${path}`)
        return null
      }

      console.error(`Failed to fetch file from GitLab: ${path}`, error)

      // For development, show alert. In production, you might want to use a toast notification
      if (process.env.NODE_ENV === 'development') {
        alert(`Failed to fetch file: ${path}\n${(error as { message?: string }).message || error}`)
      }

      return null
    }
  }

  function commitFiles(files: RawFile[], message: string): Promise<CommitResult | null> {
    if (!token) {
      return Promise.resolve(null)
    }

    files = files
      .filter(file => file.status !== DraftStatus.Pristine)
      .map(file => ({ ...file, path: joinURL(rootDir, file.path) }))

    return commitFilesToGitLab({
      owner,
      repo,
      branch,
      files,
      message,
      authorName,
      authorEmail,
    })
  }

  async function commitFilesToGitLab({ branch, files, message, authorName, authorEmail }: CommitFilesOptions) {
    // GitLab uses a single commits API with actions
    const actions = files.map((file) => {
      if (file.status === DraftStatus.Deleted) {
        return {
          action: 'delete',
          file_path: file.path,
        }
      }
      else if (file.status === DraftStatus.Created) {
        return {
          action: 'create',
          file_path: file.path,
          content: file.content,
          encoding: file.encoding === 'base64' ? 'base64' : 'text',
        }
      }
      else {
        return {
          action: 'update',
          file_path: file.path,
          content: file.content,
          encoding: file.encoding === 'base64' ? 'base64' : 'text',
        }
      }
    })

    const commitData = await $api(`/repository/commits`, {
      method: 'POST',
      body: {
        branch,
        commit_message: message,
        actions,
        author_name: authorName,
        author_email: authorEmail,
      },
    })

    return {
      success: true,
      commitSha: commitData.id,
      url: `${instanceUrl}/${owner}/${repo}/-/commit/${commitData.id}`,
    }
  }

  function getRepositoryUrl() {
    return `${instanceUrl}/${owner}/${repo}`
  }

  function getBranchUrl() {
    return `${instanceUrl}/${owner}/${repo}/-/tree/${branch}`
  }

  function getCommitUrl(sha: string) {
    return `${instanceUrl}/${owner}/${repo}/-/commit/${sha}`
  }

  function getContentRootDirUrl() {
    return `${instanceUrl}/${owner}/${repo}/-/tree/${branch}/${rootDir}/content`
  }

  function getRepositoryInfo() {
    return {
      owner,
      repo,
      branch,
      provider: 'gitlab' as const,
    }
  }

  return {
    fetchFile,
    commitFiles,
    getRepositoryUrl,
    getBranchUrl,
    getCommitUrl,
    getContentRootDirUrl,
    getRepositoryInfo,
  }
}

export const useGit = createSharedComposable((options: GitOptions): GitProvider => {
  const provider = options.provider || 'github'

  if (provider === 'gitlab') {
    return createGitLabProvider(options)
  }
  else {
    return createGitHubProvider(options)
  }
})
