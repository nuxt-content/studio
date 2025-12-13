<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem, FormTree } from '../../../types'
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'

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

// Initialize model value
const model = ref(computeValue(props.formItem))

// Sync changes back to parent form
watch(model, (newValue) => {
  form.value = applyValueById(form.value, props.formItem.id, newValue)
})

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

function applyValueById(tree: FormTree, id: string, value: unknown): FormTree {
  const result = { ...tree }
  const paths = id.split('/').filter(Boolean)

  let current: Record<string, unknown> = result
  for (let i = 0; i < paths.length - 1; i++) {
    const key = paths[i]
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  const lastKey = paths[paths.length - 1]
  current[lastKey] = value

  return result
}
</script>

<template>
  <UFormField
    :name="formItem.id"
    :label="label"
    :ui="{
      root: 'w-full mt-2',
      label: 'text-xs font-semibold tracking-tight',
    }"
  >
    <UInput
      :id="formItem.id"
      v-model="model"
      :placeholder="placeholder"
      :type="inputType"
      class="w-full"
    />
  </UFormField>
</template>
