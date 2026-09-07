import { describe, it, expect } from 'vitest'
import {
  comarkTreeFromLegacyDocument,
  markdownRootFromComarkTree,
} from '../../src/runtime/utils/document/legacy'
import { renderMarkdown } from 'comark/render'
import type { MarkdownDocument } from 'comark'
import type { DatabaseItem } from 'nuxt-studio/app'
import type { MDCRoot } from '@nuxtjs/mdc'

function legacyDocument(body: MDCRoot): DatabaseItem {
  return {
    id: 'content:index.md',
    extension: 'md',
    stem: 'index',
    meta: {},
    body: body as unknown,
  } as DatabaseItem
}

describe('mdc → comark slot translation', () => {
  it('converts `v-slot:headline=""` into `{ name: "headline" }` on template nodes', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'u-page-hero',
        props: {},
        children: [{
          type: 'element',
          tag: 'template',
          props: { 'v-slot:headline': '' },
          children: [{ type: 'text', value: 'Hello' }],
        }],
      }],
    }))!

    const hero = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(hero[0]).toBe('u-page-hero')
    const slot = hero[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(slot[0]).toBe('template')
    expect(slot[1]).toEqual({ name: 'headline' })
    expect(slot[2]).toBe('Hello')
  })

  it('renders the translated slot as MDC `#slotname` (not `#undefined`)', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'u-page-hero',
        props: {},
        children: [{
          type: 'element',
          tag: 'template',
          props: { 'v-slot:title': '' },
          children: [{ type: 'text', value: 'Hello' }],
        }],
      }],
    }))!

    const md = await renderMarkdown(tree)
    expect(md).toContain('#title')
    expect(md).not.toContain('#undefined')
    expect(md).not.toContain('v-slot:')
  })

  it('treats an empty `v-slot:` key as the default slot', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'template',
        props: { 'v-slot:': '' },
        children: [{ type: 'text', value: 'body' }],
      }],
    }))!

    const slot = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(slot[1]).toEqual({ name: 'default' })
  })

  it('preserves other props alongside the v-slot directive', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'template',
        props: { 'v-slot:headline': '', 'unwrap': 'p' },
        children: [],
      }],
    }))!

    const slot = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(slot[1]).toEqual({ name: 'headline', unwrap: 'p' })
  })
})

describe('mdc → comark autoUnwrap compensation', () => {
  it('re-wraps a bare inline child sitting next to a template slot in <p>', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'code-preview',
        props: {},
        children: [
          {
            type: 'element',
            tag: 'code',
            props: {},
            children: [{ type: 'text', value: 'inline code' }],
          },
          {
            type: 'element',
            tag: 'template',
            props: { 'v-slot:code': '' },
            children: [{
              type: 'element',
              tag: 'pre',
              props: { language: 'mdc', code: '`inline code`\n' },
              children: [{
                type: 'element',
                tag: 'code',
                props: {},
                children: [{ type: 'text', value: '`inline code`\n' }],
              }],
            }],
          },
        ],
      }],
    }))!

    expect(tree.nodes).toMatchObject([
      ['code-preview', {},
        ['p', {}, ['code', {}, 'inline code']],
        ['template', { name: 'code' }, ['pre', { language: 'mdc' }, ['code', {}, '`inline code`']]],
      ],
    ])
  })

  it('renders the wrapped tree with a paragraph boundary before #code', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'code-preview',
        props: {},
        children: [
          {
            type: 'element',
            tag: 'code',
            props: {},
            children: [{ type: 'text', value: 'inline code' }],
          },
          {
            type: 'element',
            tag: 'template',
            props: { 'v-slot:code': '' },
            children: [{ type: 'text', value: 'slot body' }],
          },
        ],
      }],
    }))!

    const md = await renderMarkdown(tree)
    expect(md).toContain('`inline code`\n\n#code')
    expect(md).not.toContain('`inline code`#code')
  })

  it('leaves pure-inline children alone (single text/inline child, no wrap)', () => {
    // ::u-button{.x}\nMy button\n:: already works through the bridge — adding the
    // normalization must not regress this single-flow case.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'u-button',
        props: { className: ['any-class'] },
        children: [{ type: 'text', value: 'My button' }],
      }],
    }))!

    expect(tree.nodes).toMatchObject([
      ['u-button', { class: 'any-class' }, 'My button'],
    ])
  })

  it('leaves pure-block children alone (no spurious p insertion)', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'code-preview',
        props: {},
        children: [
          {
            type: 'element',
            tag: 'pre',
            props: { language: 'ts' },
            children: [{ type: 'text', value: 'const x = 1' }],
          },
          {
            type: 'element',
            tag: 'template',
            props: { 'v-slot:code': '' },
            children: [{ type: 'text', value: 'slot' }],
          },
        ],
      }],
    }))!

    expect(tree.nodes).toMatchObject([
      ['code-preview', {},
        ['pre', { language: 'ts' }, 'const x = 1'],
        ['template', { name: 'code' }, 'slot'],
      ],
    ])
  })
})

