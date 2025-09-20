<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue'
import { useStudio } from '../composables/useStudio'
// import { MDCEditorAST } from '@farnabaz/mdc-editor'
import { removeReservedKeysFromDocument } from '../utils/content'

const modelValue = defineModel<boolean>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'update:content', content: any): void
}>()

const preview = useStudio()

const loading = ref(false)
const searchQuery = ref('')
const contents = ref<Array<{ id: string, title?: string }>>([])
const content = ref<any>()
const selectedContent = ref<any>()

async function loadContents() {
  loading.value = true
  try {
    contents.value = await preview.host.document.list()
  }
  finally {
    loading.value = false
  }
}

watch(modelValue, (open) => {
  if (open) {
    if (!contents.value.length) {
      loadContents()
    }
  }
})

watch(content, async (value) => {
  preview.draft.upsert(selectedContent.value.id, {
    ...toRaw(value),
    id: selectedContent.value.id,
    extension: selectedContent.value.extension,
    stem: selectedContent.value.stem,
    path: selectedContent.value.path,
    __hash__: selectedContent.value.__hash__,
  })
})

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return contents.value
  return contents.value.filter(item => (item.title || item.id).toLowerCase().includes(q))
})

async function onSelect(id: string) {
  selectedContent.value = await preview.host.document.get(id)
  content.value = {
    ...removeReservedKeysFromDocument(selectedContent.value),
    body: selectedContent.value.body,
  }
}

const items = computed(() => filtered.value.map(item => ({
  id: item.id,
  label: item.title || item.id,
  subtitle: item.id,
  icon: 'i-lucide-file-text',
  onSelect: () => onSelect(item.id),
})))
</script>

<template>
  <UModal
    v-model:open="modelValue"
    :portal="false"
    :ui="{ content: 'w-[90vw] h-[90vh] max-w-none max-h-none', body: '!p-0' }"
  >
    <template #header>
      <UInput
        v-model="searchQuery"
        placeholder="Search contents"
        color="primary"
        icon="i-lucide-search"
      />
    </template>

    <template #body>
      <div class="h-full overflow-hidden flex flex-col">
        <div class="flex-1 overflow-y-auto">
          <div
            v-if="loading"
            class="p-4 text-sm text-neutral-500"
          >
            Loading...
          </div>
          <div v-else>
            <div class="flex gap-2">
              <UNavigationMenu
                orientation="vertical"
                :items="items"
                :ui="{ list: 'px-3 py-3' }"
              >
                <template #item-label="{ item }">
                  <div class="text-left">
                    {{ item.label }}
                  </div>
                  <div class="text-xs text-left">
                    {{ item.subtitle }}
                  </div>
                </template>
              </UNavigationMenu>
              <div>
                <SimpleTextEditor v-model:document="selectedContent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
