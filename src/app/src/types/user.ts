import type { GitProviderType } from './git'

export interface StudioUser {
  providerId: string
  accessToken: string
  name: string
  avatar: string
  email: string
  provider: GitProviderType | 'google'
}
