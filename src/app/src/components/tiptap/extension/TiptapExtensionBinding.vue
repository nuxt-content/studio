<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { useI18n } from 'vue-i18n'

const props = defineProps(nodeViewProps)
const { t } = useI18n()

const isInside = computed(() => props.selected)
const label = computed(() => props.node.attrs.value || props.node.attrs.defaultValue || '')

const isPopoverOpen = ref(false)
const valueAttr = ref('')
const defaultValueAttr = ref('')

watch(
  () => [props.node.attrs.value, props.node.attrs.defaultValue],
  () => syncAttributes(),
  { immediate: true },
)

function syncAttributes() {
  valueAttr.value = props.node.attrs.value || ''
  defaultValueAttr.value = props.node.attrs.defaultValue || ''
}

function applyBinding() {
  const attrs = {
    value: valueAttr.value.trim() || undefined,
    defaultValue: defaultValueAttr.value.trim() || undefined,
  }
  props.updateAttributes(attrs)
  isPopoverOpen.value = false
}

function removeBinding() {
  props.editor.chain().focus().unsetBinding().run()
  valueAttr.value = ''
  defaultValueAttr.value = ''
  isPopoverOpen.value = false
}

function handleKeyDown(event: KeyboardEvent) {
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
        class="size-3 shrink-0 text-muted group-hover:text-default"
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
            leading-icon="i-lucide-braces"
            :placeholder="t('studio.tiptap.binding.variablePlaceholder')"
            @keydown="handleKeyDown"
          />
          <UInput
            v-model="defaultValueAttr"
            variant="none"
            name="defaultValue"
            leading-icon="i-lucide-text-cursor-input"
            :placeholder="t('studio.tiptap.binding.defaultValuePlaceholder')"
            @keydown="handleKeyDown"
          />
          <USeparator />
          <div class="flex items-center justify-end gap-0.5 px-1 py-0.5">
            <UButton
              icon="i-lucide-corner-down-left"
              variant="ghost"
              size="xs"
              @click="applyBinding"
            />
            <UButton
              icon="i-lucide-trash"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="removeBinding"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
