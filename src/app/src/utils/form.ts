import type { Draft07, Draft07DefinitionProperty, Draft07DefinitionPropertyAnyOf, Draft07DefinitionPropertyAllOf, Draft07DefinitionPropertyOneOf } from '@nuxt/content'
import type { FormTree, FormItem } from '../types'
import { upperFirst } from 'scule'

export const buildFormTreeFromSchema = (treeKey: string, schema: Draft07): FormTree => {
  if (!schema || !schema.definitions || !schema.definitions[treeKey]) {
    return {}
  }

  const buildFormTreeItem = (def: Draft07DefinitionProperty, id: string = `#frontmatter/${treeKey}`): FormItem | null => {
    const paths = id.split('/')
    const itemKey = paths.pop()!
    const level = paths.length - 1 // deduce #frontmatter

    const editor = def.$content?.editor
    if (editor?.hidden) {
      return null
    }

    // Handle two level deep for objects keys
    if (level <= 3) {
      // Handle `Of` fields
      if (
        (def as Draft07DefinitionPropertyAllOf).allOf
        || (def as Draft07DefinitionPropertyAnyOf).anyOf
        || (def as Draft07DefinitionPropertyOneOf).oneOf
      ) {
        let item: FormItem | null
        const defs = (def as Draft07DefinitionPropertyAllOf).allOf
          || (def as Draft07DefinitionPropertyAnyOf).anyOf
          || (def as Draft07DefinitionPropertyOneOf).oneOf

        const objectDef = defs.find(item => item.type === 'object')
        const stringDef = defs.find(item => item.type === 'string')
        const booleanDef = defs.find(item => item.type === 'boolean')

        // Choose object type in priority
        if (objectDef) {
          item = buildFormTreeItem(objectDef, id)
        }

        // Then string type
        else if (stringDef) {
          item = buildFormTreeItem(stringDef, id)
        }

        // Else select first one
        else {
          item = buildFormTreeItem(defs[0], id)
        }

        // Handle multiple types with boolean
        if (item?.type !== 'boolean' && booleanDef) {
          item!.toggleable = true
        }

        return item
      }

      // Handle custom object form
      if (def.type === 'object' && def.properties) {
        const children = Object.keys(def.properties).reduce((acc, key) => {
          // Hide content internal keys
          const hiddenKeys = ['id', 'contentId', 'weight', 'stem', 'extension', 'path', 'meta', 'body']
          if (hiddenKeys.includes(key) || def.properties![key]!.$content?.editor?.hidden) {
            return acc
          }

          const item = {
            ...acc,
            [key]: buildFormTreeItem(def.properties![key], `${id}/${key}`),
          } as FormItem

          return item
        }, {})

        const item: FormItem = {
          id,
          title: upperFirst(itemKey),
          type: editor?.input ?? def.type,
          children,
        }

        if (def.enum && Array.isArray(def.enum) && def.enum.length > 0) {
          item.options = def.enum as string[]
        }

        return item
      }

      if (def.type === 'array' && def.items) {
        return {
          id,
          title: upperFirst(itemKey),
          type: 'array',
          items: buildFormTreeItem(def.items, `#${itemKey}/items`)!,
        }
      }

      // Handle primitive types
      const editorType = editor?.input
      const type = def.type === 'string' && def.format?.includes('date') ? 'date' : editorType ?? def.type as never

      const item: FormItem = {
        id,
        title: upperFirst(itemKey),
        type: editorType ?? type,
      }

      if (def.enum && Array.isArray(def.enum) && def.enum.length > 0) {
        item.options = def.enum as string[]
      }

      return item
    }

    // Else edit directly as the return type
    const editorType = editor?.input
    const type = def.type === 'string' && def.format?.includes('date') ? 'date' : editorType ?? def.type

    const item: FormItem = {
      id,
      title: upperFirst(itemKey),
      type: editorType ?? type as never,
    }

    if (type === 'array' && def.items) {
      item.items = buildFormTreeItem(def.items, `#${itemKey}/items`)!
    }

    if (def.enum && Array.isArray(def.enum) && def.enum.length > 0) {
      item.options = def.enum as string[]
    }

    return item
  }

  return {
    [treeKey]: buildFormTreeItem(schema.definitions[treeKey]),
  }
}
