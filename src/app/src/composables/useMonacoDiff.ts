import { watch, unref, type Ref } from 'vue'
import type { editor as Editor } from 'modern-monaco/editor-core'
import { setupMonaco } from '../utils/monaco/index'

export interface UseMonacoDiffOptions {
  original: string
  modified: string
  language: string
  colorMode?: 'light' | 'dark'
  editorOptions?: Editor.IStandaloneDiffEditorConstructionOptions
}

export function useMonacoDiff(target: Ref, options: UseMonacoDiffOptions) {
  let editor: Editor.IStandaloneDiffEditor | null = null
  let isInitialized = false

  const getTheme = (mode: 'light' | 'dark' = 'dark') => {
    return mode === 'light' ? 'vitesse-light' : 'vitesse-dark'
  }

  const init = async () => {
    const el = unref(target)
    if (!el || isInitialized) return

    const monaco = await setupMonaco()

    editor = monaco.createDiffEditor(el, {
      theme: getTheme(options.colorMode),
      lineNumbers: 'off',
      readOnly: true,
      renderSideBySide: true,
      renderSideBySideInlineBreakpoint: 0,
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      ...options.editorOptions,
    })

    editor.setModel({
      original: monaco.editor.createModel(options.original, options.language),
      modified: monaco.editor.createModel(options.modified, options.language),
    })

    isInitialized = true
  }

  // Watch target to initialize when it becomes available
  watch(
    target,
    () => {
      const el = unref(target)
      if (el && !isInitialized) {
        init()
      }
      else if (!el && isInitialized) {
        isInitialized = false
        editor?.dispose()
        editor = null
      }
    },
    { immediate: true, flush: 'post' },
  )

  const setOptions = (opts: Editor.IStandaloneDiffEditorConstructionOptions) => {
    editor?.updateOptions(opts)
  }

  return {
    editor,
    setOptions,
  }
}
