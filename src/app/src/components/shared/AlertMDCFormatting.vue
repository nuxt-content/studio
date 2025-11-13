<script setup lang="ts">
import { ref } from 'vue'

defineProps({
  showAction: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['showDiff'])

const isDiffShown = ref(false)

function toggleAction() {
  isDiffShown.value = !isDiffShown.value
  emit('showDiff', isDiffShown.value)
}
</script>

<template>
  <UAlert
    title="Formatting applied to align with MDC syntax standard."
    color="info"
    variant="soft"
    orientation="horizontal"
    :ui="{ title: 'text-xs', root: 'rounded-none py-2 border-b border-default' }"
  >
    <template
      v-if="showAction"
      #actions
    >
      <UButton
        variant="soft"
        color="secondary"
        size="xs"
        class="bg-white hover:bg-muted dark:bg-accented dark:hover:bg-elevated"
        @click="toggleAction"
      >
        {{ isDiffShown ? 'Back to code' : "See what's changed" }}
      </UButton>
    </template>
  </UAlert>
</template>
