import type { JSONContent } from '@tiptap/vue-3'
import Slugger from 'github-slugger'
import type { MarkdownDocument, Node as MarkdownNode, ElementNode, CommentNode, ElementNodeAttributes } from 'comark'
import type { SyntaxHighlightTheme } from '../../types/content'
import { getEmojiUnicode } from '../emoji'
import { buildAttrs, cleanSpanProps, normalizeProps } from './props'
import type { EditorState } from '@tiptap/pm/state'
import { highlightCodeBlocks } from 'comark/plugins/shiki'

type TiptapToComarkMap = Record<string, (node: JSONContent) => MarkdownNode | MarkdownNode[]>

interface TiptapToComarkOptions {
  highlightTheme?: SyntaxHighlightTheme
}

const markToTag: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  strike: 'del',
  code: 'code',
}

// ─── Node map ─────────────────────────────────────────────────────────────────

const tiptapToComarkMap: TiptapToComarkMap = {
  'element': createElement,
  'inline-element': createElement,
  'span-style': (node: JSONContent) => createElement(node, 'span', { props: cleanSpanProps(node.attrs as Record<string, unknown>) }),
  'link': createLinkElement,
  'text': createTextElement,
  'comment': (node: JSONContent) => [null, {}, node.attrs!.text] as unknown as CommentNode,
  'listItem': createListItemElement,
  'slot': (node: JSONContent) => createElement(node, 'template', { props: { name: node.attrs?.name } }),
  'paragraph': (node: JSONContent) => createElement(node, 'p'),
  'bulletList': (node: JSONContent) => createElement(node, 'ul'),
  'orderedList': (node: JSONContent) => createElement(node, 'ol', { props: { start: node.attrs?.start } }),
  'heading': (node: JSONContent) => createHeadingElement(node),
  'blockquote': (node: JSONContent) => createElement(node, 'blockquote'),
  'horizontalRule': (node: JSONContent) => createElement(node, 'hr'),
  'bold': (node: JSONContent) => createElement(node, 'strong'),
  'italic': (node: JSONContent) => createElement(node, 'em'),
  'strike': (node: JSONContent) => createElement(node, 'del'),
  'code': (node: JSONContent) => createElement(node, 'code', { props: node.attrs }),
  'codeBlock': (node: JSONContent) => createCodeBlockElement(node),
  'image': (node: JSONContent) => createImageElement(node),
  'video': (node: JSONContent) => createVideoElement(node),
  'binding': (node: JSONContent) => {
    const defaultValue = (node.attrs as Record<string, unknown> | undefined)?.defaultValue as string
    const value = (node.attrs as Record<string, unknown> | undefined)?.value as string
    return ['binding', { defaultValue, value }] as ElementNode
  },
  'hardBreak': (node: JSONContent) => createElement(node, 'br'),
  'u-callout': (node: JSONContent) => createCalloutElement(node),
  'table': (node: JSONContent) => createTableElement(node),
  'tableRow': (node: JSONContent) => createElement(node, 'tr'),
  'tableHeader': (node: JSONContent) => createTableCellElement(node, 'th'),
  'tableCell': (node: JSONContent) => createTableCellElement(node, 'td'),
}

let slugs = new Slugger()

// ─── MarkdownNode helper ────────────────────────────────────────────────────────

/**
 * Convert an array of TipTap nodes to MarkdownNodes without spreading ElementNodes.
 *
 * `flatMap` cannot be used here because an ElementNode is itself an array
 * (e.g. `['p', {}, 'text']`), so `flatMap` would spread its contents into the
 * parent array instead of keeping it as a single child node.
 *
 * We distinguish two cases by inspecting the second element of the result:
 *   - ElementNode  → `[tag|null, Record, ...children]` — second element is a plain object
 *   - MarkdownNode[]   → multiple nodes (prefix + element + suffix from createTextElement)
 *                       — second element is an array, string, or missing
 */
