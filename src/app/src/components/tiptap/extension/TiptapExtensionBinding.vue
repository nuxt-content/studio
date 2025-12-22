<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const isInside = computed(() => props.selected)
const label = computed(() => props.node.attrs.value || props.node.attrs.defaultValue || '')

const isPopoverOpen = ref(false)
const valueAttr = ref('')
const defaultValueAttr = ref('')

const syncAttributes = () => {
  const attrs = props.editor.getAttributes('binding')
  valueAttr.value = attrs?.value || ''
  defaultValueAttr.value = attrs?.defaultValue || ''
}

let selectionListener
watch(() => props.editor, (editor) => {
  if (!editor) return
  if (selectionListener) editor.off('selectionUpdate', selectionListener)
  syncAttributes()
  selectionListener = () => syncAttributes()
  editor.on('selectionUpdate', selectionListener)
}, { immediate: true })

onBeforeUnmount(() => {
  if (selectionListener) props.editor.off('selectionUpdate', selectionListener)
})

const applyBinding = () => {
  const attrs = {
    value: valueAttr.value.trim() || undefined,
    defaultValue: defaultValueAttr.value.trim() || undefined,
  }
  props.editor.chain().focus().updateAttributes('binding', attrs).run()
  isPopoverOpen.value = false
}

const removeBinding = () => {
  props.editor.chain().focus().unsetBinding().run()
  valueAttr.value = ''
  defaultValueAttr.value = ''
  isPopoverOpen.value = false
}

const handleKeyDown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    applyBinding()
  }
}
</script>

<template>
  <NodeViewWrapper
    as="span"
    :contenteditable="false"
  >
    <div
      class="group inline-flex items-center gap-1 border border-default rounded-md text-muted px-2 mx-0.5 hover:bg-muted transition-colors cursor-pointer"
      :class="{ 'ring-1 ring-primary/60': isInside }"
      @click="isPopoverOpen = true"
    >
      <UIcon
        name="i-lucide-variable"
        class="size-3 shrink-0 text-muted group-hover:text-default my-2"
        :class="{ 'text-default': isPopoverOpen }"
      />
      <NodeViewContent
        class="text-sm text-default truncate! max-w-40"
        as="span"
      />
      <span
        v-if="!props.node.textContent"
        class="text-xs text-muted"
      >
        {{ label || 'binding' }}
      </span>
    </div>

    <UPopover v-model:open="isPopoverOpen">
      <span />
      <template #content>
        <div class="flex flex-col gap-0.5 w-64 p-1">
          <UInput
            v-model="valueAttr"
            autofocus
            variant="none"
            name="value"
            leading-icon="i-lucide-type"
            placeholder="value"
            @keydown="handleKeyDown"
          />
          <UInput
            v-model="defaultValueAttr"
            variant="none"
            name="defaultValue"
            leading-icon="i-lucide-ellipsis"
            placeholder="default value"
            @keydown="handleKeyDown"
          />
          <USeparator />
          <div class="flex items-center justify-end gap-0.5 px-1 py-0.5">
            <UButton
              icon="i-lucide-corner-down-left"
              variant="ghost"
              size="sm"
              @click="applyBinding"
            />
            <UButton
              icon="i-lucide-trash"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="removeBinding"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
