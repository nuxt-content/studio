<template>
  <NodeViewWrapper as="div">
    <div
      :contenteditable="false"
      class="relative group rounded-md overflow-hidden"
      :ui="{ body: { padding: '' } }"
    >
      <video
        :src="props.src"
        controls
        class="my-0 w-full"
      />
    </div>
    <NodeViewContent as="span" />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'

const nodeProps = defineProps(nodeViewProps)

const props = computed(() => nodeProps.node.attrs?.props || {})
</script>
