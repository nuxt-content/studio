<script setup lang="ts">
import type { FormItem, TreeItem } from '../../../types'
import type { PropType } from 'vue'
import { ref, computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { isImageFile } from '../../../utils/file'
import { Image } from '@unpic/vue'

defineProps({
  formItem: {
    type: Object as PropType<FormItem>,
    default: () => ({}),
  },
})

const model = defineModel<string>({ default: '' })

const { mediaTree } = useStudio()

const popoverOpen = ref(false)
const search = ref('')

// Collect all image files from media tree
const allMediaFiles = computed(() => {
  const medias: TreeItem[] = []

  const collectMedias = (items: TreeItem[]) => {
    for (const item of items) {
      if (item.type === 'file' && isImageFile(item.fsPath)) {
        medias.push(item)
      }
      if (item.children) {
        collectMedias(item.children)
      }
    }
  }

  collectMedias(mediaTree.root.value)

  return medias
})

// Filter by search and limit to 8
const mediaFiles = computed(() => {
  let files = allMediaFiles.value

  if (search.value) {
    const query = search.value.toLowerCase()
    files = files.filter(file => file.name.toLowerCase().includes(query))
  }

  return files.slice(0, 8)
})

function selectMedia(media: TreeItem) {
  model.value = media.routePath || media.fsPath
  popoverOpen.value = false
  search.value = ''
}
</script>

<template>
  <div class="flex items-center gap-1">
    <div
      class="flex items-center justify-center size-6 bg-accented rounded shrink-0 overflow-hidden"
    >
      <Image
        v-if="model"
        :src="model"
        width="24"
        height="24"
        :alt="model"
        class="size-6 object-cover"
      />
      <UIcon
        v-else
        name="i-lucide-image"
        class="text-dimmed"
        size="xs"
      />
    </div>

    <UInput
      v-model="model"
      :placeholder="$t('studio.form.media.placeholder')"
      size="xs"
      class="flex-1"
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
            <div class="p-3 w-80">
              <UInput
                v-model="search"
                :placeholder="$t('studio.form.media.searchPlaceholder')"
                size="xs"
                icon="i-lucide-search"
                autofocus
                class="mb-3 w-full"
              />

              <div
                v-if="mediaFiles.length === 0"
                class="text-center py-4"
              >
                <UIcon
                  name="i-lucide-image-off"
                  class="size-8 mx-auto mb-2 text-muted"
                />
                <p class="text-xs text-muted">
                  {{ search ? $t('studio.form.media.noImagesFound') : $t('studio.form.media.noImagesAvailable') }}
                </p>
              </div>

              <div
                v-else
                class="grid grid-cols-4 gap-2"
              >
                <UTooltip
                  v-for="media in mediaFiles"
                  :key="media.fsPath"
                  :text="media.name"
                >
                  <button
                    type="button"
                    class="aspect-square rounded-md cursor-pointer overflow-hidden border border-default hover:border-muted hover:ring-1 hover:ring-muted transition-all"
                    style="background: repeating-linear-gradient(45deg, #d4d4d8 0 6px, #a1a1aa 0 12px), repeating-linear-gradient(-45deg, #a1a1aa 0 6px, #d4d4d8 0 12px); background-blend-mode: overlay; background-size: 12px 12px;"
                    @click="selectMedia(media)"
                  >
                    <Image
                      :src="media.routePath || media.fsPath"
                      width="80"
                      height="80"
                      :alt="media.name"
                      class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </button>
                </UTooltip>
              </div>

              <p
                v-if="mediaFiles.length > 0"
                class="text-xs text-dimmed mt-1"
              >
                {{ $t('studio.form.media.imageCount', { count: mediaFiles.length, total: allMediaFiles.length }, allMediaFiles.length) }}
              </p>
            </div>
          </template>
        </UPopover>
      </template>
    </UInput>
  </div>
</template>
