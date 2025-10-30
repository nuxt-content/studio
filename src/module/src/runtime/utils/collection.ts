import type { CollectionInfo, CollectionSource, Draft07, CollectionItemBase, PageCollectionItemBase, ResolvedCollectionSource, Draft07DefinitionProperty } from '@nuxt/content'
import { hash } from 'ohash'
import { pathMetaTransform } from './path-meta'
import { minimatch } from 'minimatch'
import { join, dirname, parse } from 'pathe'
import type { DatabaseItem } from 'nuxt-studio/app'
import { withoutLeadingSlash } from 'ufo'

export const getCollectionByFilePath = (path: string, collections: Record<string, CollectionInfo>): CollectionInfo | undefined => {
  let matchedSource: ResolvedCollectionSource | undefined
  const collection = Object.values(collections).find((collection) => {
    if (!collection.source || collection.source.length === 0) {
      return
    }

    // const pathWithoutRoot = withoutRoot(path)
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

export function generateStemFromFsPath(path: string) {
  return withoutLeadingSlash(join(dirname(path), parse(path).name))
}

// TODO handle several sources case
export function generateIdFromFsPath(path: string, collectionInfo: CollectionInfo) {
  return join(collectionInfo.name, collectionInfo.source[0]?.prefix || '', path)
}

export function getOrderedSchemaKeys(schema: Draft07) {
  const shape = Object.values(schema.definitions)[0]?.properties || {}
  const keys = new Set([
    shape.id ? 'id' : undefined,
    shape.title ? 'title' : undefined,
    ...Object.keys(shape).sort(),
  ].filter(Boolean))

  return Array.from(keys) as string[]
}

export function getCollection(collectionName: string, collections: Record<string, CollectionInfo>): CollectionInfo {
  const collection = collections[collectionName as keyof typeof collections]
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`)
  }
  return collection
}

export function getCollectionSource(id: string, collection: CollectionInfo) {
  const [_, ...rest] = id.split(/[/:]/)
  const path = rest.join('/')

  const matchedSource = collection.source.find((source) => {
    const include = minimatch(path, source.include, { dot: true })
    const exclude = source.exclude?.some(exclude => minimatch(path, exclude))

    return include && !exclude
  })

  return matchedSource
}

export function generateFsPathFromId(id: string, source: CollectionInfo['source'][0]) {
  const [_, ...rest] = id.split(/[/:]/)
  const path = rest.join('/')

  const { fixed } = parseSourceBase(source)

  const pathWithoutFixed = path.substring(fixed.length)
  return join(fixed, pathWithoutFixed)
}

export function getCollectionInfo(id: string, collections: Record<string, CollectionInfo>) {
  const collection = getCollection(id.split(/[/:]/)[0]!, collections)
  const source = getCollectionSource(id, collection)

  const fsPath = generateFsPathFromId(id, source!)

  return {
    collection,
    source,
    fsPath,
  }
}

export function parseSourceBase(source: CollectionSource) {
  const [fixPart, ...rest] = source.include.includes('*') ? source.include.split('*') : ['', source.include]
  return {
    fixed: fixPart || '',
    dynamic: '*' + rest.join('*'),
  }
}

export function createCollectionDocument(collection: CollectionInfo, id: string, item: CollectionItemBase) {
  const parsedContent = [
    pathMetaTransform,
  ].reduce((acc, fn) => collection.type === 'page' ? fn(acc as PageCollectionItemBase) : acc, { ...item, id } as PageCollectionItemBase)
  const result = { id } as DatabaseItem
  const meta = parsedContent.meta as Record<string, unknown>

  const collectionKeys = getOrderedSchemaKeys(collection.schema)
  for (const key of Object.keys(parsedContent)) {
    if (collectionKeys.includes(key)) {
      result[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
    else {
      meta[key] = parsedContent[key as keyof PageCollectionItemBase]
    }
  }

  result.meta = meta

  // Storing `content` into `rawbody` field
  // TODO: handle rawbody
  // if (collectionKeys.includes('rawbody')) {
  //   result.rawbody = result.rawbody ?? file.body
  // }

  if (collectionKeys.includes('seo')) {
    const seo = result.seo = (result.seo || {}) as PageCollectionItemBase['seo']
    seo.title = seo.title || result.title as string
    seo.description = seo.description || result.description as string
  }

  return result
}

export function normalizeDocument(document: DatabaseItem) {
  // `seo` is an auto-generated field in content module
  // if `seo.title` and `seo.description` are same as `title` and `description`
  // we can remove it to avoid duplication
  if (document.seo) {
    const seo = document.seo as Record<string, unknown>
    if ((!seo.title || seo.title === document.title) && (!seo.description || seo.description === document.description)) {
      Reflect.deleteProperty(document, 'seo')
    }
  }
  return document
}

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
