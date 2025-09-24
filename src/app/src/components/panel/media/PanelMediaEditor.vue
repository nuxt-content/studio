<script setup lang="ts">
import type { PropType } from 'vue'
import type { DraftItem } from '../../../types'

defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
})
</script>

<template>
  <div class="bg-neutral-800">
    <img :src="draftItem.modified?.path">
  </div>
</template>
