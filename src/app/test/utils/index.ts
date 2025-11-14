import { joinURL } from 'ufo'

/**
 * Normalize a storage key using the same logic as unstorage
 */
export function normalizeKey(key: string): string {
  if (!key) {
    return ''
  }

  return key
    .split('?')[0] // Remove query parameters if any
    ?.replace(/[/\\]/g, ':') // Replace forward/back slashes with colons
    .replace(/:+/g, ':') // Replace multiple consecutive colons with single colon
    .replace(/^:|:$/g, '') // Remove leading/trailing colons
    || ''
}

export function generateUniqueDocumentFsPath(filename = 'document', subdirectory = ''): string {
  const uniqueId = Math.random().toString(36).substr(2, 9)
  const file = `${filename}-${uniqueId}.md`
  return subdirectory ? joinURL(subdirectory, file) : file
}

export function generateUniqueMediaFsPath(filename = 'media', extension = 'png', subdirectory = ''): string {
  const uniqueId = Math.random().toString(36).substr(2, 9)
  const file = `${filename}-${uniqueId}.${extension}`
  return subdirectory ? joinURL(subdirectory, file) : file
}
