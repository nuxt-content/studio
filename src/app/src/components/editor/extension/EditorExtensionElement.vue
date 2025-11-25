<script setup lang="ts">
import { ref, computed } from 'vue'
import { TextSelection } from 'prosemirror-state'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { titleCase, kebabCase } from 'scule'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useStudio } from '../../../composables/useStudio'
import { standardElements } from '../../../utils/tiptap/editor'

const nodeProps = defineProps(nodeViewProps)

const nodeViewContent = ref<HTMLElement>()

const node = computed(() => nodeProps.node)

const { host } = useStudio()

const collapsed = ref(false)
const openPropsPopover = ref(false)
const isEditable = ref(true) // TODO: Connect to editor state

const componentTag = computed(() => nodeProps.node.attrs.tag)
const componentName = computed(() => titleCase(componentTag.value).replace(/^U /, ''))
const slots = computed(() => componentMeta.value?.meta.slots || [])
const hasSlots = computed(() => nodeProps.node.content.size > 0)
const componentProps = computed(() => nodeProps.node.attrs.props || {})
const componentMeta = computed(() => host.meta.getComponents().find(c => kebabCase(c.name) === kebabCase(node.value.attrs?.tag)))

const standardElement = computed(() => standardElements[componentTag.value])
const displayName = computed(() => standardElement.value?.name || componentName.value)
const displayIcon = computed(() => standardElement.value?.icon || 'i-lucide-box')

const availableSlots = computed(() => componentMeta.value?.meta.slots.map(s => s.name) || ['default'])
const usedSlots = computed(() => {
  const slots = (node.value.content?.content || []) as ProseMirrorNode[]
  return slots.map(s => s.attrs.name)
})

function onToggleCollapse(event: Event) {
  event.stopPropagation()
  event.preventDefault()

  if (hasSlots.value) {
    collapsed.value = !collapsed.value
  }
  else {
    openPropsPopover.value = true
  }
}

function onAddSlot(event: Event) {
  event.stopPropagation()
  event.preventDefault()

  const unusedSlot = availableSlots.value.find(s => !usedSlots.value.includes(s))
  if (unusedSlot) {
    addSlot(unusedSlot)
  }
}

function onDelete(event: Event) {
  event.stopPropagation()
  event.preventDefault()
  nodeProps.deleteNode()
}

function addSlot(name: string) {
  const { editor } = nodeProps
  const slots = (node.value.content?.content || []) as ProseMirrorNode[]

  // Calculate position to insert new slot at the end
  const elementSize = slots.map(s => s.nodeSize).reduce((acc, cur) => acc + cur, 1)
  const pos = nodeProps.getPos()

  if (typeof pos === 'undefined') {
    return
  }

  // Create slot with empty paragraph
  const pNode = editor.schema.nodes.paragraph.create({}, [])
  const slotNode = editor.schema.nodes.slot.create({ name }, pNode)

  // Insert and focus
  const tr = editor.state.tr.insert(pos + elementSize, slotNode)
  tr.setSelection(TextSelection.near(tr.doc.resolve(pos + elementSize)) as never)
  editor.view.dispatch(tr)
  editor.view.focus()
}

// TODO: Implement props editor component and use this function
function _updateProps(props: Record<string, unknown>) {
  nodeProps.updateAttributes({ props })
}
</script>

<template>
  <NodeViewWrapper as="div">
    <div
      class="my-3"
      :contenteditable="false"
    >
      <!-- Component Header -->
      <div
        class="group flex items-center justify-between px-2 py-1.5 rounded-md border border-transparent hover:border-muted hover:bg-muted/50 cursor-pointer transition-all duration-150"
        @click="onToggleCollapse"
      >
        <!-- Left: Icon + Name -->
        <div class="flex items-center gap-2">
          <!-- Collapse/Expand Icon for components with slots -->
          <UIcon
            v-if="hasSlots"
            :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            size="xs"
            class="text-muted group-hover:text-default transition-all duration-150"
            :class="{ 'text-dimmed': collapsed }"
          />
          <!-- Component Icon -->
          <UIcon
            v-else
            :name="displayIcon"
            size="xs"
            class="text-muted group-hover:text-default transition-colors duration-150"
            :class="{ 'text-dimmed': collapsed }"
          />

          <!-- Component Name -->
          <span
            class="text-xs font-mono font-medium text-muted group-hover:text-default transition-colors duration-150"
            :class="{ 'text-dimmed': collapsed }"
          >
            {{ displayName }}
          </span>

          <!-- Props Count Badge -->
          <UBadge
            v-if="Object.keys(componentProps).length > 0"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ Object.keys(componentProps).length }} {{ Object.keys(componentProps).length === 1 ? 'prop' : 'props' }}
          </UBadge>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <!-- Add Slot -->
          <UTooltip text="Add slot">
            <UButton
              v-if="slots.length > 1"
              variant="ghost"
              size="xs"
              icon="i-lucide-plus"
              :disabled="!isEditable"
              aria-label="Add slot"
              @click="onAddSlot"
            />
          </UTooltip>

          <!-- Edit Props -->
          <UPopover v-model:open="openPropsPopover">
            <UTooltip
              text="Edit props"
              :disabled="openPropsPopover"
            >
              <UButton
                variant="ghost"
                size="xs"
                icon="i-lucide-settings"
                :disabled="!isEditable"
                aria-label="Edit props"
                @click.stop
              />
            </UTooltip>

            <template #content>
              <UCard>
                <div class="text-sm font-medium text-highlighted mb-3">
                  Component Props
                </div>
                <div class="text-xs text-muted">
                  Props editor will be implemented soon...
                </div>
              </UCard>
            </template>
          </UPopover>

          <!-- Delete Component -->
          <UTooltip text="Delete">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-lucide-trash"
              :disabled="!isEditable"
              aria-label="Delete"
              @click="onDelete"
            />
          </UTooltip>
        </div>
      </div>
    </div>
    <!-- Component Content (Slots) -->
    <div
      v-if="hasSlots"
      v-show="!collapsed"
      class="ml-5 mt-2"
    >
      <NodeViewContent ref="nodeViewContent" />
    </div>
  </NodeViewWrapper>
</template>
