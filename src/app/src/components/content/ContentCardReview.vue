<script setup lang="ts">
import type { DraftItem, DatabaseItem, DatabasePageItem } from '../../types'
import type { PropType } from 'vue'
import { ref, computed, nextTick, watch } from 'vue'
import { DraftStatus, ContentFileExtension } from '../../types'
import { getFileExtension } from '../../utils/file'
import { generateContentFromDocument, isEqual } from '../../utils/content'
import { useMonacoDiff } from '../../composables/useMonacoDiff'
import { useMonaco } from '../../composables/useMonaco'
import { useStudio } from '../../composables/useStudio'
import { fromBase64ToUTF8 } from '../../utils/string'

const { ui } = useStudio()

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const diffEditorRef = ref<HTMLDivElement>()
const editorRef = ref<HTMLDivElement>()
const isLoadingContent = ref(false)
const isOpen = ref(false)
const isAutomaticFormattingDetected = ref(false)

const height = ref(200)
const isResizing = ref(false)
const MIN_HEIGHT = 200
const MAX_HEIGHT = 600

function startResize(event: MouseEvent) {
  event.preventDefault()
  isResizing.value = true

  const startY = event.clientY
  const startHeight = height.value

  function handleMouseMove(e: MouseEvent) {
    const deltaY = e.clientY - startY
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY))
    height.value = newHeight
  }

  function handleMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const language = computed(() => {
  const ext = getFileExtension(props.draftItem.fsPath)
  switch (ext) {
    case ContentFileExtension.Markdown:
      return 'markdown'
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      return 'yaml'
    case ContentFileExtension.JSON:
      return 'json'
    default:
      return 'plaintext'
  }
})

watch(isOpen, () => {
  if (isOpen.value && !isLoadingContent.value) {
    initializeEditor()
  }
})

async function initializeEditor() {
  isLoadingContent.value = true

  const localOriginal = props.draftItem.original ? await generateContentFromDocument(props.draftItem.original as DatabaseItem) : null
  const gitHubOriginal = props.draftItem.githubFile?.content ? fromBase64ToUTF8(props.draftItem.githubFile.content) : null
  const modified = props.draftItem.modified ? await generateContentFromDocument(props.draftItem.modified as DatabasePageItem) : null

  isAutomaticFormattingDetected.value = !isEqual(localOriginal, gitHubOriginal)

  // Wait for DOM to update before initializing Monaco
  await nextTick()

  if (props.draftItem.status === DraftStatus.Updated) {
    useMonacoDiff(diffEditorRef, {
      original: gitHubOriginal!,
      modified: modified!,
      language: language.value,
      colorMode: ui.colorMode,
      editorOptions: {
        automaticLayout: true,
        hideUnchangedRegions: {
          enabled: true,
        },
      },
    })
  }
  else if ([DraftStatus.Created, DraftStatus.Deleted].includes(props.draftItem.status)) {
    useMonaco(editorRef, {
      language,
      initialContent: modified! || gitHubOriginal!,
      readOnly: true,
      colorMode: ui.colorMode,
      editorOptions: {
        automaticLayout: true,
      },
    })
  }

  isLoadingContent.value = false
}
</script>

<template>
  <ItemCardReview
    v-model="isOpen"
    :draft-item="draftItem"
  >
    <template #open>
      <div
        class="bg-elevated relative"
        :style="{ height: `${height}px` }"
      >
        <div
          v-if="isLoadingContent"
          class="p-4 flex items-center justify-center h-full"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="w-5 h-5 animate-spin text-muted"
          />
        </div>
        <div
          v-else-if="draftItem.status === DraftStatus.Created || draftItem.status === DraftStatus.Deleted"
          ref="editorRef"
          class="w-full h-full"
        />
        <div
          v-else
          class="relative w-full h-full"
        >
          <AlertMDCFormatting v-if="isAutomaticFormattingDetected" />
          <div
            ref="diffEditorRef"
            class="w-full h-full"
          />
        </div>

        <!-- Resize handle -->
        <div
          class="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize bg-transparent hover:bg-accented transition-colors duration-200 group"
          :class="{ 'bg-accented': isResizing }"
          @mousedown="startResize"
        >
          <div
            class="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-1 w-8 bg-inverted rounded-t opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            :class="{ 'opacity-100': isResizing }"
          />
        </div>
      </div>
    </template>
  </ItemCardReview>
</template>
