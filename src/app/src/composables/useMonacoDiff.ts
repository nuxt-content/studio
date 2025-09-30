// import { computed, watch, unref } from 'vue'
// import type { Ref } from 'vue'
// import type { editor as Editor } from 'modern-monaco/editor-core'
// import { setupMonaco, setupTheme, baseEditorOptions } from '../utils/monaco/index'

// export function useMonacoDiff(target: Ref, options: { original: string, modified: string, language: string, renderSideBySide?: boolean }) {
//   let monaco: Awaited<ReturnType<typeof setupMonaco>>
//   let editor: Editor.IStandaloneDiffEditor

//   // const colorMode = useColorMode()

//   const resolvedTheme = computed(() => baseEditorOptions.theme.dark)// colorMode.value === 'dark' ? baseEditorOptions.theme.dark : baseEditorOptions.theme.light)

//   // watch(() => colorMode.value, () => setOptions({ theme: resolvedTheme.value }))

//   const init = async () => {
//     monaco = await setupMonaco()

//     watch(
//       target,
//       () => {
//         const el = unref(target)

//         if (!el) return

//         setupTheme(monaco)

//         editor = monaco.editor.createDiffEditor(el, {
//           ...baseEditorOptions,
//           theme: resolvedTheme.value,
//           readOnly: true,
//           renderSideBySide: options.renderSideBySide ?? false,
//           // disable the fallback to inline with a `0` width breakpoint
//           renderSideBySideInlineBreakpoint: 0,
//           wordWrap: 'on',
//           scrollBeyondLastLine: false,
//         })

//         editor.setModel({
//           original: monaco.editor.createModel(options.original, options.language),
//           modified: monaco.editor.createModel(options.modified, options.language),
//         })
//       },
//       {
//         flush: 'post',
//         immediate: true,
//       },
//     )
//   }

//   init()

//   const setOptions = (opts: Editor.IStandaloneDiffEditorConstructionOptions) => {
//     editor?.updateOptions(opts)
//   }

//   return {
//     setOptions,
//   }
// }
