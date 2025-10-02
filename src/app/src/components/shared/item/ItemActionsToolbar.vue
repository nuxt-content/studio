<script setup lang="ts">
import { computed } from 'vue'
import { computeActionItems } from '../../../utils/context'
import { useStudio } from '../../../composables/useStudio'

const { context } = useStudio()

const item = computed(() => context.activeTree.value.currentItem.value)
const actions = computed(() => {
  return computeActionItems(context.itemActions.value, item.value)
})
</script>

<template>
  <div class="flex items-center -mr-1">
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
        @click="action.handler!(item)"
      />
    </UTooltip>
  </div>
</template>
