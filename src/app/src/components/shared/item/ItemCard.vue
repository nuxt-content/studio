<script setup lang="ts">
import { type TreeItem, TreeStatus } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { titleCase } from 'scule'
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const isFolder = computed(() => props.item.type === 'directory')
const name = computed(() => titleCase(props.item.name))

const itemExtensionIcon = computed(() => {
  if (props.item.preview) {
    return ''
  }
  const ext = props.item.id.split('.').pop()?.toLowerCase() || ''
  return {
    md: 'i-ph-markdown-logo',
    yaml: 'i-fluent-document-yml-20-regular',
    yml: 'i-fluent-document-yml-20-regular',
    json: 'i-lucide-file-json',
  }[ext] || 'i-mdi-file'
})

const imageSrc = computed(() => {
  if (props.item.preview) {
    return props.item.preview
  }
  return ''
})

// ring-(--ui-success) ring-(--ui-info) ring-(--ui-warning) ring-(--ui-error) ring-(--ui-neutral)
const statusRingColor = computed(() => props.item.status ? `ring-(--ui-${COLOR_UI_STATUS_MAP[props.item.status]})` : 'ring-(--ui-border) hover:ring-(--ui-border-accented)')
</script>

<template>
  <UPageCard
    reverse
    class="cursor-pointer hover:bg-muted relative w-full min-w-0 overflow-hidden"
    :class="statusRingColor"
  >
    <div
      v-if="item.type === 'file'"
      class="relative"
    >
      <div class="bg-default bg-[linear-gradient(45deg,#e6e9ea_25%,transparent_0),linear-gradient(-45deg,#e6e9ea_25%,transparent_0),linear-gradient(45deg,transparent_75%,#e6e9ea_0),linear-gradient(-45deg,transparent_75%,#e6e9ea_0)] bg-size-[24px_24px] bg-position-[0_0,0_12px,12px_-12px,-12px_0]">
        <Image
          v-if="imageSrc"
          :src="imageSrc"
          width="426"
          height="240"
          alt="Card placeholder"
          class="z-[-1] rounded-t-lg aspect-video object-cover"
        />
        <div
          v-else
          class="z-[-1] aspect-video bg-elevated"
        />
        <div
          v-if="itemExtensionIcon"
          class="absolute inset-0 flex items-center justify-center"
        >
          <UIcon
            :name="itemExtensionIcon"
            class="w-8 h-8 text-muted"
          />
        </div>
      </div>
      <ItemBadge
        v-if="item.status && item.status !== TreeStatus.Opened"
        :status="item.status"
        class="absolute top-2 right-2"
      />
    </div>

    <template #body>
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1 min-w-0">
            <UIcon
              v-if="isFolder"
              name="i-lucide-folder"
              class="h-4 w-4 shrink-0 text-muted"
            />
            <UIcon
              v-else-if="name === 'Home'"
              name="i-lucide-house"
              class="h-4 w-4 shrink-0 text-muted"
            />
            <h3
              class="text-sm font-semibold truncate text-default"
              :class="props.item.status === 'deleted' && 'line-through'"
            >
              {{ name }}
            </h3>
          </div>
          <ItemActionsDropdown :item="item" />
        </div>

        <UTooltip :text="item.routePath">
          <span class="truncate leading-relaxed text-xs text-dimmed block w-full">
            {{ item.routePath || item.fsPath }}
          </span>
        </UTooltip>
      </div>
    </template>
  </UPageCard>
</template>
