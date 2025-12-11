import slugify from 'slugify'
import { withoutTrailingSlash, withLeadingSlash } from 'ufo'
import { pascalCase } from 'scule'
import { cleanUrlSegment } from '../url'
import type { DatabaseItem } from 'nuxt-studio/app'

export function addPageTypeFields(dbItem: DatabaseItem) {
  const { basename, extension, stem } = parseDocumentId(dbItem.id)
  const filePath = generatePathFromStem(stem)

  return {
    path: filePath,
    ...dbItem,
    title: dbItem.title || generateTitleFromPath(cleanUrlSegment(basename)),
    stem,
    extension,
  }
}

export function generateTitleFromPath(path: string) {
  return path.split(/[\s-]/g).map(pascalCase).join(' ')
}

export function generateStemFromId(id: string) {
  return id.split('/').slice(1).join('/').split('.').slice(0, -1).join('.')
}

export function generatePathFromStem(stem: string): string {
  stem = stem.split('/').map(part => slugify(cleanUrlSegment(part), { lower: true })).join('/')
  return withLeadingSlash(withoutTrailingSlash(stem))
}

export function parseDocumentId(id: string) {
  const [source, ...parts] = id.split(/[:/]/)

  const [, basename, extension] = parts[parts.length - 1]?.match(/(.*)\.([^.]+)$/) || []

  if (basename) {
    parts[parts.length - 1] = basename
  }

  const stem = (parts || []).join('/')

  return {
    source,
    stem,
    extension: extension!,
    basename: basename || '',
  }
}

export function getFileExtension(id: string) {
  return id.split('#')[0]?.split('.').pop()!.toLowerCase()
}
