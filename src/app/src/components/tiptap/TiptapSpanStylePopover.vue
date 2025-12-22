<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
}>()

const open = ref(false)
const styleValue = ref('')
const classValue = ref('')

const active = computed(() => props.editor?.isActive('span-style'))

let currentEditor: Editor | undefined
let selectionListener: (() => void) | undefined

watch(
  () => props.editor,
  (editor) => {
    if (!editor) return

    if (currentEditor && selectionListener) {
      currentEditor.off('selectionUpdate', selectionListener)
    }

    syncAttributes()
    selectionListener = () => syncAttributes()
    editor.on('selectionUpdate', selectionListener)
    currentEditor = editor
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (currentEditor && selectionListener) {
    currentEditor.off('selectionUpdate', selectionListener)
  }
})

function syncAttributes() {
  const attrs = props.editor.getAttributes('span-style')
  styleValue.value = attrs?.style || ''
  classValue.value = attrs?.class || ''
}

function applySpanStyle() {
  const attrs = {
    style: styleValue.value.trim() || undefined,
    class: classValue.value.trim() || undefined,
  }

  if (active.value) {
    props.editor.chain().focus().updateSpanStyle(attrs).run()
  }
  else {
    props.editor.chain().focus().setSpanStyle(attrs).run()
  }
  open.value = false
}

function removeSpanStyle() {
  props.editor.chain().focus().unsetSpanStyle().run()
  styleValue.value = ''
  classValue.value = ''
  open.value = false
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    applySpanStyle()
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :portal="false"
    :ui="{ content: 'w-64 p-0.5' }"
  >
    <UButton
      icon="i-lucide-paintbrush"
      color="neutral"
      active-color="primary"
      variant="ghost"
      active-variant="soft"
      size="sm"
      :active="active"
      :class="[open && 'bg-elevated']"
      :title="$t('studio.tiptap.spanStyle.label')"
    />

    <template #content>
      <div class="flex flex-col gap-0.5">
        <UInput
          v-model="styleValue"
          autofocus
          variant="none"
          name="style"
          leading-icon="i-lucide-brush"
          :placeholder="$t('studio.tiptap.spanStyle.stylePlaceholder')"
          @keydown="handleKeyDown"
        />

        <UInput
          v-model="classValue"
          variant="none"
          name="class"
          leading-icon="i-lucide-tag"
          :placeholder="$t('studio.tiptap.spanStyle.classPlaceholder')"
          @keydown="handleKeyDown"
        />

        <USeparator />

        <div class="flex items-center justify-end gap-0.5 px-1 py-0.5">
          <UTooltip :text="$t('studio.tiptap.spanStyle.apply')">
            <UButton
              icon="i-lucide-corner-down-left"
              variant="ghost"
              size="sm"
              @click="applySpanStyle"
            />
          </UTooltip>

          <UTooltip :text="$t('studio.tiptap.spanStyle.remove')">
            <UButton
              icon="i-lucide-trash"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!active"
              @click="removeSpanStyle"
            />
          </UTooltip>
        </div>
      </div>
    </template>
  </UPopover>
</template>
