import { TreeRootId } from '../../src/types'
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

export function generateUniqueDocumentId(filename = 'document'): string {
  const uniqueId = Math.random().toString(36).substr(2, 9)
  // Add dummy collection prefix
  return joinURL('docs', `${filename}-${uniqueId}.md`)
}

export function generateUniqueMediaId(filename = 'media'): string {
  const uniqueId = Math.random().toString(36).substr(2, 9)
  return `${TreeRootId.Media}/${filename}-${uniqueId}.md`
}

export function generateUniqueMediaName(filename = 'media', extension = 'png'): string {
  const uniqueId = Math.random().toString(36).substr(2, 9)
  return `${filename}-${uniqueId}.${extension}`
}
