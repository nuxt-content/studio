<script setup lang="ts">
import type { TreeItem, StudioItemActionId } from '../../types'
import type { PropType } from 'vue'
import { computed } from 'vue'
import { Image } from '@unpic/vue'
import { isImageFile, MEDIA_EXTENSIONS } from '../../utils/file'

const props = defineProps({
  actionId: {
    type: String as PropType<StudioItemActionId.CreateDocument | StudioItemActionId.RenameItem>,
    required: true,
  },
  parentItem: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  renamedItem: {
    type: Object as PropType<TreeItem>,
    default: null,
  },
})

const isImage = computed(() => props.renamedItem && isImageFile(props.renamedItem?.fsPath))
</script>

<template>
  <ItemCardForm
    :action-id="actionId"
    :parent-item="parentItem"
    :renamed-item="renamedItem"
    :config="{
      allowed: MEDIA_EXTENSIONS,
      editable: false,
    }"
  >
    <template #thumbnail>
      <div
        v-if="isImage && renamedItem?.routePath"
        class="w-full h-full bg-[linear-gradient(45deg,#e6e9ea_25%,transparent_0),linear-gradient(-45deg,#e6e9ea_25%,transparent_0),linear-gradient(45deg,transparent_75%,#e6e9ea_0),linear-gradient(-45deg,transparent_75%,#e6e9ea_0)]"
      >
        <Image
          :src="renamedItem.routePath"
          width="48"
          height="48"
          :alt="$t('studio.media.altFilePreview')"
          class="w-full h-full object-cover"
        />
      </div>
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
      >
        <UIcon
          name="i-lucide-play"
          class="w-6 h-6 text-muted"
        />
      </div>
    </template>
  </ItemCardForm>
</template>
