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

const isDirectory = computed(() => props.item.type === 'directory')

// ring-(--ui-success)/25 ring-(--ui-info)/25 ring-(--ui-warning)/25 ring-(--ui-error)/25 ring-(--ui-neutral)/25
const statusRingColor = computed(() => props.item.status && props.item.status !== TreeStatus.Opened ? `ring-(--ui-${COLOR_UI_STATUS_MAP[props.item.status]})/25` : '')

const displayInfo = computed(() => {
  if (isDirectory.value) {
    const itemcount = props.item.children?.filter(child => !child.hide).length || 0
    return `${itemcount} ${itemcount === 1 ? 'item' : 'items'}`
  }
  return props.item.routePath || props.item.fsPath
})
</script>

<template>
  <UPageCard
    reverse
    variant="subtle"
    class="cursor-pointer hover:bg-muted relative w-full min-w-0 overflow-hidden"
    :class="statusRingColor"
    :ui="{ container: 'overflow-hidden' }"
  >
    <template #body>
      <UTooltip :text="item.fsPath">
        <div class="flex items-start gap-3">
          <div
            v-if="!isDirectory"
            class="relative shrink-0 w-12 h-12"
          >
            <div class="w-full h-full bg-size-[24px_24px] bg-position-[0_0,0_12px,12px_-12px,-12px_0] rounded-lg overflow-hidden bg-elevated">
              <slot name="thumbnail" />
            </div>
          </div>

          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <div class="flex items-center gap-1 min-w-0">
              <slot name="name-prefix" />
              <h3
                class="flex items-center gap-1 text-sm font-semibold truncate text-default overflow-hidden"
                :class="props.item.status === 'deleted' && 'line-through'"
              >
                {{ name }}
                <ItemBadge
                  v-if="item.status && item.status !== TreeStatus.Opened"
                  :status="item.status"
                  size="xs"
                />
              </h3>
            </div>

            <div class="truncate leading-relaxed text-xs text-dimmed">
              {{ displayInfo }}
            </div>
          </div>

          <div class="flex items-end">
            <ItemActionsDropdown :item="item" />
          </div>
        </div>
      </UTooltip>
    </template>
  </UPageCard>
</template>
