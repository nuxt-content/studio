import { useLogger } from '@nuxt/kit'
import type { ModuleOptions } from './module'

const logger = useLogger('nuxt-studio')

export function validateAuthConfig(options: ModuleOptions): void {
  const provider = options.repository?.provider || 'github'
  const providerUpperCase = provider.toUpperCase()

  const hasGitHubAuth = options.auth?.github?.clientId && options.auth?.github?.clientSecret
  const hasGitLabAuth = options.auth?.gitlab?.applicationId && options.auth?.gitlab?.applicationSecret
  const hasGoogleAuth = options.auth?.google?.clientId && options.auth?.google?.clientSecret
  const hasGoogleModerators = (process.env.STUDIO_GOOGLE_MODERATORS?.split(',') || []).length > 0
  const hasGitToken = process.env.STUDIO_GITHUB_TOKEN || process.env.STUDIO_GITLAB_TOKEN

  // Google OAuth enabled
  if (hasGoogleAuth) {
    // Google OAuth moderators required
    if (!hasGoogleModerators) {
      logger.error([
        'The `STUDIO_GOOGLE_MODERATORS` environment variable is required when using Google OAuth.',
        'Please set the `STUDIO_GOOGLE_MODERATORS` environment variable to a comma-separated list of email of the allowed users.',
        'Only users with these email addresses will be able to access studio with Google OAuth.',
      ].join(' '))
    }

    if (!hasGitToken) {
      logger.warn([
        `The \`STUDIO_${providerUpperCase}_TOKEN\` environment variable is required when using Google OAuth with ${providerUpperCase} provider.`,
        `This token is used to push changes to the repository when using Google OAuth.`,
      ].join(' '))
    }
  } // Google OAuth disabled
  else {
    const missingProviderEnv = provider === 'github' ? !hasGitHubAuth : !hasGitLabAuth
    if (missingProviderEnv) {
      logger.error([
        `In order to authenticate users, you need to set up a ${providerUpperCase} OAuth application.`,
        `Please set the \`STUDIO_${providerUpperCase}_CLIENT_ID\` and \`STUDIO_${providerUpperCase}_CLIENT_SECRET\` environment variables,`,
        `Alternatively, you can set up a Google OAuth application and set the \`STUDIO_GOOGLE_CLIENT_ID\` and \`STUDIO_GOOGLE_CLIENT_SECRET\` environment variables alongside with \`STUDIO_${providerUpperCase}_TOKEN\` to push changes to the repository.`,
      ].join(' '))
    }
  }
}
