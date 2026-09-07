import { flatCase, kebabCase, pascalCase, titleCase, upperFirst } from 'scule'
import { hasProtocol, isRelative } from 'ufo'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { JSType } from 'untyped'
import type { FormItem, FormTree } from '../../types'
import type { ComponentMeta } from '../../types/editor'
import type { PropertyMeta, PropertyMetaSchema } from 'vue-component-meta'
import type { ElementNodeAttributes } from 'comark'

const HIDDEN_PROPS = [
  'ui',
  'as',
  'activeClass',
  'inactiveClass',
  'exactActiveClass',
  'ariaCurrentValue',
  'href',
  'rel',
  'noRel',
  'prefetch',
  'prefetchOn',
  'noPrefetch',
  'prefetchedClass',
  'replace',
  'exact',
  'exactQuery',
  'exactHash',
  'external',
  'onClick',
  'viewTransition',
  'loading',
  'loadingIcon',
  'loadingAuto',
  'disabled',
  'active',
  'leading',
  'trailing',
  'customize',
  'form',
  'formaction',
  'formenctype',
  'formmethod',
  'formnovalidate',
  'formtarget',
  'enterKeyHint',
  'activeColor',
  'activeVariant',
  'onClick',
]

/**
 * Validate and sanitize media URL (images and videos)
 */
export function sanitizeMediaUrl(url: string, mediaType: 'image' | 'video'): string | null {
  if (!url) return null

  // Allow relative URLs (./file.jpg, ../file.mp4)
  if (isRelative(url)) return url

  // Allow absolute paths from root (/file.jpg)
  if (url.startsWith('/')) return url

  // Allow data URLs for specific media type
  if (url.startsWith(`data:${mediaType}/`)) return url

  // For URLs with protocol, only allow http/https
  if (hasProtocol(url)) {
    try {
      const parsed = new URL(url)
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return url
      }
    }
    catch {
      return null
    }
  }

  return null
}

/**
 * Check if a value is valid, not null or undefined
 */
export const isValidAttr = (value?: string | null) => {
  if (!value) return false
  const trimmed = String(value).trim()
  if (!trimmed) return false
  const lower = trimmed.toLowerCase()
  return lower !== 'null' && lower !== 'undefined'
}

/**
 * Clean span props, removing null and undefined values
 */
export const cleanSpanProps = (attrs?: Record<string, unknown> | null) => {
  const props: Record<string, string | string[]> = {}
  if (isValidAttr(attrs?.style as string)) props.style = String(attrs!.style).trim()
  if (isValidAttr((attrs as Record<string, unknown>)?.class as string)) {
    props.class = String((attrs as Record<string, unknown>).class).trim()
  }
  return props
}

/**
 * Build a comark attrs object preserving the insertion order of `input`.
 *
 * - Iterates `input` in its original order.
 * - `options.transform` may return:
 *     - `[newKey, newValue]` — keep with optionally renamed key / replaced value
 *     - `null | undefined`   — drop the entry entirely
 * - `options.fallbacks` are appended at the end for keys not already present.
 */
export function buildAttrs<V = unknown, K extends string = string>(
  input: Record<K, V> | undefined | null,
  options: {
    transform?: (key: K, value: V) => readonly [string, unknown] | null | undefined
    fallbacks?: Record<string, unknown>
  } = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const { transform, fallbacks } = options

  if (input) {
    for (const [key, value] of Object.entries(input) as [K, V][]) {
      const next = transform ? transform(key, value) : ([key, value] as const)
      if (!next) continue
      result[next[0]] = next[1]
    }
  }

  if (fallbacks) {
    for (const [key, value] of Object.entries(fallbacks)) {
      if (value === null || value === undefined) continue
      if (!(key in result)) result[key] = value
    }
  }

  return result
}

/**
 * Merge node props with extra props for an ElementNode, trimming keys and
 * dropping empty ones. Values are passed through untouched — comark attrs are
 * already correctly typed (strings, arrays, objects) and comark serializes each
 * type itself, so no stringification is needed or wanted (stringifying would
 * collapse arrays/objects into `"[object Object]"`).
 */