function comarkNodesFromTiptap(items: JSONContent[]): MarkdownNode[] {
  return items.reduce((acc: MarkdownNode[], n) => {
    const result = tiptapNodeToComark(n)
    if (Array.isArray(result)) {
      if (result.length >= 2 && typeof result[1] === 'object' && !Array.isArray(result[1])) {
        acc.push(result as ElementNode)
      }
      else {
        for (const node of result) {
          if (node !== null && node !== undefined) {
            acc.push(node as MarkdownNode)
          }
        }
      }
    }
    else if (result !== undefined && result !== null) {
      acc.push(result as MarkdownNode)
    }
    return acc
  }, [])
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function tiptapToComark(node: JSONContent, options?: TiptapToComarkOptions): Promise<MarkdownDocument> {
  // Re-create slugs for fresh ID generation
  slugs = new Slugger()

  const frontmatter: Record<string, unknown> = {}

  const nodeCopy = JSON.parse(JSON.stringify(node))
  const fmIndex = nodeCopy.content?.findIndex((child: { type: string }) => child.type === 'frontmatter')
  if (fmIndex > -1) {
    const fm = nodeCopy.content?.[fmIndex]
    nodeCopy.content?.splice(fmIndex, 1)
    try {
      if (fm.attrs?.frontmatter && typeof fm.attrs.frontmatter === 'object') {
        Object.assign(frontmatter, fm.attrs.frontmatter)
      }
    }
    catch (error) {
      Object.assign(frontmatter, { __error__: error })
    }
  }

  const nodes = comarkNodesFromTiptap(nodeCopy.content || []).filter(Boolean) as MarkdownNode[]

  const tree: MarkdownDocument = {
    nodes,
    frontmatter,
    meta: {},
  }

  await applyShikiSyntaxHighlighting(tree, options?.highlightTheme)

  return tree
}

export function tiptapNodeToComark(node: JSONContent): MarkdownNode | MarkdownNode[] {
  // New list items create an undefined node, so we need to handle it
  if (!node) {
    return ['p', {}] as ElementNode
  }

  if (tiptapToComarkMap[node.type!]) {
    return tiptapToComarkMap[node.type!](node)
  }

  if (node.type === 'emoji') {
    return getEmojiUnicode(node.attrs?.name || '') as MarkdownNode
  }

  // All unknown nodes become a paragraph with an error message
  return ['p', {}, `--- Unknown node: ${node.type} ---`] as ElementNode
}

/**
 * Serialize a portion of the TipTap document to a MarkdownDocument
 */
export async function tiptapSliceToComark(
  state: EditorState,
  from: number,
  to: number,
): Promise<MarkdownDocument> {
  // Get the document slice
  const slice = state.doc.slice(from, to)

  // Create a temporary document containing just this slice
  const sliceDoc = state.schema.nodeFromJSON({
    type: 'doc',
    content: slice.content.toJSON(),
  })

  // Convert to TipTap JSON
  const tiptapJSON = sliceDoc.toJSON()

  // Skip frontmatter node from the slice (not needed for AI context)
  const content = tiptapJSON.content || []
  const filteredContent = content.filter((n: JSONContent) => n.type !== 'frontmatter')
  const cleanedJSON = {
    ...tiptapJSON,
    content: filteredContent,
  }

  return await tiptapToComark(cleanedJSON, {})
}

export type MarkInfo = { type: string, attrs?: Record<string, unknown> }

export function sameMark(markA: MarkInfo | null, markB: MarkInfo | null): boolean {
  if (!markA && !markB) return true
  if (!markA || !markB) return false
  return markA.type === markB.type && JSON.stringify(markA.attrs || {}) === JSON.stringify(markB.attrs || {})
}

// ─── Element creation helpers ─────────────────────────────────────────────────

function createElement(node: JSONContent, tag?: string, extra: unknown = {}): ElementNode {
  const { props = {}, ...rest } = extra as { props: object }
  let children = node.content || []

  // Unwrap TipTap wrapper
  // If text was enclosed in a paragraph manually in 'comarkToTiptap' for TipTap purpose, remove it in comark
  if (node.attrs?.props?.__tiptapWrap) {
    if (children.length === 1 && children[0]?.type === 'slot') {
      const slot = children[0]
      slot.content = unwrapParagraph(slot.content || [])
    }
    delete node.attrs.props.__tiptapWrap
  }

  // Process element props
  const elementProps = normalizeProps(node.attrs?.props || {}, props)
  if (node.type === 'paragraph') {
    // Empty paragraph
    if (!children || children.length === 0) {
      return ['p', {}] as ElementNode
    }
    // Create paragraph element
    return createParagraphElement(node, elementProps, rest)
  }

  children = unwrapDefaultSlot(children)
  children = unwrapParagraph(children)
  children = wrapImageInParagraph(children)

  const elementChildren = (node.children || comarkNodesFromTiptap(children)) as MarkdownNode[]

  return [tag || node.attrs?.tag, elementProps, ...elementChildren] as ElementNode
}

function createParagraphElement(node: JSONContent, props: ElementNodeAttributes, _rest: object = {}): ElementNode {
  const blocks: Array<{ mark: MarkInfo | null, content: JSONContent[] }> = []
  let currentBlockContent: JSONContent[] = []
  let currentBlockMark: MarkInfo | null = null

  const getMarkInfo = (child: JSONContent): MarkInfo | null => {
    if (child.type !== 'text' || !child.marks?.length) return null
    const groupable = child.marks.filter(
      mark => mark.type !== 'link' && markToTag[mark.type],
    )
    return groupable.length === 1 ? groupable[0] as MarkInfo : null
  }

  // Separate children into blocks based on number of marks
  node.content!.forEach((child) => {
    const mark = getMarkInfo(child)

    if (!sameMark(mark, currentBlockMark)) {
      if (currentBlockContent.length > 0) {
        blocks.push({ mark: currentBlockMark, content: currentBlockContent })
      }
      currentBlockContent = []
      currentBlockMark = mark
    }

    currentBlockContent.push(child)
  })

  if (currentBlockContent.length > 0) {
    blocks.push({ mark: currentBlockMark, content: currentBlockContent })
  }

  const flatChildren: MarkdownNode[] = []
  for (const block of blocks) {
    if (block.content.length > 1 && block.mark && markToTag[block.mark.type]) {
      const blockMark = block.mark
      block.content.forEach((child: JSONContent) => {
        if (child.type === 'text' && child.marks) {
          child.marks = child.marks.filter(mark => !sameMark(mark as MarkInfo, blockMark))
          if (child.marks.length === 0) delete child.marks
        }
      })
      const markAttrs = blockMark.attrs && Object.keys(blockMark.attrs).length > 0 ? blockMark.attrs : {}
      flatChildren.push([markToTag[blockMark.type], markAttrs, ...comarkNodesFromTiptap(block.content)] as ElementNode)
    }
    else {
      flatChildren.push(...comarkNodesFromTiptap(block.content))
    }
  }

  const mergedChildren = mergeSiblingsWithSameTag(flatChildren, Object.values(markToTag))

  return ['p', props, ...mergedChildren] as ElementNode
}

function createHeadingElement(node: JSONContent): ElementNode {
  const headingEl = createElement(node, `h${node.attrs?.level}`) as ElementNode
  const [tag, attrs, ...children] = headingEl

  const id = slugs
    .slug(getNodeContent(node)!)
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/^(\d)/, '_$1')

  return [tag, { ...attrs as object, id }, ...children] as ElementNode
}

