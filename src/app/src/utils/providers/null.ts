import type { GitOptions, GitProviderAPI, GitFile, RawFile, CommitResult } from '../../types'

/**
 * Null provider for development/local usage
 * Returns mock/empty implementations
 */
export function createNullProvider(_options: GitOptions): GitProviderAPI {
  return {
    fetchFile: (_path: string, _options: { cached?: boolean } = {}): Promise<GitFile | null> => Promise.resolve(null),
    commitFiles: (_files: RawFile[], _message: string): Promise<CommitResult | null> => Promise.resolve(null),
    getRepositoryUrl: () => '',
    getBranchUrl: () => '',
    getCommitUrl: () => '',
    getFileUrl: (_feature, _fsPath) => '',
    getRepositoryInfo: () => ({ owner: '', repo: '', branch: '', provider: null }),
  }
}
