<script lang="ts" setup>
import type { FormItem, FormTree } from '../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    required: true,
  },
})

const form = defineModel({ type: Object as PropType<FormTree>, default: () => ({}) })

const childrenCount = computed(() => {
  if (!props.formItem.children) return 0
  return Object.keys(props.formItem.children).length
})
</script>

<template>
  <Collapsible
    v-if="formItem.children"
    :label="formItem.title"
    :default-open="true"
    class="w-full mt-3"
  >
    <template #badge>
      <UBadge
        v-if="childrenCount"
        variant="subtle"
        size="xs"
      >
        {{ $t('studio.form.section.propertyCount', childrenCount) }}
      </UBadge>
    </template>

    <FormPanelSection
      v-for="childKey in Object.keys(formItem.children)"
      :key="formItem.children[childKey].id"
      v-model="form"
      :form-item="formItem.children[childKey]"
    />
  </Collapsible>

  <FormPanelInput
    v-else
    v-model="form"
    :form-item="formItem"
  />
</template>
