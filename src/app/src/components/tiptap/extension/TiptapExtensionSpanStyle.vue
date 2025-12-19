<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const isEditable = computed(() => props.editor.isEditable)
const isInside = ref(false)

const styleValue = ref<string>(props.node.attrs.style || '')
const classValue = ref<string>(props.node.attrs.class || '')

const apply = () => {
  props.updateAttributes({
    style: styleValue.value.trim() || null,
    class: classValue.value.trim() || null,
  })
}

const remove = () => {
  props.deleteNode()
}

const updateSelectionState = () => {
  const { from, to } = props.editor.state.selection
  const pos = typeof props.getPos === 'function' ? props.getPos() : null
  if (pos === null || pos === undefined || pos < 0) {
    isInside.value = false
    return
  }
  const start = pos
  const end = pos + props.node.nodeSize
  isInside.value = from >= start && to <= end
}

onMounted(() => {
  updateSelectionState()
  props.editor.on('selectionUpdate', updateSelectionState)
})

onBeforeUnmount(() => {
  props.editor.off('selectionUpdate', updateSelectionState)
})
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="relative inline-flex items-center gap-1 group"
  >
    <span
      :style="props.node.attrs.style || undefined"
      :class="props.node.attrs.class || undefined"
      class="inline-flex border-b rounded-sm"
    >
      <NodeViewContent
        as="span"
        class="outline-none"
      />
    </span>

    <UPopover
      v-if="isEditable"
      :portal="false"
      :ui="{ base: 'z-[9998]', content: 'p-3 w-64 z-[9999]' }"
    >
      <UButton
        icon="i-lucide-paintbrush"
        color="neutral"
        variant="ghost"
        size="xs"
        :class="[
          'absolute -top-5 -right-2 shrink-0 transition-opacity',
          isInside ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ]"
        :disabled="!isEditable"
        :aria-label="$t('studio.tiptap.spanStyle.label')"
        tabindex="-1"
      />

      <template #content>
        <div class="flex flex-col gap-2">
          <UFormField
            name="style"
            :label="$t('studio.tiptap.spanStyle.styleLabel')"
          >
            <UInput
              v-model="styleValue"
              variant="outline"
              size="sm"
              :disabled="!isEditable"
              :placeholder="$t('studio.tiptap.spanStyle.stylePlaceholder')"
              @keydown.enter.prevent="apply"
              @blur="apply"
            />
          </UFormField>

          <UFormField
            name="class"
            :label="$t('studio.tiptap.spanStyle.classLabel')"
          >
            <UInput
              v-model="classValue"
              variant="outline"
              size="sm"
              :disabled="!isEditable"
              :placeholder="$t('studio.tiptap.spanStyle.classPlaceholder')"
              @keydown.enter.prevent="apply"
              @blur="apply"
            />
          </UFormField>

          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!isEditable"
              @click="remove"
            >
              {{ $t('studio.tiptap.spanStyle.remove') }}
            </UButton>
            <UButton
              color="primary"
              size="sm"
              :disabled="!isEditable"
              @click="apply"
            >
              {{ $t('studio.tiptap.spanStyle.apply') }}
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
