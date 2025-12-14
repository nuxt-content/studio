<script setup lang="ts">
import { computed } from 'vue'
import type { FormTree } from '../../../types'
import type { PropType } from 'vue'
import type { Draft07 } from '@nuxt/content'
import { buildFormTreeFromSchema, applyValuesToFormTree, getUpdatedTreeItem } from '../../../utils/form'
import { applyValueByPath } from '../../../utils/object'

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

const model = defineModel<Record<string, unknown>>({ required: true })

const formTree = computed<FormTree>(() => {
  return buildFormTreeFromSchema(props.collectionName, props.schema)
})

const formTreeWithValues = computed({
  get: () => {
    if (!model.value || !formTree.value) {
      return null
    }

    return applyValuesToFormTree(formTree.value, { [props.collectionName]: model.value })
  },
  set: (newFormTree) => {
    const updatedItem = getUpdatedTreeItem(formTreeWithValues.value!, newFormTree!)
    if (!updatedItem) {
      return
    }

    // Strip the collection name from the id ("#authors/title" → "title"
    const pathSegments = updatedItem.id.split('/')
    pathSegments.shift()
    const jsonContentCopy = JSON.parse(JSON.stringify(model.value))
    model.value = applyValueByPath(jsonContentCopy, pathSegments.join('/'), updatedItem.value)
  },
})
</script>

<template>
  <template v-if="formTreeWithValues">
    <FormPanelSection
      v-for="formItem in formTreeWithValues[collectionName].children"
      :key="formItem.id"
      v-model="formTreeWithValues"
      :form-item="formItem"
    />
  </template>
</template>
