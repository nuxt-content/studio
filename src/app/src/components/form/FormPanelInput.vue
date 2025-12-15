<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem, FormTree } from '../../types'
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { applyValueById } from '../../utils/form'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    required: true,
  },
})

const form = defineModel({ type: Object as PropType<FormTree>, default: () => ({}) })

const label = computed(() => titleCase(props.formItem.title))

const placeholder = computed(() => {
  switch (props.formItem.type) {
    case 'string':
      return `Enter ${props.formItem.title.toLowerCase()}...`
    case 'number':
      return '0'
    default:
      return ''
  }
})

const inputType = computed(() => {
  switch (props.formItem.type) {
    case 'number':
      return 'number'
    default:
      return 'text'
  }
})

const isArrayType = computed(() => props.formItem.type === 'array')

// Initialize model value
const model = ref(computeValue(props.formItem))

// Sync changes back to parent form
watch(model, (newValue) => {
  if (newValue === props.formItem.value) {
    return
  }

  form.value = applyValueById(form.value, props.formItem.id, newValue)
}, { deep: true })

// Watch for external form item changes
watch(() => props.formItem, (newFormItem) => {
  model.value = computeValue(newFormItem)
}, { deep: true })

function computeValue(formItem: FormItem): unknown {
  if (formItem.value !== undefined) {
    return formItem.value
  }

  switch (formItem.type) {
    case 'string':
    case 'date':
    case 'icon':
    case 'media':
    case 'file':
      return ''
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'array':
      return []
    case 'object':
      return {}
    default:
      return null
  }
}
</script>

<template>
  <UFormField
    :name="formItem.id"
    :label="label"
    :ui="{
      root: 'w-full mt-2',
      label: 'text-xs font-medium tracking-tight',
    }"
  >
    <FormInputArray
      v-if="isArrayType"
      v-model="(model as unknown[])"
      :form-item="formItem.arrayItemForm"
    />
    <UInput
      v-else
      :id="formItem.id"
      v-model="(model as string | number)"
      :placeholder="placeholder"
      :type="inputType"
      class="w-full"
    />
  </UFormField>
</template>
