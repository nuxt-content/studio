import { createSingletonPromise } from '@vueuse/core'
import themeLight from './theme-light'
import themeDark from './theme-dark'

export { setupSuggestion } from './mdc-compilation'
export type { editor as Editor } from 'modern-monaco/editor-core'
export type Monaco = Awaited<ReturnType<typeof import('modern-monaco')['init']>>

export const setupMonaco = createSingletonPromise(async () => {
  // List from https://github.com/microsoft/vscode/blob/2022aede9218d2fe7668115a75fa56032f863014/build/lib/i18n.js#L24C1-L34C3
  const validNlsLanguages = [
    'zh-tw',
    'zh-cn',
    'ja',
    'ko',
    'de',
    'fr',
    'es',
    'ru',
    'it',
  ]
  // @ts-expect-error - global property defined in the nuxt plugin
  const locale: string = window.__NUXT_STUDIO_DEFAULT_LOCALE__ || 'en'

  let finalLocale: string
  if (locale === 'en') {
    finalLocale = 'en'
  }
  else if (validNlsLanguages.includes(locale)) {
    finalLocale = locale
  }
  else {
    console.warn(`[Monaco] could not load locale '${locale}'. Valid locales: ${validNlsLanguages.join(', ')}`)
    finalLocale = 'en'
  }

  try {
    if (finalLocale !== 'en') {
      const nlsUrl = `https://esm.sh/monaco-editor/esm/nls.messages.${finalLocale}.js`
      await import(/* @vite-ignore */ nlsUrl)
    }
  }
  catch (e) {
    console.error(`[Monaco] error while loading locale: ${finalLocale}`, e)
  }

  // @ts-expect-error -- use dynamic import to reduce bundle size
  const init = await import('https://esm.sh/modern-monaco').then(m => m.init)
  // @ts-expect-error -- use dynamic import to reduce bundle size
  const cssBundle = await import('https://esm.sh/modern-monaco/editor-core').then(m => m.cssBundle)

  if (!window.document.getElementById('monaco-editor-core-css')) {
    const styleEl = window.document.createElement('style')
    styleEl.id = 'monaco-editor-core-css'
    styleEl.media = 'screen'
    styleEl.textContent = [
      '/* Only include font-face rules in head tag to load fonts and avoid conflicts with other styles */',
      cssBundle.match(/@font-face\{[^}]+\}/)?.[0] || '',
    ].join('\n')
    window.document.head.appendChild(styleEl)
  }

  const monaco: Monaco = await init()
  monaco.editor.defineTheme('vitesse-light', themeLight)
  monaco.editor.defineTheme('vitesse-dark', themeDark)

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
    createDiffEditor: ((domElement, options, override) => {
      // Inject the CSS bundle into the DOM
      const styleEl = window.document.createElement('style')
      styleEl.id = 'monaco-editor-core-css'
      styleEl.media = 'screen'
      styleEl.textContent = cssBundle
      domElement.parentNode!.appendChild(styleEl)

      return monaco.editor.createDiffEditor(domElement, options, override)
    }) as Monaco['editor']['createDiffEditor'],
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