function createCodeBlockElement(node: JSONContent): ElementNode {
  const code = node.attrs?.code || getNodeContent(node)
  const language = node.attrs?.language
  const filename = node.attrs?.filename

  // Any pre attr beyond language/filename (notably `code`) makes comark emit a `::pre{…}` wrapper, not a ``` fence.
  const attrs: ElementNodeAttributes = {}
  if (language) attrs.language = language
  if (filename) attrs.filename = filename

  const codeChild: ElementNode = ['code', { __ignoreMap: '' }, code as MarkdownNode]

  return ['pre', attrs, codeChild] as ElementNode
}

// Boolean video attrs that comark serializes with a `:` prefix (e.g. `:controls: 'true'`).
const VIDEO_BOOLEAN_ATTRS = new Set(['controls', 'autoplay', 'loop', 'muted'])

function createImageElement(node: JSONContent): ElementNode {
  // Preserve the attr order TipTap stored
  const imageProps = buildAttrs(node.attrs?.props, {
    fallbacks: { src: node.attrs?.src, alt: node.attrs?.alt },
  })
  if (['nuxt-img', 'nuxt-picture'].includes(node.attrs?.tag)) {
    return createElement(node, node.attrs?.tag, { props: imageProps }) as ElementNode
  }
  return createElement(node, 'img', { props: imageProps }) as ElementNode
}

