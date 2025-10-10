<script setup lang="ts">
import { type TreeItem, TreeStatus } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { titleCase } from 'scule'
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const name = computed(() => titleCase(props.item.name))

const statusRingColor = computed(() => props.item.status && props.item.status !== TreeStatus.Opened ? `ring-(--ui-${COLOR_UI_STATUS_MAP[props.item.status]})` : '')
</script>

<template>
  <UPageCard
    reverse
    class="cursor-pointer hover:bg-muted relative w-full min-w-0 overflow-hidden"
    :class="statusRingColor"
    :ui="{ container: 'overflow-hidden' }"
  >
    <template #body>
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1 min-w-0">
            <UIcon
              name="i-lucide-folder"
              class="h-4 w-4 shrink-0 text-muted"
            />
            <h3
              class="text-sm font-semibold truncate text-default overflow-hidden"
              :class="props.item.status === 'deleted' && 'line-through'"
            >
              {{ name }}
            </h3>
          </div>
          <ItemActionsDropdown :item="item" />
        </div>

        <div class="flex items-center gap-2 min-w-0">
          <UTooltip :text="item.routePath">
            <div class="truncate leading-relaxed text-xs text-dimmed flex-1">
              {{ item.routePath || item.fsPath }}
            </div>
          </UTooltip>
          <ItemBadge
            v-if="item.status && item.status !== TreeStatus.Opened"
            :status="item.status"
          />
        </div>
      </div>
    </template>
  </UPageCard>
</template>
