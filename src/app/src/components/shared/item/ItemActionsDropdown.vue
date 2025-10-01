<script setup lang="ts">
import { computeActionItems } from '../../../utils/context'
import { computed, type PropType } from 'vue'
import type { TreeItem } from '../../../types'
import { useStudio } from '../../../composables/useStudio'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.js'

const { context } = useStudio()

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const actions = computed<DropdownMenuItem[]>(() => {
  return computeActionItems(context.itemActions.value, props.item).map(action => ({
    ...action,
    onSelect: () => action.handler!(props.item),
  }))
})
</script>

<template>
  <UDropdownMenu
    :items="actions"
    :content="{ side: 'bottom' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-ph-dots-three-vertical"
      aria-label="Open actions"
      square
      size="sm"
      class="cursor-pointer"
      @click="$event.stopPropagation()"
    />
  </UDropdownMenu>
</template>