function createVideoElement(node: JSONContent): ElementNode {
  // Preserve the attr order TipTap stored
  const videoProps = buildAttrs(node.attrs?.props, {
    transform: (key, value) => {
      if (key.startsWith(':')) return [key, value]
      if (VIDEO_BOOLEAN_ATTRS.has(key)) return value ? [`:${key}`, 'true'] : null
      return [key, value]
    },
    fallbacks: { src: node.attrs?.src },
  })

  const children = comarkNodesFromTiptap(node.content || [])
  return ['video', videoProps, ...children] as ElementNode
}

function createCalloutElement(node: JSONContent): ElementNode {
  // Support both new 'tag' attr and legacy 'type' attr for backward compatibility
  const tag = node.attrs?.tag || node.attrs?.type || 'note'
  return createElement(node, tag) as ElementNode
}

function createTableElement(node: JSONContent): ElementNode {
  const headerRows: MarkdownNode[] = []
  const bodyRows: MarkdownNode[] = []

  for (const row of (node.content || [])) {
    if (row.type !== 'tableRow') continue
    const firstCell = row.content?.[0]
    if (firstCell?.type === 'tableHeader') {
      headerRows.push(tiptapNodeToComark(row) as MarkdownNode)
    }
    else {
      bodyRows.push(tiptapNodeToComark(row) as MarkdownNode)
    }
  }

  const children: MarkdownNode[] = []
  if (headerRows.length > 0) {
    children.push(['thead', {}, ...headerRows] as ElementNode)
  }
  if (bodyRows.length > 0) {
    children.push(['tbody', {}, ...bodyRows] as ElementNode)
  }

  return ['table', {}, ...children] as ElementNode
}

function createTableCellElement(node: JSONContent, tag: 'th' | 'td'): ElementNode {
  const content = comarkNodesFromTiptap(node.content || [])
  // Unwrap single paragraph wrapper (reverses the wrapping done in comarkToTiptap)
  if (content.length === 1 && Array.isArray(content[0]) && (content[0] as ElementNode)[0] === 'p') {
    const pChildren = (content[0] as ElementNode).slice(2) as MarkdownNode[]
    return [tag, {}, ...pChildren] as ElementNode
  }
  return [tag, {}, ...content] as ElementNode
}

function createLinkElement(node: JSONContent): ElementNode {
  // Preserve the attr order TipTap stored
  const linkProps = buildAttrs(node.attrs, {
    transform: (key, value) => {
      if (!value) return null
      if (key === 'className') return ['class', value]
      return [key, value]
    },
  })
  const children = (node.children || []) as MarkdownNode[]
  return ['a', linkProps, ...children] as ElementNode
}

function createTextElement(node: JSONContent): MarkdownNode | MarkdownNode[] {
  const prefix = node.text?.match(/^\s+/)?.[0] || ''
  const suffix = node.text?.match(/\s+$/)?.[0] || ''
  const text = node.text?.trim() || ''

  if (!node.marks?.length) {
    return node.text! as MarkdownNode
  }

  // code must be innermost — comark's textContent() strips nested markup when handling it.
  const orderedMarks = node.marks!.slice().sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    if (a.type === b.type) return 0
    if (a.type === 'code') return -1
    if (b.type === 'code') return 1
    return 0
  })

  const res = orderedMarks.reduce((acc: MarkdownNode, mark: Record<string, unknown>) => {
    const markAttrs = (mark.attrs as Record<string, unknown>) || {}
    if (mark.type === 'link') {
      // Preserve the attr order the link mark was authored in. TipTap auto-injects
      const href = String(markAttrs.href || '')
      const isExternal = href.startsWith('http://') || href.startsWith('https://')
      const linkAttrs = buildAttrs(markAttrs, {
        transform: (key, value) => {
          if (!value) return null
          if (key === 'rel') return null
          if (key === 'target' && isExternal) return null
          return [key, String(value)]
        },
      })
      return ['a', linkAttrs, acc] as ElementNode
    }
    const markTag = markToTag[mark.type as string]
    if (markTag) {
      // code marks: convert 'language' back to 'lang' (comark's inline code attribute name)
      if (markTag === 'code') {
        const codeAttrs: Record<string, unknown> = {}
        if ((markAttrs as Record<string, unknown>).language) {
          codeAttrs.lang = (markAttrs as Record<string, unknown>).language
        }
        return ['code', codeAttrs, acc] as ElementNode
      }
      const elementAttrs = Object.keys(markAttrs).length > 0 ? markAttrs : {}
      return [markTag, elementAttrs, acc] as ElementNode
    }
    return acc
  }, text as MarkdownNode)

  return [
    prefix ? prefix as MarkdownNode : null,
    res,
    suffix ? suffix as MarkdownNode : null,
  ].filter(Boolean) as MarkdownNode[]
}

