<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref } from 'vue'
import type { TreeItem } from '../../../types'
import ModalMediaPicker from '../../shared/ModalMediaPicker.vue'

const props = defineProps<NodeViewProps>()

const isOpen = ref(true)

const handleImageSelect = (image: TreeItem) => {
  const pos = props.getPos()

  if (typeof pos === 'number') {
    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .insertContent({
        type: 'image',
        attrs: {
          src: image.routePath,
          alt: image.name,
        },
      })
      .run()
  }

  isOpen.value = false
}

const handleCancel = () => {
  const pos = props.getPos()

  if (typeof pos === 'number') {
    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + 1 })
      .run()
  }

  isOpen.value = false
}
</script>

<template>
  <NodeViewWrapper>
    <ModalMediaPicker
      :open="isOpen"
      @select="handleImageSelect"
      @cancel="handleCancel"
    />
  </NodeViewWrapper>
</template>
