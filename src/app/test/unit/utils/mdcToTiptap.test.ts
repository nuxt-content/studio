import { test, describe, expect } from 'vitest'
import { createMark } from '../../../src/utils/tiptap/mdcToTiptap'
import type { MDCElement } from '@nuxtjs/mdc'

describe('marks', () => {
  test('createMark: create `italic` mark nodes', () => {
    const mark = 'italic'
    const node: MDCElement = {
      type: 'element',
      tag: 'em',
      props: {},
      children: [
        {
          type: 'text',
          value: 'this is a test in italic',
        },
      ],
    }

    expect(createMark(node, mark)).toEqual([{
      type: 'text',
      text: 'this is a test in italic',
      marks: [{ type: 'italic', attrs: {} }],
    }])
  })

  test('createMark: create multiple mark (italic and bold) nodes', () => {
    const mark = 'italic'
    const node: MDCElement = {
      type: 'element',
      tag: 'em',
      props: {},
      children: [
        {
          type: 'element',
          tag: 'strong',
          props: {},
          children: [
            {
              type: 'text',
              value: 'this is a test in italic and bold',
            },
          ],
        },
      ],
    }

    expect(createMark(node, mark)).toStrictEqual([{
      type: 'text',
      text: 'this is a test in italic and bold',
      marks: [
        {
          type: 'bold',
          attrs: {},
        },
        {
          type: 'italic',
          attrs: {},
        },
      ],
    }])
  })

  test('createMark: create `code` mark nodes should not handle shiki elements', () => {
    const mark = 'code'
    const node: MDCElement = {
      type: 'element',
      tag: 'code',
      props: {},
      children: [
        {
          type: 'element',
          tag: 'span',
          props: {
            class: 'line',
            line: 1,
          },
          children: [
            {
              type: 'element',
              tag: 'span',
              props: {
                style: '--shiki-default:#C678DD',
              },
              children: [
                {
                  type: 'text',
                  value: 'const',
                },
              ],
            },
            {
              type: 'element',
              tag: 'span',
              props: {
                style: '--shiki-default:#E5C07B',
              },
              children: [
                {
                  type: 'text',
                  value: ' code',
                },
              ],
            },
            {
              type: 'element',
              tag: 'span',
              props: {
                style: '--shiki-default:#56B6C2',
              },
              children: [
                {
                  type: 'text',
                  value: ' =',
                },
              ],
            },
            {
              type: 'element',
              tag: 'span',
              props: {
                style: '--shiki-default:#98C379',
              },
              children: [
                {
                  type: 'text',
                  value: ' \'test\'',
                },
              ],
            },
          ],
        },
      ],
    }

    expect(createMark(node, mark)).toStrictEqual([{
      type: 'text',
      text: 'const code = \'test\'',
      marks: [
        {
          type: 'code',
          attrs: {},
        },
      ],
    }])
  })

  // test('createMark: create mark nodes (italic, bold...) should handle handle inline component', () => {
  //   const mark = 'italic'
  //   const node: MDCElement = {
  //     type: 'element',
  //     tag: 'em',
  //     props: {},
  //     children: [
  //       {
  //         type: 'text',
  //         value: 'start ',
  //       },
  //       {
  //         type: 'element',
  //         tag: 'shortcut',
  //         props: { __mdc_inline: 'true', value: 'CTRL+K' },
  //         children: [] as never,
  //       },
  //       {
  //         type: 'text',
  //         value: ' end',
  //       },
  //     ],
  //   }

  //   expect(createMark(node, mark)).toStrictEqual([
  //     {
  //       type: 'text',
  //       text: 'start ',
  //       marks: [
  //         {
  //           type: 'italic',
  //           attrs: {},
  //         },
  //       ],
  //     },
  //     {
  //       type: 'inline-element',
  //       attrs: {
  //         tag: 'shortcut',
  //         props: {
  //           value: 'CTRL+K',
  //         },
  //       },
  //       content: [],
  //     },
  //     {
  //       type: 'text',
  //       text: ' end',
  //       marks: [
  //         {
  //           type: 'italic',
  //           attrs: {},
  //         },
  //       ],
  //     },
  //   ])
  // })
})
