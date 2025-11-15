import { ofetch } from 'ofetch'
import { joinURL } from 'ufo'
import type { GitOptions, GitProviderAPI, GitFile, RawFile, CommitResult, CommitFilesOptions } from '../../types'
import { DraftStatus } from '../../types/draft'

export function createGitLabProvider(options: GitOptions): GitProviderAPI {
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
