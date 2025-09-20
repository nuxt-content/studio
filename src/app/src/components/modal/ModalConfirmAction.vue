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
  successCallback: {
    type: Function as PropType<() => Promise<void>>,
    required: true,
  },
})

console.log(props)

const name = computed(() => {
  return props.itemId.split('/').pop()
})

const emit = defineEmits<{ close: [] }>()

const titleMap = {
  [StudioItemActionId.RevertItem]: `Reverting ${name.value}`,
} as Record<StudioItemActionId, string>

const descriptionMap = {
  [StudioItemActionId.RevertItem]: `Are you sure you want to revert this file back to the original version?`,
} as Record<StudioItemActionId, string>

const successLabelMap = {
  [StudioItemActionId.RevertItem]: 'Revert changes',
} as Record<StudioItemActionId, string>

const asyncSuccessCallback = async () => {
  await props.successCallback()
  emit('close')
}
</script>

<template>
  <UModal
    :title="titleMap[actionId]"
    :description="descriptionMap[actionId]"
    :ui="{ footer: 'justify-end' }"
  >
    <!-- <template #body>
      <Placeholder class="h-48" />
    </template> -->

    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          label="Cancel"
          @click="emit('close')"
        />
        <UButton
          :label="successLabelMap[actionId]"
          @click="asyncSuccessCallback"
        />
      </div>
    </template>
  </UModal>
</template>
