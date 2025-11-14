import type { CollectionInfo, Draft07, ResolvedCollectionSource, Draft07DefinitionProperty } from '@nuxt/content'
import { hash } from 'ohash'
import { minimatch } from 'minimatch'
import { join, dirname, parse } from 'pathe'
import { withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { parseSourceBase } from './source'

/**
 * Generation methods
 */
export function generateStemFromFsPath(path: string) {
  return withoutLeadingSlash(join(dirname(path), parse(path).name))
}

export function generateIdFromFsPath(path: string, collectionInfo: CollectionInfo) {
  const { fixed } = parseSourceBase(collectionInfo.source[0]!)

  const pathWithoutFixed = path.substring(fixed.length)

  return join(collectionInfo.name, collectionInfo.source[0]?.prefix || '', pathWithoutFixed)
}

export function generateFsPathFromId(id: string, source: ResolvedCollectionSource) {
  const [_, ...rest] = id.split(/[/:]/)
  const path = rest.join('/')

  const { fixed } = parseSourceBase(source)
  const normalizedFixed = withoutTrailingSlash(fixed)

  // If path already starts with the fixed part, return as is
  if (normalizedFixed && path.startsWith(normalizedFixed)) {
    return path
  }

  // Otherwise, join fixed part with path
  return join(fixed, path)
}

/**
 * Utils methods
 */

export function getOrderedSchemaKeys(schema: Draft07) {
  const shape = Object.values(schema.definitions)[0]?.properties || {}
  const keys = new Set([
    shape.id ? 'id' : undefined,
    shape.title ? 'title' : undefined,
    ...Object.keys(shape).sort(),
  ].filter(Boolean))

  return Array.from(keys) as string[]
}

export function getCollectionByFilePath(path: string, collections: Record<string, CollectionInfo>): CollectionInfo | undefined {
  let matchedSource: ResolvedCollectionSource | undefined
  const collection = Object.values(collections).find((collection) => {
    if (!collection.source || collection.source.length === 0) {
      return
    }

    const paths = path === '/' ? ['index.yml', 'index.yaml', 'index.md', 'index.json'] : [path]
    return paths.some((p) => {
      matchedSource = collection.source.find((source) => {
        const include = minimatch(p, source.include, { dot: true })
        const exclude = source.exclude?.some(exclude => minimatch(p, exclude))

        return include && !exclude
      })

      return matchedSource
    })
  })

  return collection
}

export function getCollectionById(id: string, collections: Record<string, CollectionInfo>): CollectionInfo {
  const collectionName = id.split(/[/:]/)[0]!

  const collection = collections[collectionName as keyof typeof collections]
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`)
  }

  return collection
}

/**
 * SQL query generation methods
 */
function computeValuesBasedOnCollectionSchema(collection: CollectionInfo, data: Record<string, unknown>) {
  const fields: string[] = []
  const values: Array<string | number | boolean> = []
  const properties = (collection.schema.definitions![collection.name] as Draft07DefinitionProperty).properties
  const sortedKeys = getOrderedSchemaKeys(collection.schema)

  sortedKeys.forEach((key) => {
    const value = properties![key]
    const type = collection.fields[key]
    const defaultValue = value?.default !== undefined ? value.default : 'NULL'
    const valueToInsert = typeof data[key] !== 'undefined' ? data[key] : defaultValue

    fields.push(key)

    if (type === 'json') {
      values.push(`'${JSON.stringify(valueToInsert).replace(/'/g, '\'\'')}'`)
    }
    else if (type === 'string' || ['string', 'enum'].includes(value!.type!)) {
      if (['data', 'datetime'].includes(value!.format!)) {
        values.push(valueToInsert !== 'NULL' ? `'${new Date(valueToInsert as string).toISOString()}'` : defaultValue as string)
      }
      else {
        values.push(`'${String(valueToInsert).replace(/\n/g, '\\n').replace(/'/g, '\'\'')}'`)
      }
    }
    else if (type === 'boolean') {
      values.push(valueToInsert !== 'NULL' ? !!valueToInsert : valueToInsert)
    }
    else {
      values.push(valueToInsert as string | number | boolean)
    }
  })

  // add the hash in local dev database
  values.push(`'${hash(values)}'`)

  return values
}

export function generateRecordInsert(collection: CollectionInfo, data: Record<string, unknown>) {
  const values = computeValuesBasedOnCollectionSchema(collection, data)

  let index = 0

  return `INSERT INTO ${collection.tableName} VALUES (${'?, '.repeat(values.length).slice(0, -2)})`
    .replace(/\?/g, () => values[index++] as string)
}

export function generateRecordDeletion(collection: CollectionInfo, id: string) {
  return `DELETE FROM ${collection.tableName} WHERE id = '${id}';`
}
