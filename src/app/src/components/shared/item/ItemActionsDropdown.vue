<script setup lang="ts">
import { computeItemActions, oneStepActions } from '../../../utils/context'
import { computed, ref, watch, type PropType } from 'vue'
import { StudioItemActionId } from '../../../types'
import type { TreeItem, StudioAction } from '../../../types'
import { useStudio } from '../../../composables/useStudio'
import type { DropdownMenuItem } from '@nuxt/ui/runtime/components/DropdownMenu.vue.js'

const { context } = useStudio()

const props = defineProps({
  item: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
})

const isOpen = ref(false)
const pendingAction = ref<StudioAction<StudioItemActionId> | null>(null)
const loadingAction = ref<StudioAction<StudioItemActionId> | null>(null)

// Reset pending action when menu closes
watch(isOpen, () => {
  if (!isOpen.value) {
    setTimeout(() => {
      pendingAction.value = null
      loadingAction.value = null
    }, 300)
  }
})

// Close dropdown when action is completed
watch(context.actionInProgress, (actionInProgress) => {
  if (!actionInProgress) {
    isOpen.value = false
  }
})

const actions = computed<DropdownMenuItem[]>(() => {
  const hasPendingAction = pendingAction.value !== null
  const hasLoadingAction = loadingAction.value !== null

  return computeItemActions(context.itemActions.value, props.item, context.currentFeature.value).map((action) => {
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
      icon,
      color: isPending ? (isDeleteAction ? 'error' : 'secondary') : 'neutral',
      slot: isPending ? 'pending-action' : undefined,
      disabled: (hasPendingAction && !isPending) || hasLoadingAction,
      loading: isLoading,
      onSelect: (e: Event) => {
        // Don't allow action if already loading
        if (hasLoadingAction) {
          e.preventDefault()
          return
        }

        // For two-step actions, execute it without confirmation
        if (!isOneStepAction) {
          if (props.item.type === 'directory' && [StudioItemActionId.CreateDocument, StudioItemActionId.CreateDocumentFolder, StudioItemActionId.CreateMediaFolder].includes(action.id)) {
            // Navigate into folder before adding form creation
            context.activeTree.value.selectItemByFsPath(props.item.fsPath)
          }

          action.handler!(props.item)
          return
        }

        // Prevent dropdown from closing for one-step actions
        e.preventDefault()

        // Second click on pending action - execute it
        if (isPending) {
          loadingAction.value = action
          action.handler!(props.item)
          pendingAction.value = null
        }
        // Click on different action while one is pending - cancel pending state
        else if (pendingAction.value !== null) {
          pendingAction.value = null
        }
        // First click - enter confirmation state
        else {
          pendingAction.value = action
        }
      },
    }
  })
})

const pendingActionLabel = computed(() => {
  return `Click again to ${pendingAction.value?.id.split('-')[0]}`
})
</script>

<template>
  <UDropdownMenu
    v-model:open="isOpen"
    :items="actions"
    :content="{ side: 'bottom' }"
    :ui="{ content: 'w-42' }"
    size="xs"
  >
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-ph-dots-three-vertical"
      aria-label="Open actions"
      square
      size="sm"
      class="cursor-pointer"
      @click="$event.stopPropagation()"
    />

    <template #pending-action-label>
      <UTooltip :text="pendingActionLabel">
        <span class="truncate">{{ pendingActionLabel }}</span>
      </UTooltip>
    </template>
  </UDropdownMenu>
</template>
