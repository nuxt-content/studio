<script lang="ts" setup>
import type { FormItem, FormTree } from '../../../types'
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
  <UCollapsible
    v-if="formItem.children"
    class="w-full group/collapsible"
    :default-open="true"
  >
    <div
      class="flex items-center gap-2 w-full py-2"
    >
      <div class="flex items-center justify-center size-4 rounded bg-gray-100 dark:bg-gray-800 transition-colors duration-200 group-hover/collapsible:bg-gray-200 dark:group-hover/collapsible:bg-gray-700">
        <UIcon
          name="i-lucide-chevron-right"
          class="size-2.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
        />
      </div>
      <div class="flex gap-2 items-center">
        <span class="font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          {{ formItem.title }}
        </span>
        <UBadge
          v-if="childrenCount"
          variant="soft"
          size="xs"
          class="text-muted"
        >
          {{ childrenCount }} child{{ childrenCount === 1 ? '' : 'ren' }}
        </UBadge>
      </div>
    </div>

    <template #content>
      <div class="mt-1 ml-5 pl-4 border-l border-gray-200 dark:border-gray-700/50 space-y-0.5">
        <FormPanelSection
          v-for="childKey in Object.keys(formItem.children)"
          :key="formItem.children[childKey].id"
          v-model="form"
          :form-item="formItem.children[childKey]"
        />
      </div>
    </template>
  </UCollapsible>

  <FormPanelInput
    v-else
    v-model="form"
    :form-item="formItem"
  />
</template>
