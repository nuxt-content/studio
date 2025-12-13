<script setup lang="ts">
import { computed } from 'vue'
import type { FormTree } from '../../../types'
import type { PropType } from 'vue'
import type { Draft07 } from '@nuxt/content'
import { buildFormTreeFromSchema, applyValuesToFormTree } from '../../../utils/form'

const props = defineProps({
  collectionName: {
    type: String,
    required: true,
  },
  schema: {
    type: Object as PropType<Draft07>,
    required: true,
  },
})

const data = defineModel<Record<string, unknown>>({ required: true })

console.log('data', data.value)

const formTree = computed<FormTree>(() => {
  return buildFormTreeFromSchema(props.collectionName, props.schema)
})

const formTreeWithValues = computed({
  get: () => {
    if (!data.value || !formTree.value) {
      return null
    }

    return applyValuesToFormTree(formTree.value, { [props.collectionName]: data.value })
  },
  set: (newFormTree) => {
    console.log('newFormTree', newFormTree)
  },
})

// const jsonString = computed({
//   get: () => JSON.stringify(model.value, null, 2),
//   set: (value: string) => {
//     try {
//       model.value = JSON.parse(value)
//     }
//     catch {
//       // Invalid JSON, don't update
//     }
//   },
// })
</script>

<template>
  <FormPanelSection
    v-for="formItem in formTree[collectionName].children"
    :key="formItem.id"
    v-model="formTreeWithValues"
    :form-item="formItem"
  />
</template>