function createListItemElement(node: JSONContent): ElementNode {
  // Remove paragraph children
  node.content = (node.content || []).flatMap((child: JSONContent) => {
    if (child.type === 'paragraph') {
      return child.content || []
    }

    return child
  })
  return createElement(node, 'li') as ElementNode
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function applyShikiSyntaxHighlighting(tree: MarkdownDocument, theme: SyntaxHighlightTheme = { default: 'github-light', dark: 'github-dark' }) {
  // Clean all style element nodes before applying syntax highlighting
  tree.nodes = tree.nodes.filter((node) => {
    if (!Array.isArray(node) || node[0] === null) return true
    return (node as ElementNode)[0] !== 'style'
  })

  // Only invoke Shiki when there are actual code blocks to process
  const hasCodeBlocks = tree.nodes.some(node => Array.isArray(node) && (node as ElementNode)[0] === 'pre')
  if (!hasCodeBlocks) return

  const themes: Record<string, string> = {
    default: theme.default || 'github-light',
    dark: theme.dark || 'github-dark',
    light: theme.light || theme.default || 'github-light',
  }

  const highlighted = await highlightCodeBlocks(tree, { themes })
  tree.nodes = highlighted.nodes
}

/**
 * Ensure image and video blocks are wrapped in a paragraph when named slots are present.
 */
function wrapImageInParagraph(content: JSONContent[]): JSONContent[] {
  if (!content.some(c => (c as JSONContent).type === 'slot')) return content
  return content.map(child =>
    (child as JSONContent).type === 'image'
      ? { type: 'paragraph', content: [child as JSONContent] }
      : child,
  )
}

/**
 * Unwrap single paragraph child (Comark auto-unwrap feature)
 */
function unwrapParagraph(content: JSONContent[]): JSONContent[] {
  if (content.length === 1 && content[0]?.type === 'paragraph') {
    return content[0].content || []
  }
  return content
}

/**
 * Unwrap default slot (reverts `wrapChildrenWithinSlot` from `comarkToTiptap`)
 */
function unwrapDefaultSlot(content: JSONContent[]): JSONContent[] {
  const idx = content.findIndex(
    n => n?.type === 'slot' && n.attrs?.name === 'default',
  )
  if (idx === -1) return content
  const slotChildren = content[idx].content || []
  return [...content.slice(0, idx), ...slotChildren, ...content.slice(idx + 1)]
}

/**
 * Merge adjacent children with the same tag if separated by a single space text node
 */
function mergeSiblingsWithSameTag(children: MarkdownNode[], allowedTags: string[]): MarkdownNode[] {
  if (!Array.isArray(children)) return children
  const merged: MarkdownNode[] = []
  let i = 0
  while (i < children.length) {
    const current = children[i]
    const next = children[i + 1]
    const afterNext = children[i + 2]

    const isEl = (n: MarkdownNode) => Array.isArray(n) && n[0] !== null
    const elTag = (n: MarkdownNode) => (n as ElementNode)[0] as string
    const elAttrs = (n: MarkdownNode) => (n as ElementNode)[1] as Record<string, unknown>
    const elChildren = (n: MarkdownNode) => (n as ElementNode).slice(2) as MarkdownNode[]

    if (
      current && afterNext
      && isEl(current) && isEl(afterNext)
      && elTag(current) === elTag(afterNext)
      && allowedTags.includes(elTag(current))
      && JSON.stringify(elAttrs(current) || {}) === JSON.stringify(elAttrs(afterNext) || {})
      && next && typeof next === 'string' && next === ' '
    ) {
      merged.push([
        elTag(current),
        elAttrs(current),
        ...elChildren(current),
        ' ' as MarkdownNode,
        ...elChildren(afterNext),
      ] as ElementNode)
      i += 3
    }
    else {
      merged.push(current)
      i++
    }
  }
  return merged
}

function getNodeContent(node: JSONContent): string | undefined {
  if (node.type === 'text') {
    return node.text
  }

  let content = ''
  node.content?.forEach((childNode) => {
    content += getNodeContent(childNode)
  })

  return content
}
