<script setup lang="ts">
import { type TreeItem, TreeStatus } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { titleCase } from 'scule'
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'
import { getFileIcon, isMediaFile } from '../../../utils/file'

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const isMedia = computed(() => isMediaFile(props.item.fsPath))
const name = computed(() => titleCase(props.item.name))
const itemExtensionIcon = computed(() => getFileIcon(props.item.fsPath))
const imageSrc = computed(() => isMedia.value ? props.item.routePath : '')

// ring-(--ui-success) ring-(--ui-info) ring-(--ui-warning) ring-(--ui-error) ring-(--ui-neutral)
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
      <div class="flex items-start gap-3">
        <div class="relative flex-shrink-0 w-12 h-12">
          <div class="w-full h-full bg-default bg-[linear-gradient(45deg,#e6e9ea_25%,transparent_0),linear-gradient(-45deg,#e6e9ea_25%,transparent_0),linear-gradient(45deg,transparent_75%,#e6e9ea_0),linear-gradient(-45deg,transparent_75%,#e6e9ea_0)] bg-size-[24px_24px] bg-position-[0_0,0_12px,12px_-12px,-12px_0] rounded-lg overflow-hidden">
            <Image
              v-if="imageSrc"
              :src="imageSrc"
              width="96"
              height="96"
              alt="File preview"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-elevated flex items-center justify-center"
            >
              <UIcon
                :name="itemExtensionIcon"
                class="w-6 h-6 text-muted"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <div class="flex items-center gap-1 min-w-0">
            <UIcon
              v-if="name === 'Home'"
              name="i-lucide-house"
              class="h-4 w-4 shrink-0 text-muted"
            />
            <h3
              class="text-sm font-semibold truncate text-default overflow-hidden"
              :class="props.item.status === 'deleted' && 'line-through'"
            >
              {{ name }}
            </h3>
          </div>

          <UTooltip :text="item.routePath">
            <div class="truncate leading-relaxed text-xs text-dimmed">
              {{ item.routePath || item.fsPath }}
            </div>
          </UTooltip>
        </div>

        <div class="flex-shrink-0 flex flex-col gap-1 items-end">
          <ItemActionsDropdown :item="item" />
          <ItemBadge
            v-if="item.status && item.status !== TreeStatus.Opened"
            :status="item.status"
          />
        </div>
      </div>
    </template>
  </UPageCard>
</template>