export function normalizeProps(nodeProps: Record<string, unknown>, extraProps: object): ElementNodeAttributes {
  const out: ElementNodeAttributes = {}
  for (const [rawKey, value] of Object.entries({ ...nodeProps, ...extraProps })) {
    const key = rawKey.trim()
    if (key) out[key] = value
  }
  return out
}

export const stripBindingPrefix = (key: string): string => (key.startsWith(':') ? key.slice(1) : key)

// Stored attrs may be kebab-cased while meta declares props in camelCase (e.g. `foo-bar` vs `fooBar`)
const resolveNodePropValue = (nodeProps: Record<string, unknown>, key: string): unknown => {
  if (key in nodeProps) return nodeProps[key]
  if (`:${key}` in nodeProps) return nodeProps[`:${key}`]

  const normalizedKey = kebabCase(key)
  const rawKey = Object.keys(nodeProps).find(k => kebabCase(stripBindingPrefix(k)) === normalizedKey)
  return rawKey ? nodeProps[rawKey] : undefined
}

export const buildFormTreeFromProps = (node: ProseMirrorNode, componentMeta: ComponentMeta): FormTree => {
  const isNuxtUIComponent = componentMeta.nuxtUI ?? false
  const props = componentMeta.meta.props
  const nodeProps = node?.attrs?.props || {}
  const formTree: FormTree = {}
  const componentName = pascalCase(node?.attrs?.tag || componentMeta.name)
  const componentId = generateComponentId(componentName)

  // Meta props
  if (props) {
    // Fill props from meta
    for (const prop of props) {
      // Do not add interpreted props
      if (prop.name.startsWith(':')) {
        continue
      }

      const propItem = buildPropItem(componentId, prop, nodeProps)

      if (propItem) {
        formTree[propItem.key!] = propItem
      }
    }
  }

  // Add custom props added manually by user
  const existingKeys = new Set(Object.keys(formTree).map(k => kebabCase(stripBindingPrefix(k))))
  const isKnownProp = (key: string): boolean => existingKeys.has(kebabCase(stripBindingPrefix(key)))
  for (const key in nodeProps) {
    if (isKnownProp(key)) {
      continue
    }

    let disabled = false
    let custom = true
    let value = nodeProps[key]
    // Skip link href for links since this attribute is updated through the `Update link`
    if (node?.type?.name === 'link-element') {
      if (['rel', 'target'].includes(key)) {
        // If current url is external, rel and target attributes are added by default and are not editable
        const href = nodeProps.href
        if (hasProtocol(href)) {
          custom = false
          disabled = true

          // Custom value for rel attribute
          if (key === 'rel') {
            value = 'Default value applied'
          }
        }
      }
    }

    const formattedKey = typeof value !== 'string' ? `:${stripBindingPrefix(key)}` : key
    formTree[formattedKey] = {
      id: `${componentId}/${formattedKey}`,
      key: formattedKey,
      title: upperFirst(key),
      value,
      custom,
      disabled,
      type: typeof value as never,
    }
  }

  // Add hidden state for some props
  for (const key in formTree) {
    // Hide href for links as it is updated through the link context menu
    if (node?.type?.name === 'link-element' && key === 'href') {
      formTree[key].hidden = true
    }

    if (hideProp(formTree[key], isNuxtUIComponent)) {
      formTree[key].hidden = true
    }

    if (['object', 'array'].includes(formTree[key].type)) {
      const children = formTree[key].type === 'array' ? formTree[key].arrayItemForm?.children : formTree[key].children
      if (children) {
        for (const childKey in children) {
          if (hideProp(children[childKey], isNuxtUIComponent)) {
            children[childKey].hidden = true
          }
        }
      }
    }
  }

  return formTree
}

