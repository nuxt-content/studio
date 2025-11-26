<script setup lang="ts">
import { ref, type PropType } from 'vue'
import { useStudio } from '../../composables/useStudio'
import { useMonacoDiff } from '../../composables/useMonacoDiff'

const props = defineProps({
  language: {
    type: String as PropType<'mdc' | 'javascript' | 'yaml' | 'text'>,
    required: true,
  },
  originalContent: {
    type: String,
    required: true,
  },
  formattedContent: {
    type: String,
    required: true,
  },
})

const { ui } = useStudio()

const diffEditorRef = ref<HTMLElement>()

useMonacoDiff(diffEditorRef, {
  original: props.originalContent,
  modified: props.formattedContent,
  language: props.language,
  colorMode: ui.colorMode,
})
</script>

<template>
  <div
    ref="diffEditorRef"
    class="h-full"
  />
</template>
