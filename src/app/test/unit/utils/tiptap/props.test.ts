import { expect, test, describe } from 'vitest'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { JSType } from 'untyped'
import type { PropertyMeta } from 'vue-component-meta'
import { buildFormTreeFromProps, convertStringToArray, convertStringToValue } from '../../../../src/utils/tiptap/props'
import { buttonPropsSchema, iconPropsSchema } from '../../../mocks/props'
import type { ComponentMeta } from '../../../../src/types/component'

describe('props', () => {
  describe('convertStringToArray', () => {
    test('should convert string to array', () => {
      // eslint-disable-next-line no-useless-escape
      expect(convertStringToArray('\"horizontal\" | \"vertical\" | undefined')).toEqual(['horizontal', 'vertical'])
    })
  })

  describe('convertStringToValue', () => {
    test('should convert multiple types of strings to value', () => {
      // String type tests
      expect(convertStringToValue('\'vertical\'', 'string')).toEqual('vertical')
      expect(convertStringToValue('"horizontal"', 'string')).toEqual('horizontal')
      expect(convertStringToValue('plain text', 'string')).toEqual('plain text')
      expect(convertStringToValue('', 'string')).toEqual('')

      // Boolean type tests
      expect(convertStringToValue('true', 'boolean')).toEqual(true)
      expect(convertStringToValue('false', 'boolean')).toEqual(false)
      expect(convertStringToValue('invalid', 'boolean')).toEqual(false)
      expect(convertStringToValue('', 'boolean')).toEqual(false)

      // Number type tests
      expect(convertStringToValue('100', 'number')).toEqual(100)
      expect(convertStringToValue('-50', 'number')).toEqual(-50)
      expect(convertStringToValue('0', 'number')).toEqual(0)
      expect(convertStringToValue('invalid', 'number')).toEqual(null)
      expect(convertStringToValue('', 'number')).toEqual(null)

      // Object type tests
      expect(convertStringToValue('{"key": "value"}', 'object')).toEqual({ key: 'value' })
      expect(convertStringToValue('{"number": 42, "boolean": true}', 'object')).toEqual({ number: 42, boolean: true })
      expect(convertStringToValue('{"array": [1, 2, 3]}', 'object')).toEqual({ array: [1, 2, 3] })
      expect(convertStringToValue('invalid json', 'object')).toEqual({})
      expect(convertStringToValue('', 'object')).toEqual({})

      // Default case (unknown type)
      expect(convertStringToValue('any value', 'array' as JSType)).toEqual([])
    })
  })

  describe('buildFormTreeFromProps', () => {
    const createComponentMeta = (props: PropertyMeta[], options: { nuxtUI?: boolean } = {}): ComponentMeta => ({
      name: 'TestComponent',
      path: '/path/to/component',
      nuxtUI: options.nuxtUI ?? false,
      meta: {
        props,
        slots: [],
        events: [],
      },
    })

    test('generate JSType props from meta', () => {
      const props: PropertyMeta[] = [
        {
          name: 'as',
          global: false,
          description: 'The element or component this component should render as.',
          tags: [
            {
              name: 'defaultValue',
              text: '\'div\'',
            },
          ],
          required: false,
          type: 'any',
          schema: 'any',
          declarations: [],
        },
        {
          name: 'name',
          global: false,
          description: '',
          tags: [],
          required: false,
          type: 'string | undefined',
          schema: {
            kind: 'enum',
            type: 'string | undefined',
            schema: ['undefined', 'string'],
          },
          declarations: [],
        },
        {
          name: 'orientation',
          global: false,
          description: 'The orientation of the page hero.',
          tags: [
            {
              name: 'defaultValue',
              text: '\'vertical\'',
            },
          ],
          required: false,
          type: '"horizontal" | "vertical" | undefined',
          schema: {
            kind: 'enum',
            type: '"horizontal" | "vertical" | undefined',
            schema: ['undefined', 'horizontal', 'vertical'],
          },
          default: '"vertical"',
          declarations: [],
        },
        {
          name: 'reverse',
          global: false,
          description: 'Reverse the order of the default slot.',
          tags: [
            {
              name: 'defaultValue',
              text: 'false',
            },
          ],
          required: false,
          type: 'boolean | undefined',
          schema: {
            kind: 'enum',
            type: 'boolean | undefined',
            schema: ['undefined', 'true', 'false'],
          },
          declarations: [],
        },
        {
          name: 'ui',
          global: false,
          description: '',
          tags: [],
          required: false,
          type: 'Partial<{ root: string; container: string; wrapper: string; headline: string; title: string; description: string; links: string; }> | undefined',
          schema: {
            kind: 'enum',
            type: 'Partial<{ root: string; container: string; wrapper: string; headline: string; title: string; description: string; links: string; }> | undefined',
            schema: ['undefined', 'Partial<{ root: string; container: string; wrapper: string; headline: string; title: string; description: string; links: string; }>'],
          },
          declarations: [],
        },
        {
          name: 'to',
          global: false,
          description: 'Route Location the link should navigate to when clicked on.',
          tags: [],
          required: false,
          type: 'string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric | undefined',
          schema: {
            kind: 'enum',
            type: 'string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric | undefined',
            schema: [
              'undefined',
              'string',
              {
                kind: 'object',
                type: 'RouteLocationAsRelativeGeneric',
                schema: {
                  name: {
                    name: 'name',
                    global: false,
                    description: '',
                    tags: [],
                    required: false,
                    type: 'RouteRecordNameGeneric',
                    schema: {
                      kind: 'enum',
                      type: 'RouteRecordNameGeneric',
                      schema: ['undefined', 'string', 'symbol'],
                    },
                    declarations: [],
                  },
                },
              },
            ],
          },
          declarations: [],
        },
        {
          name: 'target',
          global: false,
          description: 'Where to display the linked URL, as the name for a browsing context.',
          tags: [],
          required: false,
          type: '"_blank" | "_parent" | "_self" | "_top" | (string & {}) | null | undefined',
          schema: {
            kind: 'enum',
            type: '"_blank" | "_parent" | "_self" | "_top" | (string & {}) | null | undefined',
            schema: [
              'undefined',
              'null',
              '"_blank"',
              '"_parent"',
              '"_self"',
              '"_top"',
              {
                kind: 'object',
                type: 'string & {}',
                schema: {},
              },
            ],
          },
          declarations: [],
        },
      ]

      // Without Overriding
      const emptyNode = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UPageHero',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(emptyNode, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        'as': {
          id: '#u_pagehero/as',
          key: 'as',
          title: 'As',
          value: 'div',
          custom: false,
          type: 'string',
          default: 'div',
          hidden: true,
        },
        'name': {
          id: '#u_pagehero/name',
          key: 'name',
          title: 'Name',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        'orientation': {
          id: '#u_pagehero/orientation',
          key: 'orientation',
          title: 'Orientation',
          value: 'vertical',
          custom: false,
          type: 'string',
          default: 'vertical',
          options: ['horizontal', 'vertical'],
        },
        ':reverse': {
          id: '#u_pagehero/:reverse',
          key: ':reverse',
          title: 'Reverse',
          value: false,
          custom: false,
          type: 'boolean',
          default: false,
        },
        ':ui': {
          id: '#u_pagehero/:ui',
          key: ':ui',
          title: 'Ui',
          value: {},
          default: {},
          custom: false,
          type: 'object',
          hidden: true,
        },
        'to': {
          id: '#u_pagehero/to',
          key: 'to',
          title: 'To',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        'target': {
          id: '#u_pagehero/target',
          key: 'target',
          title: 'Target',
          value: '',
          custom: false,
          type: 'string',
          default: '',
          options: ['_blank', '_parent', '_self', '_top'],
        },
      })

      // With Overriding
      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UPageHero',
          props: {
            'as': 'h1',
            'name': 'Hello World',
            'orientation': 'horizontal',
            ':reverse': true,
            'ui': {
              root: 'bg-white',
              container: 'max-w-7xl',
            },
            'target': '_blank',
          },
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        'as': {
          id: '#u_pagehero/as',
          key: 'as',
          title: 'As',
          value: 'h1',
          custom: false,
          type: 'string',
          default: 'div',
          hidden: true,
        },
        'name': {
          id: '#u_pagehero/name',
          key: 'name',
          title: 'Name',
          value: 'Hello World',
          custom: false,
          type: 'string',
          default: '',
        },
        'orientation': {
          id: '#u_pagehero/orientation',
          key: 'orientation',
          title: 'Orientation',
          value: 'horizontal',
          custom: false,
          type: 'string',
          default: 'vertical',
          options: ['horizontal', 'vertical'],
        },
        ':reverse': {
          id: '#u_pagehero/:reverse',
          key: ':reverse',
          title: 'Reverse',
          value: true,
          custom: false,
          type: 'boolean',
          default: false,
        },
        ':ui': {
          id: '#u_pagehero/:ui',
          key: ':ui',
          title: 'Ui',
          value: {
            root: 'bg-white',
            container: 'max-w-7xl',
          },
          default: {},
          custom: false,
          type: 'object',
          hidden: true,
        },
        'to': {
          id: '#u_pagehero/to',
          key: 'to',
          title: 'To',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        'target': {
          id: '#u_pagehero/target',
          key: 'target',
          title: 'Target',
          value: '_blank',
          custom: false,
          type: 'string',
          default: '',
          options: ['_blank', '_parent', '_self', '_top'],
        },
      })
    })

    test('generate UButton props from meta', () => {
      const props: PropertyMeta[] = [
        buttonPropsSchema.label,
        buttonPropsSchema.color,
        buttonPropsSchema.block,
        buttonPropsSchema.activeClass,
      ]

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UButton',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        'label': {
          id: '#u_button/label',
          key: 'label',
          title: 'Label',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        'color': {
          id: '#u_button/color',
          key: 'color',
          title: 'Color',
          value: 'primary',
          custom: false,
          type: 'string',
          default: 'primary',
          options: ['error', 'primary', 'secondary', 'success', 'info', 'warning', 'neutral'],
        },
        ':block': {
          id: '#u_button/:block',
          key: ':block',
          title: 'Block',
          value: false,
          custom: false,
          type: 'boolean',
          default: false,
        },
        'activeClass': {
          id: '#u_button/activeClass',
          key: 'activeClass',
          title: 'ActiveClass',
          value: '',
          custom: false,
          type: 'string',
          default: '',
          hidden: true,
        },
      })
    })

    test('generate UIcon props from meta', () => {
      const props: PropertyMeta[] = [
        iconPropsSchema.name,
        iconPropsSchema.mode,
        iconPropsSchema.size,
        iconPropsSchema.customize,
      ]

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UIcon',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        name: {
          id: '#u_icon/name',
          key: 'name',
          title: 'Name',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        mode: {
          id: '#u_icon/mode',
          key: 'mode',
          title: 'Mode',
          value: '',
          custom: false,
          type: 'string',
          default: '',
          options: ['svg', 'css'],
        },
        size: {
          id: '#u_icon/size',
          key: 'size',
          title: 'Size',
          value: '',
          custom: false,
          type: 'string',
          default: '',
        },
        customize: {
          id: '#u_icon/customize',
          key: 'customize',
          title: 'Customize',
          value: '',
          default: '',
          custom: false,
          type: 'string',
          hidden: true,
        },
      })
    })

    test('generate object props from meta', () => {
      const props = [
        {
          name: 'avatar',
          global: false,
          description: 'Display an avatar on the left side.',
          tags: [],
          required: false,
          type: 'AvatarProps | undefined',
          schema: {
            kind: 'enum',
            type: 'AvatarProps | undefined',
            schema: [
              'undefined',
              {
                kind: 'object',
                type: 'AvatarProps',
                schema: {
                  src: {
                    name: 'src',
                    global: false,
                    description: '',
                    tags: [],
                    required: false,
                    type: 'string | undefined',
                    schema: {
                      kind: 'enum',
                      type: 'string | undefined',
                      schema: ['undefined', 'string'],
                    },
                  },
                  icon: {
                    name: 'icon',
                    global: false,
                    description: '',
                    tags: [
                      {
                        name: 'IconifyIcon',
                      },
                    ],
                    required: false,
                    type: 'string | undefined',
                    schema: 'string | undefined',
                  },
                  ui: {
                    name: 'ui',
                    global: false,
                    description: '',
                    tags: [],
                    required: false,
                    type: 'Partial<{ root: string; image: string; fallback: string; icon: string; }> | undefined',
                    schema: {
                      kind: 'enum',
                      type: 'Partial<{ root: string; image: string; fallback: string; icon: string; }> | undefined',
                      schema: ['undefined', 'Partial<{ root: string; image: string; fallback: string; icon: string; }>'],
                    },
                  },
                },
              },
            ],
          },
        },
        {
          name: 'avatar2',
          global: false,
          description: 'Display an avatar on the left side.',
          tags: [],
          required: false,
          type: 'AvatarProps',
          schema: {
            kind: 'object',
            type: 'AvatarProps',
            schema: {
              src: {
                name: 'src',
                global: false,
                description: '',
                tags: [],
                required: false,
                type: 'string | undefined',
                schema: {
                  kind: 'enum',
                  type: 'string | undefined',
                  schema: ['undefined', 'string'],
                },
              },
              icon: {
                name: 'icon',
                global: false,
                description: '',
                tags: [
                  {
                    name: 'IconifyIcon',
                  },
                ],
                required: false,
                type: 'string | undefined',
                schema: 'string | undefined',
              },
            },
          },
        },
      ] as unknown as PropertyMeta[]

      // Without Overriding
      const emptyNode = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UPageHero',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(emptyNode, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        ':avatar': {
          id: '#u_pagehero/:avatar',
          key: ':avatar',
          type: 'object',
          title: 'Avatar',
          custom: false,
          value: {},
          default: {},
          children: {
            src: {
              id: '#u_pagehero/:avatar/src',
              key: 'src',
              title: 'Src',
              type: 'string',
              value: '',
              default: '',
              custom: false,
            },
            icon: {
              id: '#u_pagehero/:avatar/icon',
              key: 'icon',
              title: 'Icon',
              type: 'icon',
              value: '',
              default: '',
              custom: false,
            },
            ui: {
              id: '#u_pagehero/:avatar/ui',
              key: 'ui',
              title: 'Ui',
              value: '',
              default: '',
              custom: false,
              type: 'string',
              hidden: true,
            },
          },
        },
        ':avatar2': {
          id: '#u_pagehero/:avatar2',
          key: ':avatar2',
          type: 'object',
          title: 'Avatar2',
          custom: false,
          value: {},
          default: {},
          children: {
            src: {
              id: '#u_pagehero/:avatar2/src',
              key: 'src',
              title: 'Src',
              type: 'string',
              value: '',
              default: '',
              custom: false,
            },
            icon: {
              id: '#u_pagehero/:avatar2/icon',
              key: 'icon',
              title: 'Icon',
              type: 'icon',
              value: '',
              default: '',
              custom: false,
            },
          },
        },
      })

      // With Overriding
      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UPageHero',
          props: {
            avatar: {
              src: 'https://example.com/avatar.png',
              icon: 'i-ph-user',
            },
          },
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        ':avatar': {
          id: '#u_pagehero/:avatar',
          key: ':avatar',
          type: 'object',
          title: 'Avatar',
          custom: false,
          value: {
            src: 'https://example.com/avatar.png',
            icon: 'i-ph-user',
          },
          default: {},
          children: {
            src: {
              id: '#u_pagehero/:avatar/src',
              key: 'src',
              title: 'Src',
              type: 'string',
              value: 'https://example.com/avatar.png',
              default: '',
              custom: false,
            },
            icon: {
              id: '#u_pagehero/:avatar/icon',
              key: 'icon',
              title: 'Icon',
              type: 'icon',
              value: 'i-ph-user',
              default: '',
              custom: false,
            },
            ui: {
              id: '#u_pagehero/:avatar/ui',
              key: 'ui',
              title: 'Ui',
              value: '',
              default: '',
              custom: false,
              type: 'string',
              hidden: true,
            },
          },
        },
        ':avatar2': {
          id: '#u_pagehero/:avatar2',
          key: ':avatar2',
          type: 'object',
          title: 'Avatar2',
          custom: false,
          value: {},
          default: {},
          children: {
            src: {
              id: '#u_pagehero/:avatar2/src',
              key: 'src',
              title: 'Src',
              type: 'string',
              value: '',
              default: '',
              custom: false,
            },
            icon: {
              id: '#u_pagehero/:avatar2/icon',
              key: 'icon',
              title: 'Icon',
              type: 'icon',
              value: '',
              default: '',
              custom: false,
            },
          },
        },
      })
    })

    test('generate array of object prop from meta case one (schema is directly defined as an array of object)', () => {
      const props: PropertyMeta[] = [{
        name: 'features',
        global: false,
        description: '',
        tags: [],
        required: true,
        type: '{ label: string; content: string; }[]',
        schema: {
          kind: 'array',
          type: '{ label: string; content: string; }[]',
          schema: [
            {
              kind: 'object',
              type: '{ label: string; content: string; }',
              schema: {
                label: {
                  name: 'label',
                  global: false,
                  description: '',
                  tags: [],
                  required: true,
                  type: 'string',
                  schema: 'string',
                  declarations: [],
                },
                content: {
                  name: 'content',
                  global: false,
                  description: '',
                  tags: [],
                  required: true,
                  type: 'string',
                  schema: 'string',
                  declarations: [],
                },
                ui: {
                  name: 'ui',
                  global: false,
                  description: '',
                  tags: [],
                  required: false,
                  type: 'Partial<{ root: string; image: string; fallback: string; icon: string; }> | undefined',
                  schema: {
                    kind: 'enum',
                    type: 'Partial<{ root: string; image: string; fallback: string; icon: string; }> | undefined',
                    schema: ['undefined', 'Partial<{ root: string; image: string; fallback: string; icon: string; }>'],
                  },
                  declarations: [],
                },
              },
            },
          ],
        },
        declarations: [],
      }]

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'TemplateFeatures',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props))).toEqual({
        ':features': {
          id: '#templatefeatures/:features',
          key: ':features',
          title: 'Features',
          value: [],
          type: 'array',
          custom: false,
          default: [],
          arrayItemForm: {
            id: '#array/items',
            type: 'object',
            title: 'Items',
            children: {
              label: {
                id: '#array/items/label',
                key: 'label',
                title: 'Label',
                type: 'string',
                value: '',
                default: '',
                custom: false,
              },
              content: {
                id: '#array/items/content',
                key: 'content',
                title: 'Content',
                type: 'string',
                value: '',
                default: '',
                custom: false,
              },
              ui: {
                id: '#array/items/ui',
                key: 'ui',
                title: 'Ui',
                value: '',
                default: '',
                custom: false,
                type: 'string',
              },
            },
          },
        },
      })
    })

    test('generate array of object prop from meta case two (schema is an enum object containing an array of object)', () => {
      const props: PropertyMeta[] = [{
        name: 'links',
        global: false,
        description: '',
        tags: [],
        required: false,
        type: 'ButtonProps[] | undefined',
        schema: {
          kind: 'enum',
          type: 'ButtonProps[] | undefined',
          schema: [
            'undefined',
            {
              kind: 'array',
              type: 'ButtonProps[]',
              schema: [
                {
                  kind: 'object',
                  type: 'ButtonProps',
                  schema: {
                    label: buttonPropsSchema.label,
                    color: buttonPropsSchema.color,
                    block: buttonPropsSchema.block,
                    activeClass: buttonPropsSchema.activeClass,
                  },
                },
              ],
            },
          ],
        },
        declarations: [],
      }]

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'UButton',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props, { nuxtUI: true }))).toEqual({
        ':links': {
          id: '#u_button/:links',
          key: ':links',
          title: 'Links',
          value: [],
          type: 'array',
          custom: false,
          default: [],
          arrayItemForm: {
            id: '#array/items',
            type: 'object',
            title: 'Items',
            children: {
              'label': {
                id: '#array/items/label',
                key: 'label',
                title: 'Label',
                type: 'string',
                value: '',
                default: '',
                custom: false,
              },
              'color': {
                id: '#array/items/color',
                key: 'color',
                title: 'Color',
                type: 'string',
                value: 'primary',
                default: 'primary',
                options: ['error', 'primary', 'secondary', 'success', 'info', 'warning', 'neutral'],
                custom: false,
              },
              ':block': {
                id: '#array/items/:block',
                key: ':block',
                title: 'Block',
                type: 'boolean',
                value: false,
                default: false,
                custom: false,
              },
              'activeClass': {
                id: '#array/items/activeClass',
                key: 'activeClass',
                title: 'ActiveClass',
                type: 'string',
                value: '',
                default: '',
                custom: false,
                hidden: true,
              },
            },
          },
        },
      })
    })

    test('generate array of string prop from meta', () => {
      const props: PropertyMeta[] = [{
        name: 'names',
        global: false,
        description: '',
        tags: [],
        required: true,
        type: 'string[]',
        schema: {
          kind: 'array',
          type: 'string[]',
          schema: ['string'],
        },
        declarations: [],
      }]

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'Authors',
          props: {},
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props))).toEqual({
        ':names': {
          id: '#authors/:names',
          key: ':names',
          title: 'Names',
          value: [],
          type: 'array',
          custom: false,
          default: [],
          arrayItemForm: {
            id: '#array/items',
            type: 'string',
            title: 'Items',
          },
        },
      })
    })

    test('generate prop not present in meta', () => {
      const props: PropertyMeta[] = []

      const node = {
        type: {
          name: 'element',
        },
        attrs: {
          tag: 'Unicorn',
          props: {
            as: 'h1',
          },
        },
      } as unknown as ProseMirrorNode

      expect(buildFormTreeFromProps(node, createComponentMeta(props))).toEqual({
        as: {
          id: '#unicorn/as', // should not cointain _ since it's not ui component
          key: 'as',
          title: 'As',
          value: 'h1',
          custom: true,
          disabled: false,
          type: 'string',
        },
      })
    })

    // test('generate props for video component', () => {
    //   const props: PropertyMeta[] = []

    //   const node = {
    //     type: {
    //       name: 'video',
    //     },
    //     attrs: {
    //       tag: 'video',
    //       props: {
    //         ':autoplay': 'true',
    //         ':controls': 'true',
    //         ':loop': 'true',
    //         'poster': '/assets/home/videos/HomeNotionLikePoster.webp',
    //         'src': 'https://res.cloudinary.com/nuxt/video/upload/v1733494722/contentv3final_rc8bvu.mp4',
    //       },
    //     },
    //   } as unknown as ProseMirrorNode

    //   // When props array is empty, custom props from node are added
    //   expect(buildFormTreeFromProps(node, props)).toEqual({
    //     'src': {
    //       id: '#video/src',
    //       key: 'src',
    //       title: 'Src',
    //       value: 'https://res.cloudinary.com/nuxt/video/upload/v1733494722/contentv3final_rc8bvu.mp4',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //     ':autoplay': {
    //       id: '#video/:autoplay',
    //       key: ':autoplay',
    //       title: 'Autoplay',
    //       value: 'true',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //     ':controls': {
    //       id: '#video/:controls',
    //       key: ':controls',
    //       title: 'Controls',
    //       value: 'true',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //     ':loop': {
    //       id: '#video/:loop',
    //       key: ':loop',
    //       title: 'Loop',
    //       value: 'true',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //     'poster': {
    //       id: '#video/poster',
    //       key: 'poster',
    //       title: 'Poster',
    //       value: '/assets/home/videos/HomeNotionLikePoster.webp',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //   })
    // })

    // test('generate props for image component', () => {
    //   const props: PropertyMeta[] = []

    //   // Without overriding - empty props result in empty formTree
    //   const emptyNode = {
    //     type: {
    //       name: 'image',
    //     },
    //     attrs: {
    //       tag: 'image',
    //       props: {},
    //     },
    //   } as unknown as ProseMirrorNode

    //   expect(buildFormTreeFromProps(emptyNode, props)).toEqual({})

    //   // With overriding - custom props from node are added
    //   const node = {
    //     type: {
    //       name: 'image',
    //     },
    //     attrs: {
    //       tag: 'image',
    //       props: {
    //         alt: 'Alt value',
    //         src: '/image.webp',
    //       },
    //     },
    //   } as unknown as ProseMirrorNode

    //   expect(buildFormTreeFromProps(node, props)).toEqual({
    //     alt: {
    //       id: '#image/alt',
    //       key: 'alt',
    //       title: 'Alt',
    //       value: 'Alt value',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //     src: {
    //       id: '#image/src',
    //       key: 'src',
    //       title: 'Src',
    //       value: '/image.webp',
    //       type: 'string',
    //       custom: true,
    //       disabled: false,
    //     },
    //   })
    // })
  })
})