describe('mdc → comark closing-marker artifact repair', () => {
  it('drops the spurious paragraph and strips wrapping indent from <pre>', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'tabs-item',
        props: { label: 'Code' },
        children: [
          {
            type: 'element',
            tag: 'pre',
            props: {
              code: '  ::accordion\n    :::accordion-item{label="A"}\n    body\n    :::\n  ::\n',
              language: 'mdc',
            },
            children: [{
              type: 'element',
              tag: 'code',
              props: {},
              children: [{ type: 'text', value: '  ::accordion\n  ::\n' }],
            }],
          },
          {
            type: 'element',
            tag: 'p',
            props: {},
            children: [{ type: 'text', value: ':::\n::' }],
          },
        ],
      }],
    }))!

    const tabsItem = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    // Only one child remains (the pre), spurious p was dropped
    expect(tabsItem.length).toBe(3)
    const pre = tabsItem[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(pre[0]).toBe('pre')
    expect(pre[1].code).toBeUndefined()
    // Wrapping 2-space indent stripped from each line of code
    expect((pre[2] as [string, object, string])[2]).toBe('::accordion\n  :::accordion-item{label="A"}\n  body\n  :::\n::')
  })

  it('round-trips through render preserving the original indent', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'tabs',
        props: {},
        children: [{
          type: 'element',
          tag: 'tabs-item',
          props: { label: 'Code' },
          children: [
            {
              type: 'element',
              tag: 'pre',
              props: {
                code: '  ::accordion\n  ::\n',
                language: 'mdc',
              },
              children: [],
            },
            {
              type: 'element',
              tag: 'p',
              props: {},
              children: [{ type: 'text', value: ':::\n::' }],
            },
          ],
        }],
      }],
    }))!

    const md = await renderMarkdown(tree)
    // The rendered output should not contain the spurious markers
    expect(md).not.toMatch(/```[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*:::[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*::[\t\v\f\r \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*:::/)
    // Code content should be wrapped exactly once (2 spaces from tabs-item),
    // not doubled (would be 4 spaces)
    expect(md).toContain('  ::accordion')
    expect(md).not.toContain('    ::accordion')
  })

  it('leaves a <p> alone if it contains non-marker text', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'tabs-item',
        props: { label: 'Code' },
        children: [
          {
            type: 'element',
            tag: 'pre',
            props: { code: '  foo\n', language: 'ts' },
            children: [],
          },
          {
            type: 'element',
            tag: 'p',
            props: {},
            children: [{ type: 'text', value: 'This is real content.' }],
          },
        ],
      }],
    }))!

    const tabsItem = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    // Both children preserved (the p is real content, not a marker artifact)
    expect(tabsItem.length).toBe(4)
    // And since no artifact was detected, the code content is left as-is
    const pre = tabsItem[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(pre[1].code).toBeUndefined()
    expect((pre[2] as [string, object, string])[2]).toBe('  foo')
  })

  it('matches multi-line closing markers (`:::` followed by `::`)', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'outer',
        props: {},
        children: [
          {
            type: 'element',
            tag: 'pre',
            props: { code: '  body\n', language: 'mdc' },
            children: [],
          },
          {
            type: 'element',
            tag: 'p',
            props: {},
            children: [{ type: 'text', value: ':::\n::' }],
          },
        ],
      }],
    }))!

    const outer = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(outer.length).toBe(3) // only pre remains
    const pre = outer[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(pre[1].code).toBeUndefined()
    expect((pre[2] as [string, object, string])[2]).toBe('body')
  })

  // A `<p>` at the document root level whose text happens to be just `:::`/`::`
  // markers is NOT a parser artifact — it's literal content (e.g. the rendered
  // text of a previously-stripped artifact written back to disk by an earlier
  // round-trip, or the user genuinely writing `:::` as text). Removing it would
  // silently diverge the bridge render from what's on disk, breaking the
  // `localContent === remoteContent` fallback in `checkConflict`.
  it('preserves colon-only <p> at document root (no false positive)', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [{ type: 'text', value: 'Some real content.' }],
        },
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [{ type: 'text', value: ':::\n::' }],
        },
        {
          type: 'element',
          tag: 'h3',
          props: { id: 'next' },
          children: [{ type: 'text', value: 'Next section' }],
        },
      ],
    }))!

    // All three top-level paragraphs/headings preserved.
    expect(tree.nodes).toMatchObject([
      ['p', {}, 'Some real content.'],
      ['p', {}, ':::\n::'],
      ['h3', { id: 'next' }, 'Next section'],
    ])
  })

  // When the @nuxtjs/mdc parser fails to close a deeply-nested container, it
  // not only injects the spurious `<p>` — it captures EVERY subsequent
  // top-level sibling as a child of the broken container. The artifact's text
  // (`:::\n::`) tells us how many ancestor containers should also close. The
  // bridge promotes the captured siblings back up through that many levels.
  it('promotes captured siblings out of the broken container (single-level close)', () => {
    // artifact says only THIS container closes — leak stays at parent's level.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'tabs',
        props: {},
        children: [{
          type: 'element',
          tag: 'tabs-item',
          props: { label: 'Code' },
          children: [
            {
              type: 'element',
              tag: 'pre',
              props: { code: '  body\n', language: 'mdc' },
              children: [],
            },
            {
              type: 'element',
              tag: 'p',
              props: {},
              children: [{ type: 'text', value: ':::' }], // ONLY one close
            },
            {
              type: 'element',
              tag: 'h3',
              props: { id: 'leaked' },
              children: [{ type: 'text', value: 'Should escape one level' }],
            },
          ],
        }],
      }],
    }))!

    // Expected: tabs > [tabs-item with [pre], h3] — h3 is now a sibling of tabs-item
    expect(tree.nodes).toMatchObject([
      ['tabs', {},
        ['tabs-item', { label: 'Code' }, ['pre', { language: 'mdc' }, ['code', { __ignoreMap: '' }, 'body']]],
        ['h3', { id: 'leaked' }, 'Should escape one level'],
      ],
    ])
  })

  it('promotes captured siblings out across two ancestor containers (`:::\\n::`)', () => {
    // artifact says THIS container AND parent close — leak escapes to grandparent's level.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'tabs',
        props: {},
        children: [{
          type: 'element',
          tag: 'tabs-item',
          props: { label: 'Code' },
          children: [
            {
              type: 'element',
              tag: 'pre',
              props: { code: '  body\n', language: 'mdc' },
              children: [],
            },
            {
              type: 'element',
              tag: 'p',
              props: {},
              children: [{ type: 'text', value: ':::\n::' }], // TWO closes
            },
            {
              type: 'element',
              tag: 'h3',
              props: { id: 'leaked' },
              children: [{ type: 'text', value: 'Should escape two levels' }],
            },
            {
              type: 'element',
              tag: 'p',
              props: {},
              children: [{ type: 'text', value: 'Body text' }],
            },
          ],
        }],
      }],
    }))!

    // Expected: tabs only contains tabs-item with [pre]. h3 + p are siblings of tabs.
    expect(tree.nodes).toMatchObject([
      ['tabs', {},
        ['tabs-item', { label: 'Code' }, ['pre', { language: 'mdc' }, ['code', { __ignoreMap: '' }, 'body']]],
      ],
      ['h3', { id: 'leaked' }, 'Should escape two levels'],
      ['p', {}, 'Body text'],
    ])
  })
})

describe('mdc → comark className translation', () => {
  it('joins `className: string[]` into `class: "a b"`', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'span',
        props: { className: ['text-primary', 'font-bold'] },
        children: [{ type: 'text', value: 'Nuxt' }],
      }],
    }))!

    const span = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(span[1]).toEqual({ class: 'text-primary font-bold' })
  })

  it('drops an empty className array', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'div',
        props: { className: [] },
        children: [],
      }],
    }))!

    const div = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(div[1]).toEqual({})
  })

  it('renders className as `.foo.bar` (not JSON-stringified)', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'span',
        props: { className: ['text-primary'] },
        children: [{ type: 'text', value: 'Nuxt' }],
      }],
    }))!

    const md = await renderMarkdown(tree)
    expect(md).not.toContain('[\\"text-primary\\"]')
    expect(md).not.toContain('className')
  })
})

describe('mdc → comark attribute ordering', () => {
  // Preserves the upstream attribute order
  it('preserves the input attribute order on a single element', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'u-button',
        props: {
          'to': '/intro',
          'variant': 'outline',
          'size': 'sm',
          'target': '_blank',
          'trailing-icon': 'i-lucide-arrow-right',
        },
        children: [],
      }],
    }))!

    const button = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(Object.keys(button[1])).toEqual([
      'to',
      'variant',
      'size',
      'target',
      'trailing-icon',
    ])
  })

  it('preserves attribute order on nested elements', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'outer',
        props: { z: '1', a: '2' },
        children: [{
          type: 'element',
          tag: 'inner',
          props: { y: '3', b: '4' },
          children: [],
        }],
      }],
    }))!

    const outer = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(Object.keys(outer[1])).toEqual(['z', 'a'])
    const inner = outer[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(Object.keys(inner[1])).toEqual(['y', 'b'])
  })

  it('hoists slot `name` to the front when translating `v-slot:name`', () => {
    // `v-slot:title` → `{ name: 'title' }` lands first
    // Any sibling attrs that were already present keep their relative order behind it.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'template',
        props: { 'unwrap': 'p', 'v-slot:title': '' },
        children: [],
      }],
    }))!

    const slot = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(Object.keys(slot[1])).toEqual(['name', 'unwrap'])
  })
})

describe('mdc → comark generic array → string normalization', () => {
  it('joins arbitrary token-list arrays into space-joined strings', () => {
    // Beyond className, any other array-valued attr coming out of @nuxtjs/mdc
    // (e.g. `ping`) should collapse to a space-joined string so the bridged
    // body matches the shape comark's parser produces from raw markdown.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'card',
        props: { ping: ['a', 'b'] },
        children: [],
      }],
    }))!

    const card = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(card[1]).toEqual({ ping: 'a b' })
  })

  it('leaves arrays of non-primitives untouched', () => {
    // We only collapse arrays of primitives — anything else is unexpected in
    // MDC content but shouldn't be silently mutated.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'card',
        props: { items: [{ x: 1 }] },
        children: [],
      }],
    }))!

    const card = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(card[1]).toEqual({ items: [{ x: 1 }] })
  })

  it('keeps a primitive array unwrapped from a ":" binding as an array (does not collapse to a string)', async () => {
    // Unlike a token-list array (className, ping), a ':'-bound array is genuine
    // data — it must stay an array so comark renders a YAML block, not `tags="a b"`.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'card',
        props: { ':tags': '["a","b"]' },
        children: [],
      }],
    }))!

    const card = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(card[1]).toEqual({ tags: ['a', 'b'] })

    const markdown = await renderMarkdown(tree, { blockAttributesStyle: 'frontmatter' })
    expect(markdown).toContain('tags:')
    expect(markdown).toContain('- a')
    expect(markdown).toContain('- b')
    expect(markdown).not.toContain('tags="a b"')
  })
})

describe('mdc → comark `rel` stripping', () => {
  it('drops `rel` from any element, regardless of tag', () => {
    // @nuxt/content's rehype-external-links plugin injects `rel: ['nofollow']`
    // on external links at SQLite-build time. That's not user-authored, so we
    // strip it at the bridge so it never reaches the editor or comparison.
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'p',
        props: {},
        children: [{
          type: 'element',
          tag: 'a',
          props: { href: 'https://nuxt.com', rel: ['nofollow'] },
          children: [{ type: 'text', value: 'Nuxt' }],
        }],
      }],
    }))!

    const p = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    const a = p[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(a[1]).toEqual({ href: 'https://nuxt.com' })
    expect(a[1]).not.toHaveProperty('rel')
  })

  it('drops `rel` even when it is a plain string', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'a',
        props: { href: 'https://nuxt.com', rel: 'nofollow' },
        children: [{ type: 'text', value: 'Nuxt' }],
      }],
    }))!

    const a = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(a[1]).not.toHaveProperty('rel')
  })

  it('leaves other auto-adjacent attrs alone (e.g. `target`)', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'a',
        props: { href: 'https://nuxt.com', target: '_blank' },
        children: [{ type: 'text', value: 'Nuxt' }],
      }],
    }))!

    const a = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(a[1]).toEqual({ href: 'https://nuxt.com', target: '_blank' })
  })
})

describe('roundtrip: legacy MDC → MarkdownDocument → legacy MDC', () => {
  it('round-trips a template slot back into `v-slot:name=""` shape', () => {
    const original: MDCRoot = {
      type: 'root',
      children: [{
        type: 'element',
        tag: 'u-page-hero',
        props: {},
        children: [{
          type: 'element',
          tag: 'template',
          props: { 'v-slot:title': '' },
          children: [{ type: 'text', value: 'Hello' }],
        }],
      }],
    }

    const tree = comarkTreeFromLegacyDocument(legacyDocument(original))!
    const back = markdownRootFromComarkTree(tree)

    // markdownRootFromComarkTree returns a compressed minimark tree, but the
    // important invariant is that re-converting it produces the original shape.
    const rebuilt = comarkTreeFromLegacyDocument(legacyDocument(back as unknown as MDCRoot))!
    const hero = rebuilt.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    const slot = hero[2] as [string, Record<string, unknown>, ...unknown[]]
    expect(slot[0]).toBe('template')
    expect(slot[1]).toEqual({ name: 'title' })
  })

  it('round-trips className arrays without loss', () => {
    const original: MDCRoot = {
      type: 'root',
      children: [{
        type: 'element',
        tag: 'span',
        props: { className: ['text-primary', 'font-bold'] },
        children: [{ type: 'text', value: 'Nuxt' }],
      }],
    }

    const tree = comarkTreeFromLegacyDocument(legacyDocument(original))!
    const back = markdownRootFromComarkTree(tree)
    const rebuilt = comarkTreeFromLegacyDocument(legacyDocument(back as unknown as MDCRoot))!
    const span = rebuilt.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(span[1]).toEqual({ class: 'text-primary font-bold' })
  })
})

describe('comark → mdc reverse helpers (used at DB write boundary)', () => {
  it('writes back a `template` slot as `v-slot:name=""`', () => {
    const tree: MarkdownDocument = {
      nodes: [['template', { name: 'title' }, 'Hello']],
      frontmatter: {},
      meta: {},
    }

    const root = markdownRootFromComarkTree(tree) as unknown as MDCRoot
    // markdownRootFromComarkTree compresses via @nuxt/content; reverse it to inspect.
    const reloaded = comarkTreeFromLegacyDocument(legacyDocument(root))!
    const slot = reloaded.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(slot[0]).toBe('template')
    expect(slot[1]).toEqual({ name: 'title' })
  })

  it('unwraps @nuxtjs/mdc binding-syntax props (:key + JSON string) to real JS values', () => {
    // @nuxtjs/mdc serialises array-of-objects YAML block props as:
    //   { ":authorsOne": "[{\"name\":\"John\"}]" }
    // propsMDCToComark must unwrap these back to { authorsOne: [{name:'John'}] }
    const mdcBody: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'authors',
          props: {
            ':authorsOne': '[{"name":"John Doe","role":"contributor"}]',
            ':authorsTwo': '[{"name":"Jane Doe","role":"maintainer"}]',
          },
          children: [],
        } as unknown,
      ],
    } as MDCRoot

    const tree = comarkTreeFromLegacyDocument(legacyDocument(mdcBody))!
    const [, attrs] = tree.nodes[0] as [string, Record<string, unknown>]

    expect(attrs.authorsOne).toEqual([{ name: 'John Doe', role: 'contributor' }])
    expect(attrs.authorsTwo).toEqual([{ name: 'Jane Doe', role: 'maintainer' }])
    expect(':authorsOne' in attrs).toBe(false)
    expect(':authorsTwo' in attrs).toBe(false)
  })

  it('round-trips array-of-objects props through the legacy bridge and renders YAML block', async () => {
    const mdcBody: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'authors',
          props: {
            ':authorsOne': '[{"name":"John Doe","role":"contributor"}]',
          },
          children: [],
        } as unknown,
      ],
    } as MDCRoot

    const tree = comarkTreeFromLegacyDocument(legacyDocument(mdcBody))!
    const markdown = await renderMarkdown(tree, { blockAttributesStyle: 'frontmatter' })

    // Must use YAML block format, not inline JSON binding syntax
    expect(markdown).toContain('authorsOne:')
    expect(markdown).toContain('- name: John Doe')
    expect(markdown).not.toContain(':authorsOne=')
    expect(markdown).not.toContain('[object Object]')
  })

  it('preserves boolean binding props (:key: "true"/"false") without stripping the colon prefix', async () => {
    const mdcBody: MDCRoot = {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'u-page-section',
          props: {
            'orientation': 'horizontal',
            ':reverse': 'true',
            ':square': 'false',
          },
          children: [],
        } as unknown,
      ],
    } as MDCRoot

    const tree = comarkTreeFromLegacyDocument(legacyDocument(mdcBody))!
    const [, attrs] = tree.nodes[0] as [string, Record<string, unknown>]

    expect(attrs[':reverse']).toBe('true')
    expect(attrs[':square']).toBe('false')
    expect('reverse' in attrs).toBe(false)
    expect('square' in attrs).toBe(false)

    const markdown = await renderMarkdown(tree)
    expect(markdown).toContain('reverse')
    expect(markdown).not.toContain('reverse="true"')
    expect(markdown).toContain(':square="false"')
  })

  it('writes back `class` strings as `className` arrays', () => {
    const tree: MarkdownDocument = {
      nodes: [['span', { class: 'text-primary font-bold' }, 'Nuxt']],
      frontmatter: {},
      meta: {},
    }

    const root = markdownRootFromComarkTree(tree) as unknown as MDCRoot
    const reloaded = comarkTreeFromLegacyDocument(legacyDocument(root))!
    const span = reloaded.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    // After full roundtrip back through MDC compression and our forward
    // translation, the span should expose the comark-shape (`class` string).
    expect(span[1]).toEqual({ class: 'text-primary font-bold' })
  })
})

describe('mdc → comark code block', () => {
  it('drops the `code` attr so a fenced block renders as a plain fence, not a `::pre{code}` wrapper', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'pre',
        props: { code: 'npx docus init docs\n', language: 'bash', filename: 'Terminal' },
        children: [{
          type: 'element',
          tag: 'code',
          props: { className: ['language-bash'] },
          children: [{ type: 'text', value: 'npx docus init docs\n' }],
        }],
      }],
    }))!

    const pre = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect(pre[1].code).toBeUndefined()
    expect((pre[2] as [string, object, string])[2]).toBe('npx docus init docs')

    const markdown = await renderMarkdown(tree)
    expect(markdown).not.toContain('::pre')
    expect(markdown).toContain('```bash [Terminal]\nnpx docus init docs\n```')
  })

  it('strips the single trailing newline mdc adds to `code`, matching comark canonical form', () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'pre',
        props: { code: 'const a = 1\nconsole.log(a)\n', language: 'js' },
        children: [{
          type: 'element',
          tag: 'code',
          props: { className: ['language-js'] },
          children: [{ type: 'text', value: 'const a = 1\nconsole.log(a)\n' }],
        }],
      }],
    }))!

    const pre = tree.nodes[0] as [string, Record<string, unknown>, ...unknown[]]
    expect((pre[2] as [string, object, string])[2]).toBe('const a = 1\nconsole.log(a)')
  })

  it('renders a stored `language: text` artifact as an explicit ```text fence', async () => {
    const tree = comarkTreeFromLegacyDocument(legacyDocument({
      type: 'root',
      children: [{
        type: 'element',
        tag: 'pre',
        props: { code: 'assets/\n  icons/\n    my-logo.svg\n', language: 'text' },
        children: [],
      }],
    }))!

    const markdown = await renderMarkdown(tree)
    expect(markdown).toContain('```text\nassets/\n  icons/\n    my-logo.svg\n```')
  })
})
