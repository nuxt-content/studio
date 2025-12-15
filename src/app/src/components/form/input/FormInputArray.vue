<script setup lang="ts">
import { titleCase } from 'scule'
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel({ type: Array as PropType<unknown[]>, default: () => [] })

const itemsType = computed(() => props.formItem?.type)
const itemsLabel = computed(() => titleCase(props.formItem?.title))

const activeIndex = ref<number | null>(null)
const stringEditingValue = ref('')

// Computed items for display
const items = computed(() => {
  return (model.value || []).map((item, index) => ({
    key: index,
    index,
    value: item,
    label: `${itemsLabel.value} ${index + 1}`,
  }))
})

function addItem() {
  const newItem = itemsType.value === 'object' ? {} : ''

  model.value = [...(model.value || []), newItem]

  // Auto-focus new string item
  if (itemsType.value === 'string') {
    nextTick(() => {
      startStringEditing(model.value.length - 1)
    })
  }
}

function deleteItem(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
  if (activeIndex.value === index) {
    activeIndex.value = null
  }
}

function startStringEditing(index: number, value?: unknown) {
  activeIndex.value = index
  stringEditingValue.value = String(value || '')
}

function saveStringEditing() {
  if (activeIndex.value !== null) {
    model.value = model.value.map((item, i) =>
      i === activeIndex.value ? stringEditingValue.value : item,
    )
  }
  activeIndex.value = null
  stringEditingValue.value = ''
}

function updateObjectItem(index: number, value: Record<string, unknown>) {
  model.value = model.value.map((item, i) => i === index ? value : item)
}

function toggleExpand(index: number) {
  activeIndex.value = activeIndex.value === index ? null : index
}
</script>

<template>
  <div class="space-y-2">
    <!-- Array of Objects -->
    <template v-if="itemsType === 'object'">
      <div
        v-for="item in items"
        :key="item.index"
        class="group/item rounded-lg border border-default overflow-hidden"
      >
        <button
          type="button"
          class="flex items-center justify-between w-full px-3 py-2 text-left bg-elevated hover:bg-accented transition-colors"
          @click="toggleExpand(item.index)"
        >
          <div class="flex items-center gap-2">
            <div class="flex items-center justify-center size-4 rounded bg-muted transition-colors">
              <UIcon
                name="i-lucide-chevron-right"
                class="size-2.5 text-muted transition-transform duration-200"
                :class="{ 'rotate-90': activeIndex === item.index }"
              />
            </div>
            <span class="text-xs font-medium text-highlighted tracking-tight">
              {{ item.label }}
            </span>
          </div>

          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-trash-2"
            class="opacity-0 group-hover/item:opacity-100 transition-opacity"
            aria-label="Delete item"
            @click.stop="deleteItem(item.index)"
          />
        </button>

        <div
          v-if="activeIndex === item.index"
          class="px-3 py-3 border-t border-default bg-default"
        >
          <FormInputObject
            :model-value="item.value"
            :children="formItem.children"
            @update:model-value="(v: Record<string, unknown>) => updateObjectItem(item.index, v)"
          />
        </div>
      </div>
    </template>

    <!-- Array of Strings -->
    <template v-else-if="itemsType === 'string'">
      <div class="flex flex-wrap items-center gap-1.5">
        <UBadge
          v-for="item in items"
          :key="item.label"
          variant="subtle"
          color="neutral"
          size="md"
          class="group/badge flex items-center gap-3 px-2 py-1 min-w-0"
        >
          <UInput
            v-if="activeIndex === item.index"
            v-model="stringEditingValue"
            size="xs"
            variant="none"
            class="w-24 -my-1"
            autofocus
            @keypress.enter="saveStringEditing"
            @blur="saveStringEditing"
          />
          <span
            v-else
            class="truncate max-w-32 text-xs"
          >
            {{ item.value }}
          </span>

          <div class="flex items-center shrink-0">
            <UButton
              variant="ghost"
              color="neutral"
              size="2xs"
              :icon="activeIndex === item.index ? 'i-lucide-check' : 'i-lucide-pencil'"
              :class="{ 'font-medium': activeIndex === item.index }"
              aria-label="Edit item"
              @click.stop="activeIndex === item.index ? saveStringEditing : startStringEditing(item.index, item.value)"
            />
            <UButton
              variant="ghost"
              color="neutral"
              size="2xs"
              :icon="activeIndex === item.index ? 'i-lucide-x' : 'i-lucide-trash'"
              aria-label="Delete item"
              @click.stop="deleteItem(item.index)"
            />
          </div>
        </UBadge>
      </div>
    </template>

    <!-- Unsupported type fallback -->
    <div
      v-else
      class="flex items-center justify-center py-2 rounded-lg border border-dashed border-muted"
    >
      <p class="text-xs text-muted">
        Array type {{ itemsType || '' }} not supported
      </p>
    </div>

    <!-- Add button -->
    <div
      v-if="itemsType"
      class="flex"
      :class="{ 'justify-end': items.length > 0 }"
    >
      <UButton
        variant="link"
        color="neutral"
        size="xs"
        icon="i-lucide-plus"
        @click="addItem"
      >
        Add {{ itemsLabel.toLowerCase() }}
      </UButton>
    </div>
  </div>
</template>
