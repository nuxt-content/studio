<script setup lang="ts">
import { type DraftItem, StudioFeature } from '../../../types'
import type { PropType } from 'vue'
import { useStudio } from '../../../composables/useStudio'

defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})

const { context } = useStudio()
</script>

<template>
  <PanelContentEditor
    v-if="context.feature.value === StudioFeature.Content"
    :draft-item="draftItem"
  />
  <PanelMediaEditor
    v-else
    :draft-item="draftItem"
  />
</template>
