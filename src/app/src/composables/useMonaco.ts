import { shallowRef, watch, unref, onUnmounted, type Ref } from 'vue'
import type { editor as Editor } from 'modern-monaco/editor-core'
import { setupMonaco } from '../utils/monaco'

export interface UseMonacoOptions {
  uri?: string
  language: Ref<string> | string
  initialContent?: string
  readOnly?: boolean
  colorMode: Ref<'light' | 'dark'>
  onChange?: (content: string) => void
  onSetup?: (monaco: Awaited<ReturnType<typeof setupMonaco>>) => void | Promise<void>
  editorOptions?: Editor.IStandaloneEditorConstructionOptions
}

export function useMonaco(target: Ref<HTMLElement | undefined>, options: UseMonacoOptions) {
  const editor = shallowRef<Editor.IStandaloneCodeEditor | null>(null)
  let isInitialized = false
  let initialContent = options.initialContent || ''

  const getTheme = (mode: 'light' | 'dark' = 'dark') => {
    return mode === 'light' ? 'vitesse-light' : 'vitesse-dark'
  }

  const init = async () => {
    const el = unref(target)
    if (!el || isInitialized) return

    const monaco = await setupMonaco()

    // Allow custom setup (e.g., for suggestions)
    if (options.onSetup) {
      await options.onSetup(monaco)
    }

    const colorMode = unref(options.colorMode) || 'dark'

    const monacoPortal = (el.getRootNode() as Document)?.getElementById('monaco-portal') || undefined
    if (monacoPortal) {
      monacoPortal.style.position = 'absolute'
      monacoPortal.style.top = el.getClientRects()[0].top + 'px'
    }

    // Create editor instance (use the custom createEditor wrapper from setupMonaco)
    editor.value = monaco.createEditor(el, {
      theme: getTheme(colorMode),
      lineNumbers: 'off',
      readOnly: options.readOnly ?? false,
      wordWrap: 'on',
      automaticLayout: true,
      overflowWidgetsDomNode: monacoPortal,
      ...options.editorOptions,
    })

    // Handle content changes
    if (options.onChange && !options.readOnly) {
      editor.value.onDidChangeModelContent(() => {
        const newContent = editor.value!.getModel()!.getValue() || ''
        options.onChange!(newContent)
      })
    }

    // Create and attach model
    const language = unref(options.language)
    const existingModel = options.uri && monaco.editor.getModel(options.uri)
    const model = existingModel || monaco.editor.createModel(initialContent, language, options.uri)
    editor.value.setModel(model)

    // Watch for color mode changes
    watch(options.colorMode, (newMode) => {
      editor.value?.updateOptions({
        theme: getTheme(newMode),
      })
    })

    isInitialized = true
  }

  // Watch target to initialize when it becomes available
  watch(
    target,
    () => {
      if (unref(target) && !isInitialized) {
        init()
      }
    },
    { immediate: true, flush: 'post' },
  )

  const setContent = (content: string, preserveCursor = true) => {
    // If editor not ready, queue the content
    if (!editor.value) {
      initialContent = content
      return
    }

    const model = editor.value.getModel()
    if (!model) return

    // Check if content is different
    if (model.getValue() === content) return

    if (preserveCursor) {
      const position = editor.value.getPosition()
      model.setValue(content)
      if (position) {
        editor.value.setPosition(position)
      }
    }
    else {
      model.setValue(content)
    }
  }

  const getContent = () => {
    return editor.value?.getModel()?.getValue() || ''
  }

  const updateOptions = (options: Editor.IEditorOptions) => {
    editor.value?.updateOptions(options)
  }

  // Cleanup
  onUnmounted(() => {
    editor.value?.dispose()
  })

  return {
    editor,
    setContent,
    getContent,
    updateOptions,
  }
}
