<script setup lang="ts">
import { ref, computed } from 'vue'
import { TextSelection } from 'prosemirror-state'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'
import { titleCase, kebabCase } from 'scule'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useStudio } from '../../../composables/useStudio'
import { standardNuxtUIComponents } from '../../../utils/tiptap/editor'

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
const componentMeta = computed(() => host.meta.getComponents().find(c => kebabCase(c.name) === kebabCase(componentTag.value)))

// Nuxt UI Components bindings
const nuxtUIComponent = computed(() => standardNuxtUIComponents[componentTag.value])
const displayName = computed(() => nuxtUIComponent.value?.name || componentName.value)
const displayIcon = computed(() => nuxtUIComponent.value?.icon || 'i-lucide-box')

const availableSlots = computed(() => componentMeta.value?.meta.slots.map(s => s.name) || ['default'])
const usedSlots = computed(() => {
  const slots = (node.value.content?.content || []) as ProseMirrorNode[]
  return slots.map(s => s.attrs.name)
})
const hasUnusedSlots = computed(() => availableSlots.value.some(s => !usedSlots.value.includes(s)))

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

function updateComponentProps(props: Record<string, unknown>) {
  nodeProps.updateAttributes({ props })
}
</script>

<template>
  <NodeViewWrapper as="div">
    <div
      class="my-3"
      :contenteditable="false"
    >
      <div
        class="group flex items-center justify-between px-2 py-1.5 rounded-md border border-transparent hover:border-muted hover:bg-muted/50 cursor-pointer transition-all duration-150"
        @click="onToggleCollapse"
      >
        <div class="flex items-center gap-2">
          <UIcon
            v-if="hasSlots"
            :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            size="xs"
            class="text-muted group-hover:text-default transition-all duration-150"
            :class="{ 'text-dimmed': collapsed }"
          />
          <UIcon
            v-else
            :name="displayIcon"
            size="xs"
            class="text-muted group-hover:text-default transition-colors duration-150"
            :class="{ 'text-dimmed': collapsed }"
          />

          <span
            class="text-xs font-mono font-medium text-muted group-hover:text-default transition-colors duration-150"
            :class="{ 'text-dimmed': collapsed }"
          >
            {{ displayName }}
          </span>

          <UBadge
            v-if="Object.keys(componentProps).length > 0"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ Object.keys(componentProps).length }} {{ Object.keys(componentProps).length === 1 ? $t('studio.tiptap.element.prop') : $t('studio.tiptap.element.props') }}
          </UBadge>
        </div>

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <UTooltip :text="$t('studio.tiptap.element.addSlot')">
            <UButton
              v-if="slots.length > 1 && hasUnusedSlots"
              variant="ghost"
              size="2xs"
              class="text-muted hover:text-default"
              icon="i-lucide-plus"
              :disabled="!isEditable"
              :aria-label="$t('studio.tiptap.element.addSlot')"
              @click="onAddSlot"
            />
          </UTooltip>

          <UPopover v-model:open="openPropsPopover">
            <UTooltip
              :text="$t('studio.tiptap.element.editProps')"
              :disabled="openPropsPopover"
            >
              <UButton
                variant="ghost"
                size="2xs"
                class="text-muted hover:text-default"
                icon="i-lucide-settings"
                :disabled="!isEditable"
                :aria-label="$t('studio.tiptap.element.editProps')"
                @click.stop
              />
            </UTooltip>

            <template #content>
              <TiptapComponentProps
                :node="node"
                :update-props="updateComponentProps"
              />
            </template>
          </UPopover>

          <UTooltip :text="$t('studio.tiptap.element.delete')">
            <UButton
              variant="ghost"
              size="2xs"
              class="text-muted hover:text-default"
              icon="i-lucide-trash"
              :disabled="!isEditable"
              :aria-label="$t('studio.tiptap.element.delete')"
              @click="onDelete"
            />
          </UTooltip>
        </div>
      </div>
    </div>
    <div
      v-if="hasSlots"
      v-show="!collapsed"
      class="ml-5 mt-2"
    >
      <NodeViewContent ref="nodeViewContent" />
    </div>
  </NodeViewWrapper>
</template>
