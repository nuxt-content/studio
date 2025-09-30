import { ofetch } from 'ofetch'
import { createSharedComposable } from '@vueuse/core'
import type { RawFile, GithubFile, GitOptions } from '../types'

import { joinURL } from 'ufo'

export const useGit = createSharedComposable(({ owner, repo, token, branch, rootDir, authorName, authorEmail }: GitOptions) => {
  const gitFiles: Record<string, GithubFile> = {}
  const $api = ofetch.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  async function fetchFile(path: string, { cached = false }: { cached?: boolean } = {}): Promise<GithubFile | null> {
    path = joinURL(rootDir, path)
    if (cached) {
      const file = gitFiles[path]
      if (file) {
        return file
      }
    }

    try {
      const ghFile: GithubFile = await $api(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`)
      if (cached) {
        gitFiles[path] = ghFile
      }
      return ghFile
    }
    catch (error) {
      // TODO: Handle error
      alert(error)
      return null
    }
  }

  function commitFiles(files: RawFile[], message: string) {
    if (!token) {
      return null
    }
    files = files.map(file => ({ ...file, path: joinURL(rootDir, file.path) }))

    return commitFilesToGitHub({ owner, repo, branch, files, message, authorName, authorEmail })
  }

  return {
    fetchFile,
    commitFiles,
  }

  async function commitFilesToGitHub({ owner, repo, branch, files, message, authorName, authorEmail }: { owner: string, repo: string, branch: string, files: RawFile[], message: string, authorName: string, authorEmail: string }) {
    // Get latest commit SHA
    const refData = await $api(`/repos/${owner}/${repo}/git/ref/heads/${branch}?ref=${branch}`)
    const latestCommitSha = refData.object.sha

    // Get base tree SHA
    const commitData = await $api(`/repos/repos/${owner}/${repo}/git/commits/${latestCommitSha}`)
    const baseTreeSha = commitData.tree.sha

    // Create blobs and prepare tree
    const tree = []
    for (const file of files) {
      const blobData = await $api(`/repos/repos/${owner}/${repo}/git/blobs`, {
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

    // Create new tree
    const treeData = await $api(`/repos/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree,
      }),
    })

    // Create new commit
    const newCommit = await $api(`/repos/repos/${owner}/${repo}/git/commits`, {
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
    await $api(`/repos/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: newCommit.sha }),
    })

    return {
      success: true,
      commitSha: newCommit.sha,
      url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    }
  }
})
