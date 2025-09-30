import { ref } from 'vue'
import { kebabCase, pascalCase } from 'scule'
import type { languages, IRange } from 'modern-monaco/editor-core'
import type { TreeItem, ComponentMeta } from '../../types'

type Monaco = typeof import('modern-monaco/editor-core')
type CompletionItemType = 'inline' | 'block' | 'all'
type CompletionItem = languages.CompletionItem & { type: CompletionItemType }

const projectComponents = ref<ComponentMeta[]>([])
const projectMedias = ref<TreeItem[]>([])

export const setupSuggestion = (monaco: typeof import('modern-monaco/editor-core'), componentsMeta: ComponentMeta[], treeMedia: TreeItem[]) => {
  projectComponents.value = componentsMeta
  projectMedias.value = treeMedia

  // @ts-expect-error Return prevent duplicate registration
  if (monaco.languages.__mdcCompletionProvider) {
    return
  }
  // @ts-expect-error Mark as registered to prevent duplicate registration
  monaco.languages.__mdcCompletionProvider = true

  // Completion item provider for component suggestion
  monaco.languages.registerCompletionItemProvider('mdc', {
    triggerCharacters: ['/', ':'],
    provideCompletionItems: function (model, position) {
      const word = model.getWordUntilPosition(position)

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn - 1, // -1 to remove the slash
        endColumn: word.endColumn,
      }

      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      const lastLineUntilPosition = textUntilPosition.split('\n').pop()?.trim()
      const trigger = textUntilPosition.match(/(^|\s|,)(\/|:)[-\w\s]*$/)?.[2]

      if (!trigger || !lastLineUntilPosition) {
        return {
          suggestions: [],
        }
      }

      let completionType: CompletionItemType = 'inline'
      if (lastLineUntilPosition.startsWith('/') || lastLineUntilPosition.startsWith(':')) {
        completionType = 'all'
      }
      if (lastLineUntilPosition.startsWith('> ')) {
        completionType = 'all'
      }

      return {
        suggestions: [
          ...getGlobalCompletionItems(monaco, range, trigger),
          ...getProjectCompletionItems(monaco, range, trigger, projectComponents.value),
          ...getMediasCompletionItems(monaco, range, trigger, projectMedias.value),
        ].filter(item => completionType === 'all' || item.type === completionType),
      }
    },
  })

  // Completion item provider for inline attributes
  monaco.languages.registerCompletionItemProvider('mdc', {
    triggerCharacters: 'abcdefghijklmnopqrstuvwxyz '.split(''),
    provideCompletionItems: function (model, position) {
      const textOfTheLastLine = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: 10000,
      })
      const textOfTheLastLineUntilPosition = textOfTheLastLine.substring(0, position.column - 1)

      const trigger = textOfTheLastLineUntilPosition.match(/((.*)(^|\s)(::|:)([\w-]+))\{[^}]*$/)

      if (trigger) {
        const componentName = trigger[5]
        const attributesStartPosition = trigger[1].length + 1
        const attributesEndPosition = textOfTheLastLine.indexOf('}', attributesStartPosition)

        // `{` and `}` are not part of the attribute
        const attributesText = textOfTheLastLine.substring(attributesStartPosition, attributesEndPosition)

        const attributes = attributesText.split(' ').filter(Boolean).reduce((acc, attr) => {
          const [key, value] = attr.split('=')
          if (typeof value === 'undefined') {
            if (key.startsWith('#')) {
              acc.id = key.substring(1)
            }
            else if (key.startsWith('.')) {
              acc.class = ((acc.class || '') + key).split('.').join(' ')
            }
            else {
              acc[key] = true
            }
          }
          else {
            acc[key] = value
          }
          return acc
        }, {} as Record<string, string | boolean>)

        // Work & Range
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const componentProps = findComponentProps(componentName, projectComponents.value)
        const suggestions = componentProps.filter(prop => typeof attributes[prop.name] === 'undefined').map((prop) => {
          const insertText = `${prop.name}="\${1:${unwrapQuotes(prop.default || 'value')}}"`
          return {
            label: prop.name,
            filterText: prop.name,
            detail: prop.description,
            insertText,
            kind: monaco.languages.CompletionItemKind.Property,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            type: 'inline',
            range,
          }
        })

        return {
          suggestions,
        }
      }

      return {
        suggestions: [],
      }
    },
  })

  // TODO: Register completion for component attributes
}

function findComponentProps(componentName: string, components: ComponentMeta[]) {
  componentName = pascalCase(componentName)
  const component = components.find(c => c.name === componentName)
  if (!component) {
    return []
  }
  return component.meta.props || []
}

