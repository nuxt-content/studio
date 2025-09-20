<script setup lang="ts">
import type { TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { titleCase } from 'scule'
import { COLOR_STATUS_MAP } from '../../../utils/draft'

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const isFolder = computed(() => props.item.type === 'directory')
const name = computed(() => titleCase(props.item.name))

const itemExtensionIcon = computed(() => {
  const ext = props.item.id.split('.').pop()?.toLowerCase() || ''
  return {
    md: 'i-ph-markdown-logo',
    yaml: 'i-fluent-document-yml-20-regular',
    yml: 'i-fluent-document-yml-20-regular',
    json: 'i-lucide-file-json',
  }[ext] || 'i-mdi-file'
})

const statusRingColor = computed(() => props.item.status ? `ring-${COLOR_STATUS_MAP[props.item.status]}-200 hover:ring-${COLOR_STATUS_MAP[props.item.status]}-300 hover:dark:ring-${COLOR_STATUS_MAP[props.item.status]}-700` : 'ring-gray-200 hover:ring-gray-300 hover:dark:ring-gray-700')
</script>

<template>
  <UPageCard
    reverse
    class="cursor-pointer hover:bg-white relative w-full min-w-0"
    :class="statusRingColor"
  >
    <div
      v-if="item.type === 'file'"
      class="relative"
    >
      <Image
        src="https://placehold.co/1920x1080/f9fafc/f9fafc"
        width="426"
        height="240"
        alt="Card placeholder"
        class="z-[-1] rounded-t-lg"
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <UIcon
          :name="itemExtensionIcon"
          class="w-8 h-8 text-gray-400 dark:text-gray-500"
        />
      </div>
      <ItemBadge
        v-if="item.status"
        :status="item.status"
        class="absolute top-2 right-2"
        size="xs"
      />
    </div>

    <template #body>
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1 min-w-0">
            <UIcon
              v-if="isFolder"
              name="i-lucide-folder"
              class="h-4 w-4 shrink-0"
            />
            <UIcon
              v-else-if="name === 'Home'"
              name="i-lucide-house"
              class="h-4 w-4 shrink-0"
            />
            <h3
              class="text-sm font-semibold truncate"
              :class="props.item.status === 'deleted' && 'line-through'"
            >
              {{ name }}
            </h3>
          </div>
          <ItemActionsDropdown :item="item" />
        </div>

        <UTooltip :text="item.routePath">
          <span class="truncate leading-relaxed text-xs text-gray-400 dark:text-gray-500 block w-full">
            {{ item.routePath || item.fsPath }}
          </span>
        </UTooltip>
      </div>
    </template>
  </UPageCard>
</template>
