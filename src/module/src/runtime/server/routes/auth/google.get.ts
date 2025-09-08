import { eventHandler, createError } from 'h3'

export default eventHandler(async (event) => {
  if (!process.env.STUDIO_GITHUB_TOKEN) {
    throw createError({
      statusCode: 500,
      message: 'STUDIO_GITHUB_TOKEN is not set. Google authenticated user cannot push changes to the repository without a valid Github token.',
    })
  }
  throw createError({
    statusCode: 500,
    message: 'Google OAuth is not implemented',
  })
})

function hasModeratorAccess(email: string) {
  const moderators = (process.env.STUDIO_MODERATORS || '').split(',').map(email => email.trim())
  return moderators.includes(email)
}
