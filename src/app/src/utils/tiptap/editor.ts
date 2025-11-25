import type { EditorSuggestionMenuItem } from '@nuxt/ui/runtime/components/EditorSuggestionMenu.vue.js'
import type { EditorToolbarItem } from '@nuxt/ui/runtime/components/EditorToolbar.vue.js'
import { omit } from '../object'

export const headingItems = [
  { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
  { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
  { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
  { kind: 'heading', level: 4, label: 'Heading 4', icon: 'i-lucide-heading-4' },
] satisfies EditorToolbarItem[]

export const listItems = [
  { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
  { kind: 'orderedList', label: 'Ordered List', icon: 'i-lucide-list-ordered' },
] satisfies EditorToolbarItem[]

export const codeBlockItem = [
  { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote' },
  { kind: 'codeBlock', label: 'Code Block', icon: 'i-lucide-square-code' },
] satisfies EditorToolbarItem[]

export const markItems = [
  { kind: 'mark', mark: 'bold', label: 'Bold', icon: 'i-lucide-bold' },
  { kind: 'mark', mark: 'italic', label: 'Italic', icon: 'i-lucide-italic' },
  { kind: 'mark', mark: 'strike', label: 'Strike', icon: 'i-lucide-strikethrough' },
  { kind: 'mark', mark: 'code', label: 'Code', icon: 'i-lucide-code' },
] satisfies EditorToolbarItem[]

export const standardToolbarItems = [
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
          label: 'Headings',
        },
        ...headingItems,
      ],
    },
    {
      kind: 'dropdown',
      icon: 'i-lucide-list',
      items: listItems,
    },
    ...codeBlockItem.map(item => (omit(item, 'label') as EditorSuggestionMenuItem)),
  ],
  [
    ...markItems.map(item => (omit(item, 'label') as EditorSuggestionMenuItem)),
    {
      kind: 'slot',
      slot: 'link' as const,
    },
  ],
] satisfies EditorToolbarItem[][]

export const standardSuggestionItems = [
  [
    {
      type: 'label',
      label: 'Style',
    }, {
      kind: 'paragraph',
      label: 'Paragraph',
      icon: 'i-lucide-type',
    },
    ...headingItems as EditorSuggestionMenuItem[],
    ...listItems as EditorSuggestionMenuItem[],
    ...codeBlockItem as EditorSuggestionMenuItem[],
    ...markItems as EditorSuggestionMenuItem[],
  ],
  [
    {
      type: 'label',
      label: 'Insert',
    },
    {
    //   kind: 'emoji',
    //   label: 'Emoji',
    //   icon: 'i-lucide-smile-plus',
    // }, {
      kind: 'image',
      label: 'Image',
      icon: 'i-lucide-image',
    },
    {
      kind: 'horizontalRule',
      label: 'Horizontal Rule',
      icon: 'i-lucide-separator-horizontal',
    },
  ],
] satisfies EditorSuggestionMenuItem[][]

export const standardElements: Record<string, { name: string, icon: string }> = {
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
