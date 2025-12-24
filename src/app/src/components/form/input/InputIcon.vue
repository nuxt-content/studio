<script setup lang="ts">
import type { FormItem } from '../../../types'
import type { PropType } from 'vue'
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string>({ default: '' })

const search = ref('')
const icons = ref<string[]>([])
const isLoading = ref(false)
const popoverOpen = ref(false)

// Get allowed libraries from form item options (iconLibraries from schema)
const iconLibraries = computed(() => {
  return props.formItem?.options || 'all'
})

// Fetch icons from Iconify API
async function fetchIcons(query: string) {
  if (!query || query.length < 2) {
    icons.value = []
    return
  }

  isLoading.value = true
  try {
    const prefixes = iconLibraries.value === 'all' ? '' : iconLibraries.value.join(',')
    const response = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=30` + (prefixes ? `&prefixes=${prefixes}` : ''),
    )
    const data = await response.json()
    icons.value = data.icons || []
  }
  catch {
    icons.value = []
  }
  finally {
    isLoading.value = false
  }
}

const debouncedFetch = useDebounceFn(fetchIcons, 300)

watch(search, (value) => {
  debouncedFetch(value)
})

function selectIcon(icon: string) {
  model.value = `i-${icon.replace(':', '-')}`
  popoverOpen.value = false
  search.value = ''
  icons.value = []
}
</script>

<template>
  <UInput
    v-model="model"
    placeholder="i-lucide-icon"
    size="xs"
    class="w-full"
  >
    <template #trailing>
      <UPopover v-model:open="popoverOpen">
        <UButton
          size="xs"
          color="neutral"
          variant="none"
          icon="i-lucide-search"
          class="cursor-pointer"
        />

        <template #content>
          <div class="p-3 w-72">
            <UInput
              v-model="search"
              placeholder="Search icons..."
              size="xs"
              icon="i-lucide-search"
              autofocus
              class="mb-3 w-full"
            />

            <div
              v-if="isLoading"
              class="flex items-center justify-center py-4"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="size-5 animate-spin text-muted"
              />
            </div>

            <div
              v-else-if="icons.length > 0"
              class="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto"
            >
              <UTooltip
                v-for="icon in icons"
                :key="icon"
                :text="icon"
              >
                <button
                  type="button"
                  class="flex items-center justify-center size-8 rounded-md bg-muted hover:bg-accented transition-colors"
                  @click="selectIcon(icon)"
                >
                  <UIcon
                    :name="`i-${icon.replace(':', '-')}`"
                    class="size-4"
                  />
                </button>
              </UTooltip>
            </div>

            <p
              v-else-if="search.length >= 2"
              class="text-xs text-muted text-center py-4"
            >
              No icons found
            </p>

            <p
              v-else
              class="text-xs text-muted text-center py-4"
            >
              Type at least 2 characters to search
            </p>

            <p class="text-xs text-dimmed mt-2">
              Libraries: {{ iconLibraries === 'all' ? 'All' : iconLibraries.join(', ') }}
            </p>
          </div>
        </template>
      </UPopover>
    </template>
  </UInput>
</template>
