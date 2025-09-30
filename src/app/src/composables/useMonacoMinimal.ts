// import { computed, ref, watch, unref } from 'vue'
// import type { editor as Editor } from 'modern-monaco/editor-core'
// import type { Ref } from 'vue'
// import { omit } from '../utils/object'
// import { setupMonaco, setupTheme, baseEditorOptions } from '../utils/monaco/index'

// export function useMonacoMinimal(target: Ref, options: {
//   code: string
//   language: string
//   readOnly?: boolean
//   height?: { minLines: number, maxLines: number }
//   resolvedTheme?: Ref<string>
//   onChange?: (content: string) => void
// }) {
//   const isSetup = ref(false)
//   let monaco: Awaited<ReturnType<typeof setupMonaco>>
//   let editor: Editor.IStandaloneCodeEditor

//   // //   const colorMode = useColorMode()

//   const resolvedTheme = computed(() => {
//     if (options.resolvedTheme) {
//       return options.resolvedTheme.value
//     }
//     return baseEditorOptions.theme.dark // colorMode.value === 'dark' ? baseEditorOptions.theme.dark : baseEditorOptions.theme.light
//   })

//   // //   watch([() => colorMode.value, () => options.resolvedTheme?.value], () => setOptions({ theme: resolvedTheme.value }))

//   const setContent = (content: string, preserveCursor = true) => {
//     if (!isSetup.value) return
//     const position = preserveCursor ? editor?.getPosition() : undefined

//     editor?.setValue(content)

//     if (position) {
//       editor?.setPosition(position)
//     }
//   }

//   const getContent = () => editor?.getValue()

//   const init = async () => {
//     monaco = await setupMonaco()

//     watch(
//       target,
//       () => {
//         const el = unref(target)

//         if (!el) return

//         setupTheme(monaco)

//         const model = monaco.editor.createModel(options.code, options.language)

//         editor = monaco.editor.create(el, {
//           ...baseEditorOptions as unknown as Editor.IEditorOptions,
//           theme: resolvedTheme.value,
//           ...omit(options, 'resolvedTheme'),
//           model,
//           tabSize: 2,
//           wordWrap: 'on',
//           insertSpaces: true,
//           autoClosingQuotes: 'always',
//           detectIndentation: false,
//           stickyScroll: {
//             enabled: false,
//           },
//         })

//         model.onDidChangeContent(() => {
//           options.onChange?.(model.getValue())
//         })

//         if (options.height) {
//           const lineHeight = 18
//           let editingLayout = false
//           const updateHeight = () => {
//             if (editingLayout) {
//               return
//             }

//             if (options.height) {
//               const contentHeight = Math.min((options.height.maxLines + 2) * lineHeight, Math.max((options.height.minLines + 2) * lineHeight, editor.getContentHeight() + lineHeight))
//               const { height: layoutHeight } = editor.getLayoutInfo()
//               if (layoutHeight === contentHeight) {
//                 return
//               }

//               try {
//                 editingLayout = true
//                 editor.layout({ height: contentHeight, width: el.clientWidth })
//               }
//               catch {
//                 // Ignore
//               }
//             }
//             editingLayout = false
//           }
//           editor.onDidContentSizeChange(updateHeight)
//           updateHeight()
//         }

//         isSetup.value = true
//       },
//       {
//         flush: 'post',
//         immediate: true,
//       },
//     )
//   }

//   init()

//   const setOptions = (opts: Editor.IEditorOverrideServices) => {
//     editor?.updateOptions(opts)
//   }

//   return {
//     getContent,
//     setOptions,
//     setContent,
//   }
// }
