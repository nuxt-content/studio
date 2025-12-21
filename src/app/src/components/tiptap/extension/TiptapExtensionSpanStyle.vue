<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="relative inline-flex items-center gap-1 group"
  >
    <span
      :style="props.node.attrs.style || undefined"
      :class="props.node.attrs.class || undefined"
      class="inline-flex border-b border-accented rounded-sm"
    >
      <NodeViewContent
        as="span"
        class="outline-none"
      />
    </span>
  </NodeViewWrapper>
</template>
