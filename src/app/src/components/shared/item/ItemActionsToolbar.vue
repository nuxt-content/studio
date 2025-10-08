<script setup lang="ts">
import { computed, ref } from 'vue'
import { computeActionItems } from '../../../utils/context'
import { useStudio } from '../../../composables/useStudio'
import { type StudioAction, StudioItemActionId } from '../../../types'
import { mediaFileExtensions } from '../../../utils/media'

const { context } = useStudio()
const fileInputRef = ref<HTMLInputElement>()

const item = computed(() => context.activeTree.value.currentItem.value)
const actions = computed(() => {
  return computeActionItems(context.itemActions.value, item.value)
})

const handleFileSelection = (event: Event) => {
  const target = event.target as HTMLInputElement

  if (target.files && target.files.length > 0) {
    context.itemActionHandler[StudioItemActionId.UploadMedia]({
      parentFsPath: item.value.fsPath,
      files: Array.from(target.files),
    })
    target.value = ''
  }
}

const actionHandler = (action: StudioAction) => {
  if (action.id === StudioItemActionId.UploadMedia) {
    fileInputRef.value?.click()
    return
  }

  action.handler!(item.value)
}
</script>

<template>
  <div class="flex items-center -mr-1">
    <UTooltip
      v-for="action in actions"
      :key="action.id"
      :text="action.tooltip"
    >
      <UButton
        :key="action.id"
        :icon="action.icon"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="actionHandler(action)"
      />
    </UTooltip>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="mediaFileExtensions.map(ext => `.${ext}`).join(', ')"
      class="hidden"
      @change="handleFileSelection"
    >
  </div>
</template>