const buildPropItem = (componentId: string, prop: PropertyMeta, nodeProps: Record<string, unknown>, level = 0, parent?: FormItem): FormItem => {
  const key = prop.name
  const title = upperFirst(prop.name)
  const defaultValue: string | boolean | number | object | unknown[] | null = prop.tags?.find(tag => tag.name === 'defaultValue')?.text || ''

  const { type, options } = computeTypeAndOptions(componentId, key, prop, level)

  const isInsideArrayItem = parent?.id?.includes('#array/items')

  // Format key based on type
  const formattedKey = ['string', 'icon'].includes(type) || isInsideArrayItem ? key : `:${key}`
  const id = parent?.id
    ? `${parent?.id}/${formattedKey}`
    : `${componentId}/${formattedKey}`

  const nodeValue = (parent?.type === 'object' && parent?.value)
    ? (parent.value as Record<string, unknown>)[key]
    : resolveNodePropValue(nodeProps, key)

  // Resolve default value
  const resolvedDefault = defaultValue !== undefined && defaultValue !== null
    ? (typeof defaultValue === 'string' ? convertStringToValue(defaultValue, type) : defaultValue)
    : generateDefault(type, level)

  // Convert string values and fallback to default
  const value = (typeof nodeValue === 'string'
    ? convertStringToValue(nodeValue, type)
    : nodeValue)
  ?? resolvedDefault

  const propItem: FormItem = {
    id,
    key: formattedKey,
    title,
    value,
    type,
    custom: false,
    default: resolvedDefault,
  }

  // Handle array items schema
  if (type === 'array' && typeof prop.schema === 'object' && prop.schema?.schema) {
    let schema: Record<string, unknown> | undefined

    // Case one: schema is directly defined
    if (prop.schema?.kind === 'array') {
      // Array of string
      if (prop.schema?.type === 'string[]') {
        propItem.arrayItemForm = {
          id: '#array/items',
          type: 'string',
          title: 'Items',
        }
      }
      else {
        schema = (Object.values(prop.schema.schema).find(def => (def as { kind: string }).kind === 'object') as Record<string, unknown>)?.schema as Record<string, unknown>
      }
    }

    // Case two: schema is an enum object containing an array of object
    else if (prop.schema?.kind === 'enum') {
      const arraySchema = Object.values(prop.schema.schema).find(s => (s as { kind: string }).kind === 'array') as { kind: string, type: string, schema: Record<string, object> }

      if (arraySchema && Array.isArray(arraySchema.schema) && arraySchema.schema.length === 1 && (arraySchema.schema[0] as { kind: string }).kind === 'object') {
        schema = arraySchema.schema[0].schema as Record<string, unknown>
      }
    }

    if (schema) {
      const formItem: FormItem = {
        id: '#array/items',
        type: 'object',
        title: 'Items',
      }

      propItem.arrayItemForm = {
        ...formItem,
        children: Object.entries(schema).reduce((acc, [_itemKey, itemValue]) => {
          const itemProp = buildPropItem(componentId, itemValue as PropertyMeta, nodeProps, level + 1, formItem)
          if (itemProp) {
            acc[itemProp.key!] = itemProp
          }
          return acc
        }, {} as Record<string, FormItem>),
      }
    }
  }

  // Handle object children
  if (type === 'object' && typeof prop.schema === 'object' && prop.schema.schema) {
    let objectSchema: { kind: string, type: string, schema: Record<string, object> } | undefined

    if (prop.schema.kind === 'object') {
      objectSchema = { kind: 'object', type: prop.type, schema: prop.schema.schema }
    }
    else {
      objectSchema = Object.values(prop.schema.schema).find(s => (s as { kind: string }).kind === 'object') as never
    }

    if (objectSchema) {
      propItem.children = Object.entries(objectSchema.schema).reduce((acc, [_key, prop]) => {
        const itemProp = buildPropItem(componentId, prop as PropertyMeta, nodeProps, level + 1, propItem)
        if (itemProp) {
          acc[itemProp.key!] = itemProp
        }
        return acc
      }, {} as Record<string, FormItem>)
    }
  }
  if (options.length) {
    propItem.options = options
  }

  return propItem
}

