import type { CollectionSource, ResolvedCollectionSource } from '@nuxt/content'
import { withLeadingSlash, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { join } from 'pathe'
import { minimatch } from 'minimatch'

export function parseSourceBase(source: CollectionSource) {
  const [fixPart, ...rest] = source.include.includes('*') ? source.include.split('*') : ['', source.include]
  return {
    fixed: fixPart || '',
    dynamic: '*' + rest.join('*'),
  }
}

/**
 * On Nuxt Content, Id is built like this: {collection.name}/{source.prefix}/{path}
 * But 'source.prefix' can be different from the fixed part of 'source.include'
 * We need to remove the 'source.prefix' from the path and add the fixed part of the 'source.include' to get the fsPath (used to match the source)
 */
export function getCollectionSourceById(id: string, sources: ResolvedCollectionSource[]) {
  const [_, ...rest] = id.split(/[/:]/)
  const prefixAndPath = rest.join('/')

  const matchedSource = sources.find((source) => {
    const prefix = source.prefix
    if (!prefix) {
      return false
    }

    if (!withLeadingSlash(prefixAndPath).startsWith(prefix)) {
      return false
    }

    let fsPath
    const [fixPart] = source.include.includes('*') ? source.include.split('*') : ['', source.include]
    const fixed = withoutTrailingSlash(withoutLeadingSlash(fixPart || '/'))
    if (fixed === prefix) {
      fsPath = prefixAndPath
    }
    else {
      const path = prefixAndPath.replace(prefix, '')
      fsPath = join(fixed, path)
    }

    const include = minimatch(fsPath, source.include, { dot: true })
    const exclude = source.exclude?.some(exclude => minimatch(fsPath, exclude))

    return include && !exclude
  })

  return matchedSource
}
