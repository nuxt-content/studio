import { flatCase, pascalCase, titleCase, upperFirst } from 'scule'
import { hasProtocol } from 'ufo'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { JSType } from 'untyped'
import type { FormItem, FormTree } from '../../types'
import type { PropertyMeta } from 'vue-component-meta'

// https://developer.mozilla.org/fr/docs/Web/HTML/Element/video#attributs
// const videoProps = [
//   {
//     name: 'src',
//     schema: 'string',
//   },
//   {
//     name: 'autoplay',
//     schema: 'boolean',
//   },
//   {
//     name: 'controls',
//     schema: 'boolean',
//   },
//   {
//     name: 'loop',
//     schema: 'boolean',
//   },
//   {
//     name: 'muted',
//     schema: 'boolean',
//   },
//   {
//     name: 'poster',
//     schema: 'string',
//   },
//   {
//     name: 'preload',
//     schema: 'string',
//   },
//   {
//     name: 'width',
//     schema: 'number',
//   },
//   {
//     name: 'height',
//     schema: 'number',
//   },
// ] as Array<PropertyMeta>

// const imgProps = [
//   {
//     name: 'src',
//     schema: 'string',
//   },
//   {
//     name: 'alt',
//     schema: 'string',
//   },
//   {
//     name: 'width',
//     schema: 'number',
//   },
//   {
//     name: 'height',
//     schema: 'number',
//   },
// ] as Array<PropertyMeta>

export const buildFormTreeFromProps = (node: ProseMirrorNode, props: PropertyMeta[]): FormTree => {
  const nodeProps = node?.attrs?.props || {}
  const formTree: FormTree = {}
  const componentName = pascalCase(node?.attrs?.tag)
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
  // HTML element props
  else {
    // let elementProps: Array<PropertyMeta> = []
    // switch (node?.type?.name) {
    //   case 'video':
    //     elementProps = videoProps
    //     break
    //   case 'image':
    //     elementProps = imgProps
    //     break
    // }

    // for (const prop of elementProps) {
    //   const propItem = buildPropItem(componentId, prop, nodeProps)
    //   if (propItem) {
    //     formTree[propItem.key!] = propItem
    //   }
    // }
  }

  // Add custom props added manually by user
  for (const key in nodeProps) {
    // Skip props already added from meta
    if (formTree[key] || formTree[`:${key}`]) {
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

    const formattedKey = typeof value !== 'string' ? `:${key}` : key
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

    if (hideProp(formTree[key])) {
      formTree[key].hidden = true
    }

    if (['object', 'array'].includes(formTree[key].type)) {
      const children = formTree[key].type === 'array' ? formTree[key].arrayItemForm?.children : formTree[key].children
      if (children) {
        for (const childKey in children) {
          if (hideProp(children[childKey], formTree[key])) {
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
  let defaultValue: string | boolean | number | object | unknown[] | null = prop.tags?.find(tag => tag.name === 'defaultValue')?.text || ''

  const { type, options } = computeTypeAndOptions(componentId, key, prop, level)

  // Format key based on type
  const formattedKey = ['string', 'icon'].includes(type) ? key : `:${key}`
  const id = parent?.id ? `${parent?.id}/${formattedKey}` : `${componentId}/${formattedKey}`
  const nodeValue = parent?.type === 'object' && parent?.value ? (parent.value as Record<string, unknown>)[key] : nodeProps[key] || nodeProps[`:${key}`]
  let value = typeof nodeValue === 'string' ? convertStringToValue(nodeValue, type) : nodeValue

  if (!defaultValue) {
    defaultValue = generateDefault(type, level)
  }
  else {
    defaultValue = typeof defaultValue === 'string' && defaultValue !== '' ? convertStringToValue(defaultValue, type) : defaultValue
  }

  if (!value) {
    value = defaultValue
  }

  const propItem: FormItem = {
    id,
    key: formattedKey,
    title,
    value,
    type,
    custom: false,
    default: defaultValue,
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

  if (level > 1) {
    type = 'string'
  }
  if (propType === 'boolean') {
    type = 'boolean'
  }
  else if (propType === 'string' || propType.includes('string | ') || propType.includes(' | string')) {
    type = 'string'
    if (['icon', 'trailingIcon', 'leadingIcon'].includes(key)) {
      type = 'icon'
    }
    else if (componentId === '#u_icon' && key === 'name') {
      type = 'icon'
    }
  }
  else if (propType === 'number') {
    type = 'number'
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
  else if (typeof prop.schema === 'object' && prop.schema?.kind === 'enum') {
    // @ts-expect-error existing type
    const objectSchema = Object.values((prop.schema as Schema)?.schema).find(s => s.kind === 'object' && !s.type.includes('string'))
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

const hideProp = (prop: FormItem, parent?: FormItem) => {
  const key = prop.key!.replace(':', '')
  const componentId = parent ? parent.id.split('/')[0] : prop.id.split('/')[0]

  // Hide some props only for Nuxt UI components
  if (!componentId.startsWith('#u_') && !componentId.startsWith('#prose_')) {
    return false
  }

  if (['ui', 'as', 'activeClass', 'inactiveClass', 'exactActiveClass', 'ariaCurrentValue', 'href', 'rel', 'noRel', 'prefetch', 'prefetchOn', 'noPrefetch', 'prefetchedClass', 'replace', 'exact', 'exactQuery', 'exactHash', 'external', 'onClick', 'viewTransition', 'loading', 'loadingIcon', 'as', 'activeColor', 'activeVariant', 'loading', 'loadingIcon', 'loadingAuto', 'disabled', 'active', 'leading', 'trailing', 'customize', ':__tiptapWrap'].includes(key)) {
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