// Convert string like `"\"horizontal\" | \"vertical\" | undefined"` to array
export const convertStringToArray = (string: string) => {
  if (!string?.includes(' | ')) {
    return []
  }

  return string
    .replace(/\\"/g, '') // Remove escaped quotes
    .replace(/"/g, '') // Remove remaining quotes
    .split(' | ')
    .filter(value => value !== 'undefined' && value !== 'null')
    .filter(value => !value.includes('&') && !value.includes('|'))
}

// - `\'vertical\'` to 'vertical'
// - 'boolean' to true or false
// - number as string to number
export const convertStringToValue = (string: string, type: JSType | 'icon') => {
  switch (type) {
    case 'icon':
      return string
    case 'boolean':
      if (string === 'true') {
        return true
      }
      else if (string === 'false') {
        return false
      }
      else {
        return false
      }
    case 'number':
      if (string === '' || Number.isNaN(Number(string))) {
        return null
      }
      return Number(string)
    case 'string':
      return string.replace(/^['"]|['"]$/g, '')
    case 'object':
      try {
        return JSON.parse(string)
      }
      catch {
        return {}
      }
    case 'array':
      try {
        return JSON.parse(string)
      }
      catch {
        return []
      }
    default:
      return null
  }
}

const computeTypeAndOptions = (componentId: string, key: string, prop: PropertyMeta, level: number) => {
  let type: JSType | 'icon'
  const options: string[] = []
  const propType = typeof prop.schema === 'string' ? prop.schema.replace(' | undefined', '') : prop.schema?.type?.replace(' | undefined', '')

  if (propType === 'boolean') {
    type = 'boolean'
  }
  else if (propType === 'number') {
    type = 'number'
  }
  else if (level > 1) {
    type = 'string'
  }
  else if (propType === 'string' || propType.includes('string | ') || propType.includes(' | string')) {
    type = 'string'
    if (['icon', 'trailingIcon', 'leadingIcon'].includes(key)) {
      type = 'icon'
    }
    else if (componentId === '#icon' && key === 'name') {
      type = 'icon'
    }
  }
  else if (propType.includes('[]')) {
    type = level > 0 ? 'string' : 'array'
  }
  else if (propType.startsWith('Partial<')) {
    type = level > 0 ? 'string' : 'object'
  }
  else if (propType.startsWith('Record<')) {
    type = level > 0 ? 'string' : 'object'
  }
  else if (typeof prop.schema === 'object' && prop.schema?.kind === 'object') {
    type = 'object'
  }
  else if (typeof prop.schema === 'object' && prop.schema?.kind === 'enum' && prop.schema.schema) {
    const objectSchema = Object.values(prop.schema.schema).find((s: PropertyMetaSchema) => {
      return typeof s === 'object' && s.kind === 'object' && !s.type.includes('string')
    })
    if (objectSchema) {
      type = level > 0 ? 'string' : 'object'
    }
    else {
      type = 'string'
      options.push(...convertStringToArray(prop.type))
    }
  }
  else {
    type = 'string'
    options.push(...convertStringToArray(prop.type))
  }

  return { type, options }
}

const hideProp = (prop: FormItem, isNuxtUIComponent: boolean) => {
  const key = prop.key!.replace(':', '')

  // Hide some props only for Nuxt UI components
  if (!isNuxtUIComponent) {
    return false
  }

  if (HIDDEN_PROPS.includes(key)) {
    return true
  }

  return false
}

const generateDefault = (type: JSType | 'icon', level = 0): string | boolean | number | [] | object | null => {
  if (type === 'array') {
    return level > 0 ? '' : []
  }
  else if (type === 'object') {
    return level > 0 ? '' : {}
  }
  else if (type === 'boolean') {
    return false
  }
  else if (type === 'number') {
    return null
  }

  return ''
}

const generateComponentId = (componentName: string) => {
  const titleCaseName = titleCase(componentName)
  if (titleCaseName.startsWith('U ')) {
    return `#u_${flatCase(componentName).slice(1)}`
  }
  else if (titleCaseName.startsWith('Prose ')) {
    return `#prose_${flatCase(componentName).slice(6)}`
  }
  return `#${flatCase(componentName)}`
}
