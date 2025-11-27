<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { kebabCase, titleCase } from 'scule'
import { useStudio } from '../../../composables/useStudio'
import { isEmpty } from '../../../utils/object'
import { standardNuxtUIComponents } from '../../../utils/tiptap/editor'

const nodeProps = defineProps(nodeViewProps)

const { host } = useStudio()

const isEditable = ref(true) // TODO: Connect to editor state
const isEditingProps = ref(false)
const isEditingContent = ref(false)

const isDropdownMenuOpen = ref(false)
const isPopoverOpen = ref(false)
watch(isPopoverOpen, (value) => {
  if (!value) {
    isEditingProps.value = false
    isEditingContent.value = false
  }
})

const virtualContextMenuTargetElement = ref({ getBoundingClientRect: () => ({}) })
const nodeRef = ref()

const contentForm = reactive({
  text: nodeProps.node.textContent,
})

const content = computed(() => nodeProps.node.textContent)
const componentTag = computed(() => nodeProps.node.attrs.tag)
const componentName = computed(() => titleCase(componentTag.value).replace(/^U /, ''))
const componentMeta = computed(() => host.meta.getComponents().find(c => kebabCase(c.name) === kebabCase(componentTag.value)))
const defaultSlot = computed(() => (componentMeta.value?.meta?.slots || []).find(s => s.name === 'default'))

// Nuxt UI Components bindings
const nuxtUIComponent = computed(() => standardNuxtUIComponents[componentTag.value])
const displayName = computed(() => nuxtUIComponent.value?.name || componentName.value)
const displayIcon = computed(() => nuxtUIComponent.value?.icon || 'i-lucide-box')

const items = computed(() => [
  [
    {
      label: 'Edit content',
      icon: 'i-lucide-type',
      onClick: () => onEdit('content'),
      inactive: isEmpty(defaultSlot.value as never),
      disabled: isEmpty(defaultSlot.value as never),
    },
    {
      label: 'Edit props',
      icon: 'i-lucide-settings',
      onClick: () => onEdit('props'),
    },
  ].filter(Boolean),
  [
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onClick: onDelete,
    },
  ],
])

const onEdit = (type: 'content' | 'props') => {
  const targetRect = (nodeRef.value.$el as HTMLSpanElement)?.getBoundingClientRect()
  virtualContextMenuTargetElement.value.getBoundingClientRect = () => ({
    width: 0,
    height: 0,
    top: targetRect?.bottom + 10 || 0,
    left: targetRect?.left || 0,
  })
  isPopoverOpen.value = true
  isEditingContent.value = type === 'content'
  isEditingProps.value = type === 'props'
}

const onDelete = () => {
  const pos = nodeProps.getPos() as number
  const transaction = nodeProps.editor.state.tr.delete(pos, pos + nodeProps.node.nodeSize)
  nodeProps.editor.view.dispatch(transaction)
}

watch(() => contentForm.text, (slotText) => {
  const pos = nodeProps.getPos() as number
  if (isEmpty(slotText)) {
    nodeProps.editor.chain().deleteRange({
      from: pos,
      to: pos + nodeProps.node.nodeSize,
    }).run()
  }
  else {
    nodeProps.editor.chain().insertContentAt({
      from: pos + 1,
      to: pos + nodeProps.node.nodeSize,
    }, slotText).run()
  }
})

// const updateProps = (props: Record<string, unknown>) => {
//   nodeProps.updateAttributes({ props })
// }
</script>

<template>
  <NodeViewWrapper as="span">
    <UDropdownMenu
      v-model:open="isDropdownMenuOpen"
      :items="items"
      :disabled="!isEditable"
      :popper="{ strategy: 'absolute', placement: 'bottom' }"
    >
      <template #item="{ item }">
        <span
          class="truncate"
          :class="{ 'text-muted': item.inactive }"
        >
          {{ item.label }}
        </span>
      </template>

      <div
        class="group inline-flex items-center gap-1 border border-default rounded-md text-muted px-2 mx-0.5 hover:bg-muted transition-colors cursor-pointer"
        :contenteditable="false"
      >
        <UIcon
          :name="displayIcon"
          class="size-3 shrink-0 text-muted group-hover:text-default my-2"
          :class="{ 'text-default': isDropdownMenuOpen || isPopoverOpen }"
        />
        <div
          v-if="isEmpty(content)"
          class="text-xs text-muted"
        >
          {{ displayName }}
        </div>
        <NodeViewContent
          ref="nodeRef"
          class="text-sm text-default truncate! max-w-40"
          as="span"
        />
      </div>
    </UDropdownMenu>

    <UPopover v-model:open="isPopoverOpen">
      <span />
      <template #content>
        <div class="bg-elevated p-2 w-64">
          <div v-if="isEditingContent">
            <UFormField
              name="content"
              :label="`Edit ${displayName} content`"
              :hint="defaultSlot?.description"
            >
              <UInput
                v-model="contentForm.text"
                :disabled="!isEditable"
                size="xs"
                autofocus
                placeholder="Enter content..."
                @keypress.enter="isPopoverOpen = false"
              />
            </UFormField>
          </div>

          <div
            v-else-if="isEditingProps"
            class="flex items-center justify-center gap-2"
          >
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="size-3.5 text-muted"
            />
            <span class="font-medium text-xs text-muted tracking-tight">
              Properties editor coming soon
            </span>
          </div>
        </div>
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
