<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ContentFileExtension, type DatabasePageItem, type DraftItem, DraftStatus, type DatabaseItem } from '../../types'
import type { PropType } from 'vue'
import { setupSuggestion } from '../../utils/monaco'
import { useStudio } from '../../composables/useStudio'
import { useMonaco } from '../../composables/useMonaco'
import { useMonacoDiff } from '../../composables/useMonacoDiff'
import { fromBase64ToUTF8 } from '../../utils/string'
import { areContentEqual } from '../../utils/content'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
  readOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const document = defineModel<DatabasePageItem>()
const { mediaTree, host, ui } = useStudio()

const editorRef = ref<HTMLElement>()
const diffEditorRef = ref<HTMLElement>()

const content = ref<string>('')
const currentDocumentId = ref<string | null>(null)
const localStatus = ref<DraftStatus>(props.draftItem.status)
const isAutomaticFormattingDetected = ref(false)
const showAutomaticFormattingDiff = ref(false)

const language = computed(() => {
  switch (document.value?.extension) {
    case ContentFileExtension.Markdown:
      return 'mdc'
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      return 'yaml'
    case ContentFileExtension.JSON:
      return 'javascript'
    default:
      return 'text'
  }
})

const { editor, setContent: setEditorContent } = useMonaco(editorRef, {
  uri: 'file://' + (document.value?.id || ''),
  language,
  readOnly: props.readOnly,
  colorMode: ui.colorMode,
  onSetup: async (monaco) => {
    setupSuggestion(monaco.monaco, host.meta.components(), mediaTree.root.value)
  },
  onChange: (newContent) => {
    if (props.readOnly) {
      return
    }

    // Do not trigger model updates if the document id has changed
    if (currentDocumentId.value !== document.value?.id) {
      return
    }

    if (content.value === newContent) {
      return
    }

    content.value = newContent

    host.document.generate.documentFromContent(document.value!.id, content.value).then((doc) => {
      localStatus.value = DraftStatus.Updated

      document.value = {
        ...host.document.utils.pickReservedKeys(props.draftItem.modified as DatabasePageItem || document.value!),
        ...doc,
      } as DatabasePageItem
    })
  },
})

// Trigger on action events
watch(() => props.draftItem.status, (newStatus) => {
  if (editor.value && newStatus !== localStatus.value) {
    const document = newStatus === DraftStatus.Deleted ? props.draftItem.original : props.draftItem.modified
    localStatus.value = newStatus
    setContent(document as DatabasePageItem)
  }
})

watch(() => props.readOnly, (newReadOnly) => {
  if (editor.value) {
    editor.value.updateOptions({
      readOnly: newReadOnly,
      scrollbar: newReadOnly
        ? {
            vertical: 'hidden',
            horizontal: 'hidden',
            handleMouseWheel: false,
          }
        : undefined,
    })
  }
})

const originalContent = ref<string>('')
const formattedContent = ref<string>('')
watch(showAutomaticFormattingDiff, async (show) => {
  if (show && diffEditorRef.value) {
    useMonacoDiff(diffEditorRef, {
      original: originalContent.value,
      modified: formattedContent.value,
      language: language.value,
      colorMode: ui.colorMode,
    })
  }
})

// Trigger on document changes
watch(() => document.value?.id + '-' + props.draftItem.version, async () => {
  if (document.value?.body) {
    setContent(document.value)
  }
}, { immediate: true })

async function setContent(document: DatabasePageItem) {
  const contentFromDocument = host.document.generate.contentFromDocument
  const md = await contentFromDocument(document) || ''
  content.value = md
  setEditorContent(md, true)
  currentDocumentId.value = document.id

  isAutomaticFormattingDetected.value = false
  if (props.draftItem.original && props.draftItem.githubFile?.content) {
    const localOriginal = await contentFromDocument(props.draftItem.original as DatabaseItem) as string
    const gitHubOriginal = fromBase64ToUTF8(props.draftItem.githubFile.content)

    isAutomaticFormattingDetected.value = !areContentEqual(localOriginal, gitHubOriginal)
    if (isAutomaticFormattingDetected.value) {
      originalContent.value = gitHubOriginal
      formattedContent.value = localOriginal
    }
  }
}

function toggleDiffView() {
  showAutomaticFormattingDiff.value = !showAutomaticFormattingDiff.value
}
</script>

<template>
  <div class="relative h-full flex flex-col">
    <AlertMDCFormatting
      v-if="isAutomaticFormattingDetected"
      show-action
      :is-diff-shown="showAutomaticFormattingDiff"
      class="flex-none"
      @show-diff="toggleDiffView"
    />
    <div
      v-show="!showAutomaticFormattingDiff"
      ref="editorRef"
      class="flex-1"
    />
    <div
      v-if="isAutomaticFormattingDetected"
      v-show="showAutomaticFormattingDiff"
      ref="diffEditorRef"
      class="flex-1"
    />
  </div>
</template>
