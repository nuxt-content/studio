<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../composables/useStudio'
import { isImageFile, isVideoFile } from '../../utils/file'
import { Image } from '@unpic/vue'
import type { TreeItem } from '../../types'
import { StudioFeature } from '../../types'

const { mediaTree, context } = useStudio()

const props = defineProps<{ open: boolean, type: 'image' | 'video' }>()

const emit = defineEmits<{
  select: [image: TreeItem]
  cancel: []
}>()

const isValidFileType = (item: TreeItem) => {
  if (props.type === 'image') {
    return isImageFile(item.fsPath)
  }
  if (props.type === 'video') {
    return isVideoFile(item.fsPath)
  }
  return false
}

const mediaFiles = computed(() => {
  const medias: TreeItem[] = []

  const collectMedias = (items: TreeItem[]) => {
    for (const item of items) {
      if (item.type === 'file' && isValidFileType(item)) {
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

const handleMediaSelect = (media: TreeItem) => {
  emit('select', media)
}

const handleUpload = () => {
  emit('cancel')
  context.switchFeature(StudioFeature.Media)
}
</script>

<template>
  <UModal
    :open="open"
    :title="$t(`studio.mediaPicker.${type}.title`)"
    :description="$t(`studio.mediaPicker.${type}.description`)"
    @update:open="(value: boolean) => !value && emit('cancel')"
  >
    <template #body>
      <div
        v-if="mediaFiles.length === 0"
        class="text-center py-4 text-muted"
      >
        <UIcon
          :name="type === 'image' ? 'i-lucide-image-off' : 'i-lucide-video-off'"
          class="size-8 mx-auto mb-2"
        />
        <p class="text-sm">
          {{ $t(`studio.mediaPicker.${type}.notAvailable`) }}
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-3 gap-4"
      >
        <button
          v-for="media in mediaFiles"
          :key="media.fsPath"
          class="aspect-square rounded-lg cursor-pointer group relative"
          @click="handleMediaSelect(media)"
        >
          <!-- Image Preview -->
          <div
            v-if="type === 'image'"
            class="w-full h-full overflow-hidden rounded-lg border border-default hover:border-muted hover:ring-1 hover:ring-muted transition-all"
            style="background: repeating-linear-gradient(45deg, #d4d4d8 0 12px, #a1a1aa 0 24px), repeating-linear-gradient(-45deg, #a1a1aa 0 12px, #d4d4d8 0 24px); background-blend-mode: overlay; background-size: 24px 24px;"
          >
            <Image
              :src="media.routePath || media.fsPath"
              width="200"
              height="200"
              :alt="media.name"
              class="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300 ease-out"
            />
          </div>

          <!-- Video Preview -->
          <div
            v-else
            class="w-full h-full bg-linear-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex flex-col items-center justify-center relative overflow-hidden rounded-lg"
          >
            <!-- Decorative film strip pattern -->
            <div class="absolute inset-y-0 left-0 w-3 bg-neutral-950 flex flex-col justify-around py-1">
              <div
                v-for="i in 6"
                :key="i"
                class="w-1.5 h-2 bg-neutral-700 mx-auto rounded-sm"
              />
            </div>
            <div class="absolute inset-y-0 right-0 w-3 bg-neutral-950 flex flex-col justify-around py-1">
              <div
                v-for="i in 6"
                :key="i"
                class="w-1.5 h-2 bg-neutral-700 mx-auto rounded-sm"
              />
            </div>

            <div class="size-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 shadow-lg">
              <UIcon
                name="i-lucide-video"
                class="size-7 text-white ml-0.5"
              />
            </div>

            <!-- Filename -->
            <p class="absolute bottom-0 inset-x-0 text-[10px] text-neutral-300 truncate px-4 py-2 bg-linear-to-t from-black/60 to-transparent text-center font-medium">
              {{ media.name }}
            </p>
          </div>
        </button>
      </div>
    </template>

    <template #footer>
      <UButton
        variant="outline"
        icon="i-lucide-upload"
        @click="handleUpload"
      >
        {{ $t(`studio.mediaPicker.${type}.upload`) }}
      </UButton>
    </template>
  </UModal>
</template>