function getGlobalCompletionItems(monaco: Monaco, range: IRange, trigger = '/'): CompletionItem[] {
  return [
    {
      label: 'Heading 1',
      filterText: trigger + 'heading 1',
      detail: '#',
      insertText: '# ${1:title}',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Heading 2',
      filterText: trigger + 'heading 2',
      detail: '##',
      insertText: '## ${1:title}',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Heading 3',
      filterText: trigger + 'heading 3',
      detail: '###',
      insertText: '### ${1:title}',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Bold',
      filterText: trigger + 'bold',
      insertText: '**${1:title}**',
      detail: '**',
      kind: monaco.languages.CompletionItemKind.Field,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
    {
      label: 'Italic',
      filterText: trigger + 'italic',
      insertText: '_${1:title}_',
      detail: '_',
      kind: monaco.languages.CompletionItemKind.Field,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
    {
      label: 'Emojis',
      filterText: trigger + 'emoji',
      insertText: ':${1}:',
      detail: ':',
      kind: monaco.languages.CompletionItemKind.Field,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
    {
      label: 'Bulleted List',
      filterText: trigger + 'bulleted-list',
      insertText: '- ${1:Item 1}\n- ${2:Item 2}\n\n${3}',
      detail: '-',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Numbered List',
      filterText: trigger + 'numbered-list',
      insertText: '1. ${1:Item 1}\n2. ${2:Item 2}\n\n${3}',
      detail: '1.',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Blockquote',
      filterText: trigger + 'blockquote',
      insertText: '> ${1}\n> ${2}\n\n${3}',
      detail: '>',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Code',
      filterText: trigger + 'code',
      insertText: '```${1:language}\n${2:code}\n```\n\n${3}',
      detail: '```',
      kind: monaco.languages.CompletionItemKind.Function,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'block',
      range,
    },
    {
      label: 'Inline Code',
      filterText: trigger + 'code-inline',
      insertText: '`$1` $2',
      detail: '`',
      kind: monaco.languages.CompletionItemKind.Field,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
    {
      label: 'Link',
      filterText: trigger + 'link',
      detail: '[]()',
      documentation: [
        '[Studio](https://content.nuxt.com)',
      ].join('\n'),
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: '[${1:title}](${2:link})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
    {
      label: 'Image',
      filterText: trigger + 'image',
      detail: '![]()',
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: '![${1:alt}](${2:src})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: 'inline',
      range,
    },
  ]
}

function getProjectCompletionItems(monaco: Monaco, range: IRange, trigger = '/', componentsMeta: ComponentMeta[]): CompletionItem[] {
  const componentsItems: CompletionItem[] = componentsMeta.map((comp) => {
    let tabIndex = 1
    const isBlock = comp.meta.slots?.length

    const requiredProps = comp.meta.props.filter(prop => prop.required)
    const props = requiredProps.map((prop) => {
      return `${prop.name}="\${${tabIndex++}:${unwrapQuotes(prop.default || prop.name)}}"`
    })

    let insertText = `${isBlock ? '::' : ':'}${kebabCase(comp.name)}`
    if (props) {
      insertText += `{${props.join(' ')}}`
    }

    if (isBlock) {
      insertText += `\n\${${tabIndex++}:Write Something}`
    }

    if (isBlock) {
      insertText += '\n::'
    }

    return {
      label: comp.name,
      filterText: `${trigger}${comp.name}`,
      detail: isBlock ? `::${kebabCase(comp.name)}::` : `:${kebabCase(comp.name)}`,
      insertText,
      documentation: {
        supportHtml: true,
        value: getComponentDocumentation(comp),
      },
      kind: monaco.languages.CompletionItemKind.Module,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      type: isBlock ? 'block' : 'inline',
      range,
    }
  })

  return componentsItems
}

export const getMediasCompletionItems = (monaco: Monaco, range: IRange, trigger = '/', mediaTree: TreeItem[]): CompletionItem[] => {
  const mediasItems: CompletionItem[] = flattenTree(mediaTree)
    .map((media) => {
      const path = media.fsPath.split('/').slice(1).map((part: string) => encodeURIComponent(part)).join('/')
      const insertText = `![${media.name}](/${path})`

      return {
        label: media.name,
        filterText: `${trigger}${media.name}`,
        detail: media.fsPath,
        insertText,
        kind: monaco.languages.CompletionItemKind.File,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        type: 'inline',
        range,
      }
    })

  return mediasItems
}

const getComponentDocumentation = (comp: ComponentMeta) => `
Path in project: \`${comp.path}\`

<br />

## Props

${comp.meta.props.map((prop) => {
  return `
  - **${prop.name}**
  - - type: ${prop.type},
  - - required: ${prop.required},
  - - default: ${prop.default},
  `
}).join('\n')}

<br />

## Slots

${comp.meta.slots.map(slot => `- ${slot.name}`).join('\n')}

<br />

`

const unwrapQuotes = (str = '') => {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1)
  }

  return str
}

const flattenTree = (tree: (TreeItem)[]) => {
  const flatTree: (TreeItem)[] = []

  for (const file of tree) {
    flatTree.push(file)
    if (file.type === 'directory') {
      flatTree.push(...flattenTree(file.children || []))
    }
  }
  return flatTree
}
