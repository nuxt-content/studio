<script setup lang="ts">
import type { DraftItem } from '../types'
import type { PropType } from 'vue'
import { ref, computed } from 'vue'
import { DraftStatus } from '../types'
import { getFileIcon } from '../utils/file'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const isOpen = ref(false)

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
        label: 'Modified',
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
const filePath = computed(() => props.draftItem.fsPath)
</script>

<template>
  <UCard
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <div
      class="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <UIcon
          :name="fileIcon"
          class="w-5 h-5 flex-shrink-0 text-muted"
        />

        <div class="flex flex-col gap-1 flex-1 min-w-0">
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
          <span class="text-xs text-dimmed truncate">
            {{ filePath }}
          </span>
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
        class="p-4 bg-success/5"
      >
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-sm text-success mb-2">
            <UIcon
              name="i-lucide-plus"
              class="w-4 h-4"
            />
            <span>New file</span>
          </div>
          <div class="text-xs font-mono bg-elevated p-3 rounded-lg overflow-auto max-h-64">
            <pre class="text-default whitespace-pre-wrap break-words">{{ draftItem.modified!.raw || 'Empty file' }}</pre>
          </div>
        </div>
      </div>

      <div
        v-else-if="draftItem.status === DraftStatus.Updated"
        class="p-4"
      >
        <div class="flex flex-col gap-3">
          <div class="text-xs font-mono bg-elevated p-3 rounded-lg overflow-auto max-h-96">
            <div class="flex flex-col gap-1">
              <div class="text-dimmed mb-2">
                Modified content:
              </div>
              <pre class="text-default whitespace-pre-wrap break-words">{{ draftItem.modified!.raw || 'No preview available' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
