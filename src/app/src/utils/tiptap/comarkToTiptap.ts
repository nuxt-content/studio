import type { JSONContent } from '@tiptap/vue-3'
import { isEmpty } from '../../utils/object'
import type { MarkdownDocument, Node as MarkdownNode, ElementNode, CommentNode } from 'comark'
import { EMOJI_REGEXP, getEmojiUnicode } from '../emoji'
import { isValidAttr, stripBindingPrefix } from './props'
import { isElement, isComment, getTag, getAttrs, getChildren } from '../comark'
import { sameMark, type MarkInfo } from './tiptapToComark'

type ComarkToTipTapMap = Record<string, (node: ElementNode) => JSONContent | JSONContent[]>

const tagToMark: Record<string, string> = {
  strong: 'bold',
  em: 'italic',
  del: 'strike',
  code: 'code',
  a: 'link',
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Node map
* ──────────────────────────────────────────────────────────────────────────────
*/

const comarkToTiptapMap: ComarkToTipTapMap = {
  ...Object.fromEntries(Object.entries(tagToMark).map(([key, value]) => [key, node => createMark(node, value)])),
  img: node => createTipTapNode(node, 'image', { attrs: { props: getAttrs(node) || {} } }),
  video: node => createVideoTipTapNode(node),
  template: node => createTemplateNode(node),
  pre: node => createPreNode(node),
  p: node => createParagraphNode(node),
  span: node => createSpanStyleNode(node),
  h1: node => createTipTapNode(node, 'heading', { attrs: { level: 1 } }),
  h2: node => createTipTapNode(node, 'heading', { attrs: { level: 2 } }),
  h3: node => createTipTapNode(node, 'heading', { attrs: { level: 3 } }),
  h4: node => createTipTapNode(node, 'heading', { attrs: { level: 4 } }),
  h5: node => createTipTapNode(node, 'heading', { attrs: { level: 5 } }),
  h6: node => createTipTapNode(node, 'heading', { attrs: { level: 6 } }),
  ul: node => createTipTapNode(node, 'bulletList'),
  ol: node => createTipTapNode(node, 'orderedList', { attrs: { start: getAttrs(node)?.start } }),
  li: node => createTipTapNode(node, 'listItem', { children: [['p', {}, ...getChildren(node)] as ElementNode] }),
  blockquote: node => createTipTapNode(node, 'blockquote'),
  binding: node => createTipTapNode(node, 'binding', { attrs: { value: getAttrs(node)?.value, defaultValue: getAttrs(node)?.defaultValue } }),
  hr: node => createTipTapNode(node, 'horizontalRule'),
  br: () => ({ type: 'hardBreak' }),
  table: node => createTableNode(node),
  tr: node => createTableRowNode(node),
  th: node => createTableCellNode(node, 'tableHeader'),
  td: node => createTableCellNode(node, 'tableCell'),
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Entry point
* ──────────────────────────────────────────────────────────────────────────────
*/

export function comarkToTiptap(tree: MarkdownDocument, options?: { hasNuxtUI?: boolean }): JSONContent {
  const hasNuxtUI = options?.hasNuxtUI ?? false

  // Remove invalid top-level text nodes (same as MDC version filtering type !== 'text')
  const nodes = tree.nodes.filter(node => !isComment(node as MarkdownNode) || isElement(node as MarkdownNode))
    .filter(node => typeof node !== 'string')

  // Remove style elements recursively
  const cleanNodes = removeStyleElements(nodes)

  const content = cleanNodes.flatMap(node => comarkNodeToTiptap(node, undefined, hasNuxtUI))

  return {
    type: 'doc',
    content: [
      {
        type: 'frontmatter',
        attrs: { frontmatter: tree.frontmatter || {} },
      },
      ...((isEmpty(content as unknown[]) ? [{ type: 'paragraph', content: [] }] : content) as JSONContent[]),
    ],
  }
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Node converter
* ──────────────────────────────────────────────────────────────────────────────
*/

export function comarkNodeToTiptap(node: MarkdownNode, parentTag?: string, hasNuxtUI = false): JSONContent | JSONContent[] {
  /**
   * Text node
   * A TextNode is a plain string
   */
  if (typeof node === 'string') {
    return createTextNode(node)
  }

  if (!Array.isArray(node)) {
    return { type: 'text', text: '' }
  }

  const [rawTag] = node

  /**
   * Comment node
   * CommentNode is [null, {}, text]
   */
  if (rawTag === null) {
    return { type: 'comment', attrs: { text: (node as CommentNode)[2] as string } }
  }

  const tagStr = rawTag as string

  /**
   * Known node types
   */
  if (comarkToTiptapMap[tagStr]) {
    return comarkToTiptapMap[tagStr](node as ElementNode)
  }

  /**
   * Inline vue components
   * If parent is a paragraph, then element should be inline
   */
  if (parentTag === 'p') {
    return createTipTapNode(node as ElementNode, 'inline-element', { attrs: { tag: tagStr } })
  }

  /**
   * Block vue components
   */
  return createElementNode(node as ElementNode, tagStr, hasNuxtUI)
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Mark creation
* ──────────────────────────────────────────────────────────────────────────────
*/

function dedupeMarks(marks: MarkInfo[]): MarkInfo[] {
  return marks.filter((mark, index) => marks.findIndex(m => sameMark(m, mark)) === index)
}

export function createMark(node: ElementNode, mark: string, accumulatedMarks: MarkInfo[] = []): JSONContent[] {
  const attrs = { ...getAttrs(node) }

  // Link attributes
  if (mark === 'link' && attrs.href) {
    const href = String(attrs.href)
    const isExternal = href.startsWith('http://') || href.startsWith('https://')
    if (isExternal) {
      attrs.target = attrs.target || '_blank'
      attrs.rel = attrs.rel || 'noopener noreferrer nofollow'
    }
  }

  const marks = [...accumulatedMarks, { type: mark, attrs }]

  function getNodeContent(n: MarkdownNode): string {
    if (typeof n === 'string') return n
    if (!Array.isArray(n)) return ''
    const [t, , ...ch] = n
    if (t === null) return '' // comment
    return (ch as MarkdownNode[]).map(getNodeContent).join('')
  }

  const tag = getTag(node)

  if (tag === 'code') {
    // Only preserve `language` prop — strip Shiki-added props (className, style, etc.)
    // comark stores inline code language as `lang`, block code as `language`
    const codeAttrs: Record<string, unknown> = {}
    const nodeAttrs = getAttrs(node)
    const language = nodeAttrs.language || nodeAttrs.lang
    if (language) {
      codeAttrs.language = language
    }
    const codeMarks = dedupeMarks([...accumulatedMarks, { type: mark, attrs: codeAttrs }])
    return [{
      type: 'text',
      text: getNodeContent(node),
      marks: codeMarks.slice().reverse(),
    }]
  }

  return getChildren(node).map((child) => {
    if (typeof child === 'string') {
      return {
        type: 'text',
        text: child,
        marks: dedupeMarks(marks).slice().reverse(),
      }
    }
    else if (isElement(child)) {
      const childTag = getTag(child)
      if (tagToMark[childTag]) {
        // Recursively process nested mark nodes, passing down all accumulated marks
        return createMark(child, tagToMark[childTag], marks)
      }
      else {
        // For non-mark elements (e.g., links), apply marks to their text children
        const tiptapNode = comarkNodeToTiptap(child, tag) as JSONContent
        if (tiptapNode.content?.length) {
          tiptapNode.content.forEach((c) => {
            if (c.type === 'text') {
              c.marks = marks.slice().reverse()
            }
          })
        }
        return tiptapNode
      }
    }

    return comarkNodeToTiptap(child, tag) as JSONContent
  }).flat() as JSONContent[]
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Node creation helpers
* ──────────────────────────────────────────────────────────────────────────────
*/

function createTipTapNode(node: ElementNode, type: string, extra: Record<string, unknown> = {}): JSONContent {
  const { attrs = {}, children, ...rest } = extra
  const nodeAttrs = getAttrs(node)

  const cleanProps = Object.entries({
    ...((attrs as Record<string, unknown>).props as Record<string, unknown> || {}),
    ...(nodeAttrs || {}),
  })
    .map(([key, value]) => {
      // Remove MDC internal attributes
      if (key.startsWith('__mdc_')) {
        return undefined
      }
      return ['className', 'class'].includes(key.trim())
        ? ['class', typeof value === 'string' ? value : (value as string[]).join(' ')]
        : [key.trim(), value]
    })
    .filter(Boolean) as [string, unknown][]

  const tiptapNode: Record<string, unknown> = {
    type,
    ...rest,
    attrs: { ...(attrs as object) },
  }

  if (cleanProps.length) {
    (tiptapNode.attrs as Record<string, unknown>).props = Object.fromEntries(cleanProps)
  }

  const effectiveChildren = (children !== undefined ? children : getChildren(node)) as MarkdownNode[]

  if (effectiveChildren.length > 0 || children !== undefined) {
    tiptapNode.content = effectiveChildren.flatMap(child => comarkNodeToTiptap(child, getTag(node)))
  }

  return tiptapNode as JSONContent
}

function createVideoTipTapNode(node: ElementNode): JSONContent {
  const props = getAttrs(node)
  const booleanProps = ['controls', 'autoplay', 'loop', 'muted']

  // Normalize boolean properties from string "true"/"false" to actual booleans
  const normalizedProps = Object.entries(props).reduce((acc, [key, value]) => {
    const cleanKey = stripBindingPrefix(key)

    if (booleanProps.includes(cleanKey)) {
      if (value === 'true' || value === true) {
        acc[cleanKey] = true
      }
      else if (value === 'false' || value === false) {
        acc[cleanKey] = false
      }
    }
    else {
      acc[cleanKey] = value
    }
    return acc
  }, {} as Record<string, unknown>)

  // Return directly — createTipTapNode would merge normalizedProps with raw nodeAttrs,
  // causing the normalized boolean values to be overridden by the raw string values from comark.
  return {
    type: 'video',
    attrs: { props: normalizedProps },
  } as JSONContent
}

function createTemplateNode(node: ElementNode): JSONContent {
  const nodeAttrs = getAttrs(node)
  // comark uses { name: 'xxx' } format; legacy MDC used { 'v-slot:xxx': '' } format
  const name = Object.keys(nodeAttrs || {}).find(prop => prop?.startsWith('v-slot:'))?.replace('v-slot:', '')
    || (nodeAttrs as Record<string, unknown>)?.name as string
    || 'default'

  // Strip slot-internal attrs
  const cleanAttrs = Object.fromEntries(
    Object.entries(nodeAttrs || {}).filter(([key]) =>
      !key.includes('v-slot:') && key !== 'name',
    ),
  )

  // Wrap inline content in paragraph (TipTap slot requires block+ content)
  let children = getChildren(node)
  const firstChild = children[0]
  const isInlineFirstChild = typeof firstChild === 'string'
    || (Array.isArray(firstChild) && firstChild[0] !== null && (firstChild[0] as string) in tagToMark)
  if (children.length > 0 && isInlineFirstChild) {
    children = [['p', {}, ...children] as ElementNode]
  }
  else if (children.length === 0) {
    // TipTap slot requires block+ content; an empty slot would be schema-invalid
    // and crash setNodeMarkup on any later updateAttributes (e.g. renaming the slot).
    children = [['p', {}] as ElementNode]
  }

  const processedNode: ElementNode = [getTag(node), cleanAttrs, ...children]
  return createTipTapNode(processedNode, 'slot', { attrs: { name } })
}

function createPreNode(node: ElementNode): JSONContent {
  const nodeAttrs = getAttrs(node)
  const language = nodeAttrs.language ?? null
  const filename = nodeAttrs.filename
  const rawCode = nodeAttrs.code as string | undefined

  // When attrs.code is available, use it directly to preserve indentation and tab characters
  if (rawCode !== undefined) {
    return {
      type: 'codeBlock',
      attrs: { language, filename },
      content: rawCode ? [{ type: 'text', text: rawCode }] : [],
    } as JSONContent
  }

  // Fallback for comark trees that don't carry attrs.code
  const tiptapNode = createTipTapNode(node, 'codeBlock', {
    attrs: { language, filename },
  })

  // Remove empty text nodes (not allowed in TipTap codeBlock)
  if ((tiptapNode.content as JSONContent[]).length === 1 && ((tiptapNode.content as JSONContent[])[0]).text === '') {
    tiptapNode.content = []
  }

  // Remove marks from code texts
  ;(tiptapNode.content as JSONContent[]).forEach((child: JSONContent) => {
    delete child.marks
  })

  return tiptapNode
}

function createParagraphNode(node: ElementNode): JSONContent {
  const children = getChildren(node).filter(child => !(typeof child === 'string' && !child))

  // Flatten children (e.g., from createMark which returns arrays)
  const content = children.flatMap(child => comarkNodeToTiptap(child, 'p'))

  const attrs = getAttrs(node)
  return {
    type: 'paragraph',
    content,
    attrs: isEmpty(attrs) ? undefined : attrs,
  }
}

function createTextNode(text: string): JSONContent | JSONContent[] {
  const nodes: { type: string, text: string }[] = []
  let lastIndex = 0

  // Split the text using the emoji regexp, keeping the match in the result array
  text.replace(EMOJI_REGEXP, (match: string, offset: number) => {
    // Add text before the emoji
    if (lastIndex < offset) {
      nodes.push({
        type: 'text',
        text: text.slice(lastIndex, offset),
      })
    }

    // Add the emoji text node
    const emojiUnicode = getEmojiUnicode(match.substring(1, match.length - 1))
    nodes.push({
      type: 'text',
      text: emojiUnicode || match,
    })

    lastIndex = offset + match.length

    return ''
  })

  // Add any remaining text after the last emoji
  if (lastIndex < text.length) {
    nodes.push({
      type: 'text',
      text: text.slice(lastIndex),
    })
  }

  return nodes.length === 0 ? { type: 'text', text } : nodes
}

function createSpanStyleNode(node: ElementNode): JSONContent {
  const nodeAttrs = getAttrs(node)
  const spanStyle = nodeAttrs?.style
  const spanClass = nodeAttrs?.class || nodeAttrs?.className
  const spanAttrs = {
    style: isValidAttr(spanStyle as string) ? String(spanStyle).trim() : undefined,
    class: isValidAttr(spanClass as string) ? (typeof spanClass === 'string' ? spanClass : (spanClass as string[]).join(' ')).trim() : undefined,
  }

  const cleanedAttrs = { ...nodeAttrs }
  delete cleanedAttrs.style
  delete cleanedAttrs.class
  delete cleanedAttrs.className

  const cleanedNode: ElementNode = [getTag(node), cleanedAttrs, ...getChildren(node)]
  return createTipTapNode(cleanedNode, 'span-style', { attrs: spanAttrs })
}

function createElementNode(node: ElementNode, type: string, hasNuxtUI = false): JSONContent {
  const CALLOUT_TAGS = new Set(['callout', 'note', 'tip', 'warning', 'caution'])
  /**
   * In tiptap side only, inside element, text must be enclosed in a paragraph
   *
   * Note: without having the wrapper paragraph, contents of an element can't be
   * modified, TipTap depend on the paragraph to allow text editing.
   */
  let processedNode = node
  const nodeChildren = getChildren(processedNode)
  if (nodeChildren.length > 0 && typeof nodeChildren[0] === 'string') {
    const originalAttrs = getAttrs(processedNode)
    processedNode = [type, { ...originalAttrs, __tiptapWrap: true }, ['p', {}, ...nodeChildren] as ElementNode] as ElementNode
  }

  const slotWrapped = wrapChildrenWithinSlot(getChildren(processedNode))
  const tiptapType = hasNuxtUI && CALLOUT_TAGS.has(type) ? 'u-callout' : 'element'

  return createTipTapNode(processedNode, tiptapType, { attrs: { tag: type }, children: slotWrapped })
}

/**
 * Flatten thead/tbody wrappers so TipTap table contains tableRow nodes directly
 */
function createTableNode(node: ElementNode): JSONContent {
  const rows: JSONContent[] = []
  for (const child of getChildren(node)) {
    if (!isElement(child)) continue
    const childEl = child as ElementNode
    const tag = getTag(childEl)
    if (tag === 'thead' || tag === 'tbody') {
      for (const sectionChild of getChildren(childEl)) {
        if (isElement(sectionChild) && getTag(sectionChild as ElementNode) === 'tr') {
          rows.push(createTableRowNode(sectionChild as ElementNode))
        }
      }
    }
    else if (tag === 'tr') {
      rows.push(createTableRowNode(childEl))
    }
  }
  return { type: 'table', content: rows }
}

function createTableRowNode(node: ElementNode): JSONContent {
  return { type: 'tableRow', content: getChildren(node).flatMap(child => comarkNodeToTiptap(child as MarkdownNode)) as JSONContent[] }
}

const INLINE_CELL_TYPES = new Set(['text', 'hardBreak', 'inline-element', 'span-style'])

/**
 * TipTap requires every cell to contain at least one block node
 */
function createTableCellNode(node: ElementNode, type: 'tableHeader' | 'tableCell'): JSONContent {
  const children = getChildren(node)
  const content = children.flatMap(child => comarkNodeToTiptap(child as MarkdownNode)) as JSONContent[]
  if (content.length === 0) {
    return { type, content: [{ type: 'paragraph', content: [] }] }
  }
  const allInline = content.every(c => INLINE_CELL_TYPES.has(c.type as string))
  if (allInline) {
    return { type, content: [{ type: 'paragraph', content }] }
  }
  return { type, content }
}

/*
* ──────────────────────────────────────────────────────────────────────────────
* Utilities
* ──────────────────────────────────────────────────────────────────────────────
*/

/**
 * Ensure all children of an element are wrapped in a slot.
 * Children not wrapped in a slot are appended to the default slot.
 */
function wrapChildrenWithinSlot(children: MarkdownNode[]): MarkdownNode[] {
  const isTemplateEl = (child: MarkdownNode): boolean =>
    isElement(child) && getTag(child as ElementNode) === 'template'

  const noneTemplateChildren = children.filter(child => !isTemplateEl(child))

  if (noneTemplateChildren.length) {
    let templates = children.filter(isTemplateEl)

    // Detect default slot by both comark format ({ name: 'default' }) and legacy MDC format ({ 'v-slot:default': '' })
    const defaultSlotIndex = templates.findIndex((child) => {
      const attrs = getAttrs(child as ElementNode) as Record<string, unknown>
      return attrs?.['v-slot:default'] !== undefined || attrs?.name === 'default'
    })

    if (defaultSlotIndex === -1) {
      const defaultSlot: ElementNode = ['template', { name: 'default' }, ...noneTemplateChildren]
      templates = [defaultSlot, ...templates]
    }
    else {
      const slot = templates[defaultSlotIndex] as ElementNode
      const [slotTag, slotAttrs, ...existingChildren] = slot
      templates[defaultSlotIndex] = [slotTag, slotAttrs, ...existingChildren, ...noneTemplateChildren] as ElementNode
    }

    return templates
  }

  return children
}

/**
 * Remove shiki style elements from MarkdownNode array (recursive)
 */
function removeStyleElements(nodes: MarkdownNode[]): MarkdownNode[] {
  return nodes
    .filter(node => !(isElement(node) && getTag(node as ElementNode) === 'style'))
    .map((node) => {
      if (!isElement(node)) return node
      const el = node as ElementNode
      const [tag, attrs, ...children] = el
      return [tag, attrs, ...removeStyleElements(children as MarkdownNode[])] as ElementNode
    })
}
