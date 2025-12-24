<script setup lang="ts">
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string | number>({ default: '' })

const hasOptions = computed(() => props.formItem?.options && props.formItem.options.length > 0)

const selectItems = computed(() => {
  if (!props.formItem?.options) return []
  return props.formItem.options.map(option => ({
    label: option,
    value: option,
  }))
})
</script>

<template>
  <USelect
    v-if="hasOptions"
    v-model="(model as string)"
    :items="selectItems"
    :placeholder="$t('studio.form.text.selectPlaceholder')"
    size="xs"
    class="w-full"
  />
  <UInput
    v-else
    v-model="model"
    :placeholder="$t('studio.form.text.placeholder')"
    size="xs"
    class="w-full"
  />
</template>
