<script setup lang="ts">
import type { DraftItem } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { DraftStatus } from '../../../types'
import { getFileIcon } from '../../../utils/file'
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const isOpen = defineModel<boolean>({ default: false })

const fileIcon = computed(() => getFileIcon(props.draftItem.fsPath))
const fileName = computed(() => props.draftItem.fsPath.split('/').pop() || props.draftItem.fsPath)
const filePath = computed(() => props.draftItem.fsPath)
const statusColor = computed(() => COLOR_UI_STATUS_MAP[props.draftItem.status as never])

const originalPath = computed(() => {
  if (props.draftItem.status !== DraftStatus.Created || !props.draftItem.original) {
    return null
  }

  return props.draftItem.original.fsPath
})

function toggleOpen() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <UCard
    class="overflow-hidden"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <div
      class="flex items-center justify-between gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
      @click="toggleOpen"
    >
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <UIcon
          :name="fileIcon"
          class="w-5 h-5 shrink-0 text-muted"
        />

        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate">
              {{ fileName }}
            </span>
            <UBadge
              :label="draftItem.status"
              :color="statusColor"
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
                class="w-3 h-3 text-dimmed shrink-0"
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
      <slot name="open" />
    </div>
  </UCard>
</template>
