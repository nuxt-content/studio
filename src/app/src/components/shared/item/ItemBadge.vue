<script setup lang="ts">
import { COLOR_UI_STATUS_MAP } from '../../../utils/tree'
import type { TreeStatus } from '../../../types'
import type { PropType } from 'vue'

defineProps({
  status: {
    type: String as PropType<TreeStatus>,
    required: true,
  },
})
</script>

<template>
  <UBadge
    :color="COLOR_UI_STATUS_MAP[status]"
    :label="status"
    variant="soft"
    size="sm"
  />
</template>
