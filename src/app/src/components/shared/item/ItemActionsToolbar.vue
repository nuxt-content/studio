<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { computeItemActions, oneStepActions } from '../../../utils/context'
import { useStudio } from '../../../composables/useStudio'
import type { StudioAction } from '../../../types'
import { StudioItemActionId } from '../../../types'
import { MEDIA_EXTENSIONS } from '../../../utils/file'

const { context } = useStudio()
const fileInputRef = ref<HTMLInputElement>()
const toolbarRef = ref<HTMLElement>()
const pendingAction = ref<StudioAction<StudioItemActionId> | null>(null)
const loadingAction = ref<StudioAction<StudioItemActionId> | null>(null)

watch(context.actionInProgress, (action) => {
  if (!action) {
    pendingAction.value = null
    loadingAction.value = null
  }
})

const item = computed(() => context.activeTree.value.currentItem.value)
const actions = computed(() => {
  const hasPendingAction = pendingAction.value !== null
  const hasLoadingAction = loadingAction.value !== null

  return computeItemActions(context.itemActions.value, item.value, context.currentFeature.value).map((action) => {
    const isOneStepAction = oneStepActions.includes(action.id)
    const isPending = pendingAction.value?.id === action.id
    const isLoading = loadingAction.value?.id === action.id
    const isDeleteAction = action.id === StudioItemActionId.DeleteItem

    let icon = action.icon
    if (isLoading) {
      icon = 'i-ph-circle-notch'
    }
    else if (isPending) {
      icon = isDeleteAction ? 'i-ph-x' : 'i-ph-check'
    }

    return {
      ...action,
      color: isPending ? (isDeleteAction ? 'error' : 'secondary') : 'neutral',
      variant: isPending ? 'soft' : 'ghost',
      icon,
      tooltip: isPending ? `Click again to ${action.id.split('-')[0].toLowerCase()}` : action.tooltip,
      disabled: (hasPendingAction && !isPending) || hasLoadingAction,
      isOneStepAction,
      isPending,
      isLoading,
    }
  })
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

const actionHandler = (action: StudioAction<StudioItemActionId> & { isPending?: boolean, isOneStepAction?: boolean, isLoading?: boolean }, event: Event) => {
  // Stop propagation to prevent click outside handler from triggering
  event.stopPropagation()

  // Don't allow action if already loading
  if (action.isLoading) {
    return
  }

  if (action.id === StudioItemActionId.UploadMedia) {
    fileInputRef.value?.click()
    return
  }

  const targetItem = item.value

  // For two-steps actions, execute without confirmation
  if (!action.isOneStepAction) {
    if (action.id === StudioItemActionId.RenameItem) {
      // Navigate to parent since rename form is displayed in the parent tree
      context.activeTree.value.selectParentByFsPath(targetItem.fsPath)
    }

    action.handler!(targetItem)
    return
  }

  // Second click on pending action - execute it
  if (action.isPending) {
    loadingAction.value = action
    action.handler!(targetItem)
    pendingAction.value = null
  }
  // Click on different action while one is pending - cancel pending state
  else if (pendingAction.value !== null) {
    pendingAction.value = null
  }
  // First click - enter pending state
  else {
    pendingAction.value = action
  }
}

const handleClickOutside = () => {
  if (pendingAction.value !== null && loadingAction.value === null) {
    pendingAction.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="toolbarRef"
    class="flex items-center -mr-1"
  >
    <UTooltip
      v-for="action in actions"
      :key="action.id"
      :text="action.tooltip"
      :open="action.isPending ? true : undefined"
    >
      <UButton
        :key="action.id"
        :icon="action.icon"
        :disabled="action.disabled"
        size="sm"
        :color="action.color as never"
        :variant="action.variant as never"
        :loading="action.isLoading"
        @click="actionHandler(action, $event)"
      />
    </UTooltip>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="MEDIA_EXTENSIONS.map(ext => `.${ext}`).join(', ')"
      class="hidden"
      @change="handleFileSelection"
    >
  </div>
</template>
