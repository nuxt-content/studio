<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '../../composables/useStudio'
import { isImageFile } from '../../utils/file'
import { Image } from '@unpic/vue'
import type { TreeItem } from '../../types'
import { StudioFeature } from '../../types'

const { mediaTree, context } = useStudio()

defineProps<{ open: boolean }>()

const emit = defineEmits<{
  select: [image: TreeItem]
  cancel: []
}>()

const imageFiles = computed(() => {
  const images: TreeItem[] = []

  const collectImages = (items: TreeItem[]) => {
    for (const item of items) {
      if (item.type === 'file' && isImageFile(item.fsPath)) {
        images.push(item)
      }
      if (item.children) {
        collectImages(item.children)
      }
    }
  }

  collectImages(mediaTree.root.value)

  return images
})

const handleImageSelect = (image: TreeItem) => {
  emit('select', image)
}

const handleUpload = () => {
  emit('cancel')
  context.switchFeature(StudioFeature.Media)
}
</script>

<template>
  <UModal
    :open="open"
    title="Select Image"
    description="Choose an image from your media library"
    @update:open="(value: boolean) => !value && emit('cancel')"
  >
    <template #body>
      <div
        v-if="imageFiles.length === 0"
        class="text-center py-4 text-muted"
      >
        <UIcon
          name="i-lucide-image-off"
          class="size-8 mx-auto mb-2"
        />
        <p class="text-sm">
          No images available in your media library
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-3 gap-4"
      >
        <button
          v-for="image in imageFiles"
          :key="image.fsPath"
          class="aspect-square rounded-lg overflow-hidden border border-default hover:border-accented hover:ring-1 hover:ring-accented transition-all cursor-pointer group relative"
          @click="handleImageSelect(image)"
        >
          <div
            class="w-full h-full"
            style="background: repeating-linear-gradient(45deg, #d4d4d8 0 12px, #a1a1aa 0 24px), repeating-linear-gradient(-45deg, #a1a1aa 0 12px, #d4d4d8 0 24px); background-blend-mode: overlay; background-size: 24px 24px;"
          >
            <Image
              :src="image.routePath || image.fsPath"
              width="200"
              height="200"
              :alt="image.name"
              class="w-full h-full object-cover"
            />
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
        Upload
      </UButton>
    </template>
  </UModal>
</template>
