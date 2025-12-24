<script setup lang="ts">
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'

defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<number>({ default: 0 })
</script>

<template>
  <UInput
    v-model="model"
    type="number"
    :placeholder="$t('studio.form.number.placeholder')"
    size="xs"
    class="w-full"
  />
</template>
