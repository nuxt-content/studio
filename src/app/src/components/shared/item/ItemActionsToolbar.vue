<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { TreeItem } from '../../../types'
import { computeActionItems } from '../../../utils/context'
import { useStudio } from '../../../composables/useStudio'

const { context } = useStudio()

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const actions = computed(() => {
  return computeActionItems(context.itemActions.value, props.item)
})
</script>

<template>
  <div class="flex items-center gap-1">
    <UTooltip
      v-for="action in actions"
      :key="action.id"
      :text="action.tooltip"
    >
      <UButton
        :key="action.id"
        :icon="action.icon"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="action.handler!(props.item.id)"
      />
    </UTooltip>
  </div>
</template>
