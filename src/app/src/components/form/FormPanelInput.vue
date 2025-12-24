<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem, FormTree, FormInputsTypes } from '../../types'
import type { Component, PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { applyValueById } from '../../utils/form'
import FormInputArray from './input/FormInputArray.vue'
import InputBoolean from './input/InputBoolean.vue'
import InputDate from './input/InputDate.vue'
import InputIcon from './input/InputIcon.vue'
import InputMedia from './input/InputMedia.vue'
import InputNumber from './input/InputNumber.vue'
import InputText from './input/InputText.vue'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    required: true,
  },
})

const form = defineModel({ type: Object as PropType<FormTree>, default: () => ({}) })

const label = computed(() => titleCase(props.formItem.title))

const typeComponentMap: Partial<Record<FormInputsTypes, Component>> = {
  array: FormInputArray,
  boolean: InputBoolean,
  date: InputDate,
  icon: InputIcon,
  media: InputMedia,
  number: InputNumber,
  string: InputText,
}

const inputComponentName = computed(() => typeComponentMap[props.formItem.type] ?? InputText)

const inputFormItem = computed(() => {
  return props.formItem.type === 'array' ? props.formItem.arrayItemForm : props.formItem
})

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
  const value = formItem.value

  switch (formItem.type) {
    case 'string':
    case 'date':
    case 'icon':
    case 'media':
    case 'file':
      return typeof value === 'string' ? value : ''
    case 'boolean':
      return typeof value === 'boolean' ? value : false
    case 'number':
      return typeof value === 'number' ? value : 0
    case 'array':
      return Array.isArray(value) ? value : []
    case 'object':
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    default:
      return value ?? null
  }
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
    <component
      :is="inputComponentName"
      v-model="model"
      :form-item="inputFormItem"
    />
  </UFormField>
</template>
