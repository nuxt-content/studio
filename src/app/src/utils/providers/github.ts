import { ofetch } from 'ofetch'
import { joinURL } from 'ufo'
import type { GitOptions, GitProviderAPI, GitFile, RawFile, CommitResult, CommitFilesOptions } from '../../types'
import { StudioFeature } from '../../types'
import { DraftStatus } from '../../types/draft'

export function createGitHubProvider(options: GitOptions): GitProviderAPI {
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
      const ghResponse = await $api(`/contents/${path}?ref=${branch}`)
      const ghFile: GitFile = {
        ...ghResponse,
        provider: 'github' as const,
      }

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

  function getFileUrl(feature: StudioFeature, fsPath: string) {
    const featureDir = feature === StudioFeature.Content ? 'content' : 'public'
    const fullPath = joinURL(rootDir, featureDir, fsPath)
    return `https://github.com/${owner}/${repo}/blob/${branch}/${fullPath}`
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
    getFileUrl,
    getRepositoryInfo,
  }
}
