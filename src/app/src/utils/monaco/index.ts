import { createSingletonPromise } from '@vueuse/core'
import type { editor as Editor } from 'modern-monaco/editor-core'

export { setupSuggestion } from './mdc-compilation'
export type { editor as Editor } from 'modern-monaco/editor-core'
export type Monaco = Awaited<ReturnType<typeof import('modern-monaco')['init']>>

export const setupMonaco = createSingletonPromise(async () => {
  // @ts-expect-error -- use dynamic import to reduce bundle size
  const init = await import('https://esm.sh/modern-monaco').then(m => m.init)
  // @ts-expect-error -- use dynamic import to reduce bundle size
  const cssBundle = await import('https://esm.sh/modern-monaco/editor-core').then(m => m.cssBundle)

  if (!window.document.getElementById('monaco-editor-core-css')) {
    const styleEl = window.document.createElement('style')
    styleEl.id = 'monaco-editor-core-css'
    styleEl.media = 'screen'
    styleEl.textContent = '/* Dummy CSS to disable modern monaco styles. TODO: drop a PR to modern-monaco */'
    window.document.head.appendChild(styleEl)
  }

  const monaco: Monaco = await init()

  return {
    monaco,
    editor: monaco.editor,
    createEditor: ((domElement, options, override) => {
      // Inject the CSS bundle into the DOM
      const styleEl = window.document.createElement('style')
      styleEl.id = 'monaco-editor-core-css'
      styleEl.media = 'screen'
      styleEl.textContent = cssBundle
      domElement.parentNode!.appendChild(styleEl)

      document.createElement('style')

      return monaco.editor.create(domElement, options, override)
    }) as Monaco['editor']['create'],
  }
  // await Promise.all([
  //   // load workers
  //   (async () => {
  //     const [
  //       { default: EditorWorker },
  //       { default: JsonWorker },
  //       { default: CssWorker },
  //       { default: HtmlWorker },
  //       { default: TsWorker },
  //     ] = await Promise.all([
  //       import('monaco-editor/esm/vs/editor/editor.worker?worker'),
  //       import('monaco-editor/esm/vs/language/json/json.worker?worker'),
  //       import('monaco-editor/esm/vs/language/css/css.worker?worker'),
  //       import('monaco-editor/esm/vs/language/html/html.worker?worker'),
  //       import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
  //     ])

  //     window.MonacoEnvironment = {
  //       getWorker(_: unknown, label: string) {
  //         if (label === 'json') return new JsonWorker()
  //         if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
  //         if (label === 'html' || label === 'handlebars' || label === 'razor' || label === 'vue3') return new HtmlWorker()
  //         if (label === 'typescript' || label === 'javascript') return new TsWorker()
  //         return new EditorWorker()
  //       },
  //     }

  //     monaco.languages.register({ id: 'mdc', aliases: ['mdc', 'md', 'markdown'] })
  //     // Register a tokens provider for the language
  //     monaco.languages.setMonarchTokensProvider('mdc', mdcLanguage)
  //     monaco.languages.setLanguageConfiguration('mdc', {
  //       comments: {
  //         blockComment: ['<!--', '-->'],
  //       },
  //     })
  //   })(),
  // ])

  // return monaco
})

export function setupTheme(monaco: Monaco) {
  monaco.editor.defineTheme('studio-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0f172a', // slate-900
    },
  })

  monaco.editor.defineTheme('studio-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    },
  })

  monaco.editor.defineTheme('tiptap-hover-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#334155', // slate-700
      'editor.lineHighlightBorder': '#475569', // slate-600
      'editor.lineHighlightBackground': '#334155', // slate-700
    },
  })

  monaco.editor.defineTheme('tiptap-hover-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#e2e8f0', // slate-200
      'editor.lineHighlightBorder': '#cbd5e1', // slate-300
      'editor.lineHighlightBackground': '#e2e8f0', // slate-200
    },
  })
}

export const baseEditorOptions: Editor.IEditorOptions & { theme: { light: string, dark: string } } = {
  folding: false,
  glyphMargin: false,
  lineNumbersMinChars: 3,
  overviewRulerLanes: 0,
  automaticLayout: true,
  theme: { light: 'studio-light', dark: 'studio-dark' },
  minimap: {
    enabled: false,
  },
  padding: {
    top: 16,
  },
}
