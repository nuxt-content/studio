import type { EditorSuggestionMenuItem } from '@nuxt/ui/runtime/components/EditorSuggestionMenu.vue.js'
import type { EditorToolbarItem } from '@nuxt/ui/runtime/components/EditorToolbar.vue.js'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.d.ts'
import type { Editor, JSONContent } from '@tiptap/vue-3'
import { mapEditorItems } from '@nuxt/ui/utils/editor'
import { upperFirst } from 'scule'

import { isEmpty, omit } from '../object'

type TFunction = (key: string) => string

export const getHeadingItems = (t: TFunction) => [
  { kind: 'heading', level: 1, label: t('studio.tiptap.toolbar.h1'), icon: 'i-lucide-heading-1' },
  { kind: 'heading', level: 2, label: t('studio.tiptap.toolbar.h2'), icon: 'i-lucide-heading-2' },
  { kind: 'heading', level: 3, label: t('studio.tiptap.toolbar.h3'), icon: 'i-lucide-heading-3' },
  { kind: 'heading', level: 4, label: t('studio.tiptap.toolbar.h4'), icon: 'i-lucide-heading-4' },
] satisfies EditorToolbarItem[]

export const getListItems = (t: TFunction) => [
  { kind: 'bulletList', label: t('studio.tiptap.toolbar.bulletList'), icon: 'i-lucide-list' },
  { kind: 'orderedList', label: t('studio.tiptap.toolbar.orderedList'), icon: 'i-lucide-list-ordered' },
] satisfies EditorToolbarItem[]

export const getCodeBlockItem = (t: TFunction) => [
  { kind: 'blockquote', label: t('studio.tiptap.toolbar.blockquote'), icon: 'i-lucide-text-quote' },
  { kind: 'codeBlock', label: t('studio.tiptap.toolbar.codeBlock'), icon: 'i-lucide-square-code' },
] satisfies EditorToolbarItem[]

export const getMarkItems = (t: TFunction) => [
  { kind: 'mark', mark: 'bold', label: t('studio.tiptap.toolbar.bold'), icon: 'i-lucide-bold' },
  { kind: 'mark', mark: 'italic', label: t('studio.tiptap.toolbar.italic'), icon: 'i-lucide-italic' },
  { kind: 'mark', mark: 'strike', label: t('studio.tiptap.toolbar.strike'), icon: 'i-lucide-strikethrough' },
  { kind: 'mark', mark: 'code', label: t('studio.tiptap.toolbar.code'), icon: 'i-lucide-code' },
] satisfies EditorToolbarItem[]

export const getStandardToolbarItems = (t: TFunction) => [
  [
    {
      kind: 'undo',
      icon: 'i-lucide-undo',
    }, {
      kind: 'redo',
      icon: 'i-lucide-redo',
    },
  ],
  [
    {
      kind: 'dropdown',
      icon: 'i-lucide-heading',
      ui: {
        label: 'text-xs',
      },
      items: [
        {
          type: 'label',
          label: t('studio.tiptap.toolbar.headings'),
        },
        ...getHeadingItems(t),
      ],
    },
    {
      kind: 'dropdown',
      icon: 'i-lucide-list',
      items: getListItems(t),
    },
    ...getCodeBlockItem(t).map(item => (omit(item, ['label']) as EditorSuggestionMenuItem)),
  ],
  [
    ...getMarkItems(t).map(item => (omit(item, ['label']) as EditorSuggestionMenuItem)),
    {
      kind: 'slot',
      slot: 'link' as const,
    },
  ],
] satisfies EditorToolbarItem[][]

export const getStandardSuggestionItems = (t: TFunction): EditorSuggestionMenuItem[][] => [
  [
    {
      type: 'label',
      label: t('studio.tiptap.suggestion.style'),
    }, {
      kind: 'paragraph',
      label: t('studio.tiptap.suggestion.paragraph'),
      icon: 'i-lucide-type',
    },
    ...getHeadingItems(t) as EditorSuggestionMenuItem[],
    ...getListItems(t) as EditorSuggestionMenuItem[],
    ...getCodeBlockItem(t) as EditorSuggestionMenuItem[],
    ...getMarkItems(t) as EditorSuggestionMenuItem[],
  ],
  [
    {
      type: 'label',
      label: t('studio.tiptap.suggestion.insert'),
    },
    {
    //   kind: 'emoji',
    //   label: 'Emoji',
    //   icon: 'i-lucide-smile-plus',
    // }, {
      kind: 'image',
      label: t('studio.tiptap.suggestion.image'),
      icon: 'i-lucide-image',
    },
    {
      kind: 'horizontalRule',
      label: t('studio.tiptap.suggestion.horizontalRule'),
      icon: 'i-lucide-separator-horizontal',
    },
  ],
]

