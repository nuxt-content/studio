<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { StudioItemActionId } from '../../types'

const props = defineProps({
  itemId: {
    type: String as PropType<string>,
    required: true,
  },
  actionId: {
    type: String as PropType<StudioItemActionId>,
    required: true,
  },
  actionCallback: {
    type: Function as PropType<() => Promise<void>>,
    required: true,
  },
})

const toast = useToast()

const name = computed(() => {
  return props.itemId.split('/').pop()
})

const emit = defineEmits<{ close: [] }>()

const titleMap = {
  [StudioItemActionId.RevertItem]: `Reverting ${name.value}`,
  [StudioItemActionId.DeleteItem]: `Deleting ${name.value}`,
} as Record<StudioItemActionId, string>

const descriptionMap = {
  [StudioItemActionId.RevertItem]: `Are you sure you want to revert ${name.value} back to its original version?`,
  [StudioItemActionId.DeleteItem]: `Are you sure you want to delete ${name.value}?`,
} as Record<StudioItemActionId, string>

const successLabelMap = {
  [StudioItemActionId.RevertItem]: 'Revert changes',
  [StudioItemActionId.DeleteItem]: 'Delete',
} as Record<StudioItemActionId, string>

const successMessageMap = {
  [StudioItemActionId.RevertItem]: 'Revert successful!',
  [StudioItemActionId.DeleteItem]: 'Deletion successful!',
} as Record<StudioItemActionId, string>

const errorMessageMap = {
  [StudioItemActionId.RevertItem]: 'Something went wrong while reverting your file.',
  [StudioItemActionId.DeleteItem]: 'Something went wrong while deleting your file.',
} as Record<StudioItemActionId, string>

const handleConfirm = async () => {
  try {
    await props.actionCallback()
    toast.add({
      title: successMessageMap[props.actionId],
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: errorMessageMap[props.actionId],
      color: 'error',
    })
  }
  emit('close')
}
</script>

<template>
  <UModal
    :title="titleMap[actionId]"
    :description="descriptionMap[actionId]"
    :ui="{ footer: 'justify-end' }"
  >
    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          label="Cancel"
          @click="emit('close')"
        />
        <UButton
          :label="successLabelMap[actionId]"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
