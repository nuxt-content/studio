import { createSharedComposable } from '@vueuse/core'
import type { GitOptions, GitProviderAPI, GitProviderType } from '../types'
import { createGitHubProvider, createGitLabProvider, createNullProvider } from '../utils/providers'

function getProviderIcon(provider: GitProviderType | null): string {
  switch (provider) {
    case 'github':
      return 'i-simple-icons:github'
    case 'gitlab':
      return 'i-simple-icons:gitlab'
    default:
      return 'i-simple-icons:git'
  }
}

function getProviderName(provider: GitProviderType | null): string {
  switch (provider) {
    case 'github':
      return 'GitHub'
    case 'gitlab':
      return 'GitLab'
    default:
      return 'Local'
  }
}

function createProvider(provider: GitProviderType | null, options: GitOptions): GitProviderAPI {
  switch (provider) {
    case 'gitlab':
      return createGitLabProvider(options)
    case 'github':
      return createGitHubProvider(options)
    default:
      return createNullProvider(options)
  }
}

export const useGitProvider = createSharedComposable((options: GitOptions, devMode: boolean = false) => {
  const provider = devMode ? null : options.provider

  return {
    name: getProviderName(provider),
    icon: getProviderIcon(provider),
    api: createProvider(provider, options),
  }
})
