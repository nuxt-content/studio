<script setup lang="ts">
import type { DraftItem, DatabaseItem, DatabasePageItem } from '../types'
import type { PropType } from 'vue'
import { ref, computed, watch, nextTick } from 'vue'
import { DraftStatus, ContentFileExtension, TreeRootId } from '../types'
import { getFileIcon, getFileExtension } from '../utils/file'
import { generateContentFromDocument } from '../utils/content'
import { useMonacoDiff } from '../composables/useMonacoDiff'
import { useMonaco } from '../composables/useMonaco'
import { useStudio } from '../composables/useStudio'

const { ui, host } = useStudio()

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const diffEditorRef = ref<HTMLDivElement>()
const editorRef = ref<HTMLDivElement>()

const isOpen = ref(false)
const isLoadingContent = ref(false)

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

watch(isOpen, async () => {
  if (isOpen.value && !isLoadingContent.value) {
    isLoadingContent.value = true

    const original = props.draftItem.original ? await generateContentFromDocument(props.draftItem.original as DatabaseItem) : null
    const modified = props.draftItem.modified ? await generateContentFromDocument(props.draftItem.modified as DatabasePageItem) : null

    // Wait for DOM to update before initializing Monaco
    await nextTick()

    if (props.draftItem.status === DraftStatus.Updated) {
      useMonacoDiff(diffEditorRef, {
        original: original!,
        modified: modified!,
        language: language.value,
        colorMode: ui.colorMode.value,
      })
    }
    else if (props.draftItem.status === DraftStatus.Created) {
      useMonaco(editorRef, {
        language,
        initialContent: modified!,
        readOnly: true,
        colorMode: ui.colorMode,
      })
    }

    isLoadingContent.value = false
  }
})

const statusConfig = computed(() => {
  switch (props.draftItem.status) {
    case DraftStatus.Created:
      return {
        color: 'success',
        icon: 'i-lucide-plus-circle',
        label: 'Created',
      }
    case DraftStatus.Updated:
      return {
        color: 'warning',
        icon: 'i-lucide-file-edit',
        label: 'Updated',
      }
    case DraftStatus.Deleted:
      return {
        color: 'error',
        icon: 'i-lucide-trash-2',
        label: 'Deleted',
      }
    default:
      return {
        color: 'neutral',
        icon: 'i-lucide-file',
        label: 'Unchanged',
      }
  }
})

const fileIcon = computed(() => getFileIcon(props.draftItem.fsPath))
const fileName = computed(() => props.draftItem.fsPath.split('/').pop() || props.draftItem.fsPath)

const originalPath = computed(() => {
  if (props.draftItem.status !== DraftStatus.Created || !props.draftItem.original) {
    return null
  }

  const isMedia = props.draftItem.original.id.startsWith(TreeRootId.Media)
  const hostApi = isMedia ? host.media : host.document
  return hostApi.getFileSystemPath(props.draftItem.original.id)
})

const filePath = computed(() => props.draftItem.fsPath)
</script>

<template>
  <UCard
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <div
      class="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <UIcon
          :name="fileIcon"
          class="w-5 h-5 flex-shrink-0 text-muted"
        />

        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate">
              {{ fileName }}
            </span>
            <UBadge
              :label="statusConfig.label"
              :color="statusConfig.color"
              variant="soft"
              size="xs"
            />
          </div>

          <div class="flex items-center gap-2 truncate text-xs">
            <div
              v-if="originalPath"
              class="flex items-center gap-2"
            >
              <span class="text-dimmed font-medium">{{ originalPath }}</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="w-3 h-3 text-dimmed flex-shrink-0"
              />
            </div>
            <span class="text-muted italic">{{ filePath }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UIcon
          :name="isOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="w-5 h-5 text-muted transition-transform"
        />
      </div>
    </div>

    <div
      v-if="isOpen"
      class="border-t border-default"
    >
      <div
        v-if="draftItem.status === DraftStatus.Deleted"
        class="p-4 bg-error/5"
      >
        <div class="flex items-center gap-2 text-sm text-error">
          <UIcon
            name="i-lucide-alert-triangle"
            class="w-4 h-4"
          />
          <span>This file will be deleted</span>
        </div>
      </div>

      <div
        v-else-if="draftItem.status === DraftStatus.Created"
        class="bg-elevated"
      >
        <div
          v-if="isLoadingContent"
          class="p-4 flex items-center justify-center h-[300px]"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="w-5 h-5 animate-spin text-muted"
          />
        </div>
        <div
          v-else
          ref="editorRef"
          class="w-full h-[300px]"
        />
      </div>

      <div
        v-else-if="draftItem.status === DraftStatus.Updated"
        class="bg-elevated"
      >
        <div
          v-if="isLoadingContent"
          class="p-4 flex items-center justify-center h-[300px]"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="w-5 h-5 animate-spin text-muted"
          />
        </div>
        <div
          v-else
          ref="diffEditorRef"
          class="w-full h-[300px]"
        />
      </div>
    </div>
  </UCard>
</template>
