<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
})

const copied = ref(false)
const { t } = useI18n()

const tooltipText = computed(() => {
  return copied.value
    ? t('studio.tooltips.copiedToClipboard')
    : t('studio.tooltips.copyToClipboard')
})

async function handleCopy() {
  if (!props.content) return

  await navigator.clipboard.writeText(props.content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <UTooltip :text="tooltipText">
    <UButton
      :icon="copied ? 'i-lucide-clipboard-check' : 'i-lucide-clipboard'"
      variant="ghost"
      size="xs"
      :disabled="copied"
      @click="handleCopy"
    />
  </UTooltip>
</template>
