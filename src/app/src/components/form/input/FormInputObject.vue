<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormTree } from '../../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'

const props = defineProps({
  children: {
    type: Object as PropType<FormTree>,
    default: null,
  },
})

const model = defineModel({
  type: Object as PropType<Record<string, unknown>>,
  default: (): Record<string, unknown> => ({}),
})

const entries = computed(() => {
  if (!props.children) return []

  return Object.entries(props.children).map(([key, child]) => ({
    key,
    label: titleCase(child.title || key),
    value: model.value?.[key] ?? child.default ?? '',
    type: child.type === 'number' ? 'number' : 'text',
    placeholder: child.type === 'number' ? '0' : `Enter ${(child.title || key).toLowerCase()}...`,
  }))
})

function updateValue(key: string, value: string | number) {
  model.value = { ...model.value, [key]: value }
}
</script>

<template>
  <div class="space-y-2">
    <template v-if="entries.length">
      <UFormField
        v-for="entry in entries"
        :key="entry.key"
        :name="entry.key"
        :label="entry.label"
        :ui="{
          label: 'text-xs font-medium tracking-tight',
        }"
      >
        <UInput
          v-model="(entry.value as string | number)"
          :placeholder="entry.placeholder"
          :type="entry.type"
          class="w-full"
          @update:model-value="updateValue(entry.key, $event)"
        />
      </UFormField>
    </template>

    <div
      v-else
      class="flex flex-col items-center justify-center py-6 rounded-md border border-dashed border-muted"
    >
      <UIcon
        name="i-lucide-box"
        class="size-5 text-muted mb-2"
      />
      <p class="text-xs text-muted">
        {{ $t('studio.form.object.noProperties') }}
      </p>
    </div>
  </div>
</template>