export const standardNuxtUIComponents: Record<string, { name: string, icon: string }> = {
  'icon-menu-toggle': { name: 'Icon Menu Toggle', icon: 'i-lucide-menu' },
  'accordion': { name: 'Accordion', icon: 'i-lucide-chevron-down' },
  'accordion-item': { name: 'Accordion Item', icon: 'i-lucide-minus' },
  'badge': { name: 'Badge', icon: 'i-lucide-tag' },
  'callout': { name: 'Callout', icon: 'i-lucide-message-square' },
  'card': { name: 'Card', icon: 'i-lucide-square' },
  'card-group': { name: 'Card Group', icon: 'i-lucide-braces' },
  'code-collapse': { name: 'Code Collapse', icon: 'i-lucide-unfold-vertical' },
  'code-group': { name: 'Code Group', icon: 'i-lucide-braces' },
  'code-icon': { name: 'Code Icon', icon: 'i-lucide-code-2' },
  'code-preview': { name: 'Code Preview', icon: 'i-lucide-eye' },
  'code-tree': { name: 'Code Tree', icon: 'i-lucide-folder-tree' },
  'collapsible': { name: 'Collapsible', icon: 'i-lucide-fold-vertical' },
  'field': { name: 'Field', icon: 'i-lucide-box' },
  'field-group': { name: 'Field Group', icon: 'i-lucide-boxes' },
  'icon': { name: 'Icon', icon: 'i-lucide-circle-dot' },
  'kbd': { name: 'Kbd', icon: 'i-lucide-keyboard' },
  'script': { name: 'Script', icon: 'i-lucide-file-code' },
  'steps': { name: 'Steps', icon: 'i-lucide-list-ordered' },
  'table': { name: 'Table', icon: 'i-lucide-table' },
  'tabs': { name: 'Tabs', icon: 'i-lucide-panels-top-left' },
  'tabs-item': { name: 'Tabs Item', icon: 'i-lucide-rectangle-horizontal' },
  'caution': { name: 'Caution', icon: 'i-lucide-triangle-alert' },
  'note': { name: 'Note', icon: 'i-lucide-info' },
  'tip': { name: 'Tip', icon: 'i-lucide-lightbulb' },
  'warning': { name: 'Warning', icon: 'i-lucide-alert-triangle' },
}

export function computeStandardDragActions(editor: Editor, selectedNode: JSONContent, t: TFunction): DropdownMenuItem[][] {
  const type = selectedNode.node.type
  let label: string = upperFirst(type)

  // Map known types to their translation keys
  const typeTranslationMap: Record<string, string> = {
    paragraph: 'studio.tiptap.suggestion.paragraph',
    heading: 'studio.tiptap.toolbar.headings',
    bulletList: 'studio.tiptap.toolbar.bulletList',
    orderedList: 'studio.tiptap.toolbar.orderedList',
    blockquote: 'studio.tiptap.toolbar.blockquote',
    codeBlock: 'studio.tiptap.toolbar.codeBlock',
    image: 'studio.tiptap.suggestion.image',
    horizontalRule: 'studio.tiptap.suggestion.horizontalRule',
  }

  if (typeTranslationMap[type]) {
    label = t(typeTranslationMap[type])
  }

  return mapEditorItems(editor, [
    [
      {
        type: 'label',
        label,
      },
      {
        label: t('studio.tiptap.drag.turnInto'),
        icon: 'i-lucide-repeat-2',
        children: [
          { kind: 'paragraph', label: t('studio.tiptap.suggestion.paragraph'), icon: 'i-lucide-type' },
          ...getHeadingItems(t),
          ...getListItems(t),
          ...getCodeBlockItem(t),
        ],
      },
      {
        kind: 'clearFormatting',
        pos: selectedNode?.pos,
        label: t('studio.tiptap.drag.resetFormatting'),
        icon: 'i-lucide-rotate-ccw',
      },
    ],
    [
      {
        kind: 'duplicate',
        pos: selectedNode?.pos,
        label: t('studio.tiptap.drag.duplicate'),
        icon: 'i-lucide-copy',
      },
      {
        label: t('studio.tiptap.drag.copyToClipboard'),
        icon: 'i-lucide-clipboard',
        onSelect: async () => {
          if (!selectedNode) return

          const pos = selectedNode.pos
          const node = editor.state.doc.nodeAt(pos)
          if (node) {
            await navigator.clipboard.writeText(node.textContent)
          }
        },
      },
    ],
    [
      {
        kind: 'moveUp',
        pos: selectedNode?.pos,
        label: t('studio.tiptap.drag.moveUp'),
        icon: 'i-lucide-arrow-up',
      },
      {
        kind: 'moveDown',
        pos: selectedNode?.pos,
        label: t('studio.tiptap.drag.moveDown'),
        icon: 'i-lucide-arrow-down',
      },
    ],
    [
      {
        kind: 'delete',
        pos: selectedNode?.pos,
        label: t('studio.tiptap.drag.delete'),
        icon: 'i-lucide-trash',
      },
    ],
  ]) as DropdownMenuItem[][]
}

export function removeLastEmptyParagraph(jsonContent: JSONContent) {
  const lastChild = jsonContent!.content![jsonContent!.content!.length - 1]
  if (lastChild.type === 'paragraph' && isEmpty(lastChild.content)) {
    return {
      ...jsonContent,
      content: jsonContent!.content!.slice(0, -1),
    }
  }

  return jsonContent
}
