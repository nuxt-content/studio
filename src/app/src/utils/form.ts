import type { Draft07, Draft07DefinitionProperty, Draft07DefinitionPropertyAnyOf, Draft07DefinitionPropertyAllOf, Draft07DefinitionPropertyOneOf } from '@nuxt/content'
import type { FormTree, FormItem } from '../types'
import { upperFirst } from 'scule'
import { omit } from './object'

export const buildFormTreeFromSchema = (treeKey: string, schema: Draft07): FormTree => {
  if (!schema || !schema.definitions || !schema.definitions[treeKey]) {
    return {}
  }

  const buildFormTreeItem = (def: Draft07DefinitionProperty, id: string = `#${treeKey}`): FormItem | null => {
    const paths = id.split('/')
    const itemKey = paths.pop()!.replace('#', '')
    const level = paths.length

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
        if (item!.type !== 'boolean' && booleanDef) {
          item!.toggleable = true
        }

        return item
      }

      // Object form
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

      // Array form
      if (def.type === 'array' && def.items) {
        return {
          id,
          title: upperFirst(itemKey),
          type: 'array',
          arrayItemForm: buildFormTreeItem(def.items, `#${itemKey}/items`)!,
        }
      }

      // Primitive form
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
      item.arrayItemForm = buildFormTreeItem(def.items, `#${itemKey}/items`)!
    }

    if (def.enum && Array.isArray(def.enum) && def.enum.length > 0) {
      item.options = def.enum as string[]
    }

    return item
  }

  return {
    [treeKey]: buildFormTreeItem(schema.definitions[treeKey] as Draft07DefinitionProperty) as FormItem,
  }
}

// Apply json to form tree values
// Only override properties that are present in the tree
export const applyValuesToFormTree = (tree: FormTree, override: Record<string, unknown>): FormTree => {
  return Object.keys(tree).reduce((acc, key) => {
    // Recursively override if found
    if (override[key]) {
      if (tree[key].children) {
        return {
          ...acc,
          [key]: {
            ...(omit(tree[key], ['children'])),
            children: {
              ...tree[key].children,
              ...applyValuesToFormTree(tree[key].children, override[key] as Record<string, unknown>),
            },
          },
        } as FormTree
      }

      return {
        ...acc,
        [key]: {
          ...tree[key],
          value: override[key],
        },
      } as FormTree
    }
    // Else recusively add empty value
    else {
      if (tree[key].children) {
        return {
          ...acc,
          [key]: {
            ...(omit(tree[key], ['children'])),
            children: {
              ...tree[key].children,
              ...applyValuesToFormTree(tree[key].children, {}),
            },
          },
        }
      }

      return {
        ...acc,
        [key]: {
          ...tree[key],
          value: '',
        },

      }
    }
  }, {})
}

// Recursively traverse the form tree to find the corresponding id and update the value
export const applyValueById = (form: FormTree, id: string, value: unknown): FormTree => {
  return Object.keys(form).reduce((acc, key) => {
    if (form[key].id === id) {
      return {
        ...acc,
        [key]: {
          ...form[key],
          value,
        },
      }
    }
    else if (form[key].children) {
      return {
        ...acc,
        [key]: {
          ...form[key],
          children: applyValueById(form[key].children, id, value),
        },
      }
    }
    return {
      ...acc,
      [key]: form[key],
    }
  }, {})
}

// Recursively compare form trees to find the updated item and return it
// Updated item must a be leaf (input) of the form
export const getUpdatedTreeItem = (original: FormTree, updated: FormTree): FormItem | null => {
  for (const key of Object.keys(updated)) {
    const originalItem = original[key]
    const updatedItem = updated[key]

    if (!originalItem) {
      continue
    }

    // If both have children, recurse into them
    if (originalItem.children && updatedItem.children) {
      const result = getUpdatedTreeItem(originalItem.children, updatedItem.children)
      if (result) {
        return result
      }
    }
    // If it's a leaf node, compare values
    else if (!updatedItem.children) {
      if (originalItem.value !== updatedItem.value) {
        return updatedItem
      }
    }
  }

  return null
}
