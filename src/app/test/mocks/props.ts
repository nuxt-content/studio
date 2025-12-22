import type { PropertyMeta } from 'vue-component-meta'

export const buttonPropsSchema: Record<string, PropertyMeta> = {
  label: {
    name: 'label',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: 'string | undefined',
    schema: 'string | undefined',
    declarations: [],
  },
  color: {
    name: 'color',
    global: false,
    description: '',
    tags: [
      {
        name: 'defaultValue',
        text: '\'primary\'',
      },
    ],
    required: false,
    type: '"error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral" | undefined',
    schema: {
      kind: 'enum',
      type: '"error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral" | undefined',
      schema: ['undefined', 'error', 'primary', 'secondary', 'success', 'info', 'warning', 'neutral'],
    },
    declarations: [],
  },
  block: {
    name: 'block',
    global: false,
    description: '',
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
  activeClass: {
    name: 'activeClass',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: 'string | undefined',
    schema: 'string | undefined',
    declarations: [],
  },
}

export const iconPropsSchema: Record<string, PropertyMeta> = {
  name: {
    name: 'name',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: 'string | undefined',
    schema: 'string | undefined',
    declarations: [],
  },
  mode: {
    name: 'mode',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: '"svg" | "css" | undefined',
    schema: {
      kind: 'enum',
      type: '"svg" | "css" | undefined',
      schema: ['undefined', 'svg', 'css'],
    },
    declarations: [],
  },
  size: {
    name: 'size',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: 'string | undefined',
    schema: 'string | undefined',
    declarations: [],
  },
  customize: {
    name: 'customize',
    global: false,
    description: '',
    tags: [],
    required: false,
    type: 'string | undefined',
    schema: 'string | undefined',
    declarations: [],
  },
}
