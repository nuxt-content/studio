<script setup lang="ts">
import { ref, computed } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { titleCase } from 'scule'
// import { pascalCase } from 'scule'
// import { tiptapChildrenNodes, tiptapParentNode } from '../../utils/tiptap'
import { useStudio } from '../../../composables/useStudio'

const nodeProps = defineProps(nodeViewProps)

const { host } = useStudio()

const nodeViewContentEl = ref<HTMLElement>()

const isHovered = ref(false)
const isEditable = ref(true) // TODO: Connect to editor state

const slotName = computed({
  get: () => nodeProps.node.attrs.name || 'default',
  set: (value: string | { value: string, label: string }) => {
    const newName = (typeof value === 'string' ? value : value.value) || 'default'
    nodeProps.updateAttributes({ name: newName })
  },
})

const parent = computed(() => {
  const pos = nodeProps.getPos()
  if (typeof pos === 'undefined') return null

  const $pos = nodeProps.editor.state.doc.resolve(pos)
  return $pos.parent
})

const componentMeta = computed(() => host.meta.getComponents().find(c => c.name === parent.value?.attrs.tag))
const slots = computed(() => componentMeta.value?.meta.slots || [])
const showSlotSelection = computed(() => slots.value.length > 1)
const availableSlots = computed(() => slots.value.map(s => s.name))
const isLastRemainingSlot = computed(() => parent.value?.childCount === 1)

function deleteSlot() {
  nodeProps.editor.commands.command(({ tr }) => {
    const pos = nodeProps.getPos()
    if (typeof pos === 'undefined') return false

    tr.delete(pos, pos + nodeProps.node.nodeSize)
    return true
  })
}

function createSlot(_name: string) {
  // slots.push({ label: titleCase(name), value: name })
}
</script>

<template>
  <NodeViewWrapper as="div">
    <div class="my-2">
      <!-- Slot Selector Header -->
      <div
        v-if="showSlotSelection"
        class="flex items-center gap-2 mb-2 group"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
      >
        <!-- Slot Name Selector -->
        <USelectMenu
          v-model="slotName"
          :items="availableSlots"
          :disabled="!isEditable"
          create-item
          placeholder="Search or create a slot..."
          size="xs"
          :ui="{
            base: 'font-mono text-xs text-muted hover:text-default uppercase cursor-pointer ring-0',
            leading: 'ps-0',
          }"
          @create="createSlot"
        >
          <template #leading>
            <span class="text-muted">#</span>
          </template>

          <template #label>
            {{ titleCase(slotName) }}
          </template>

          <template #empty>
            <div class="text-xs text-muted py-2">
              No predefined slots available
            </div>
          </template>
        </USelectMenu>

        <!-- Delete Slot Button -->
        <UTooltip text="Delete slot">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-trash"
            :disabled="!isEditable || isLastRemainingSlot"
            aria-label="Delete slot"
            @click="deleteSlot"
          />
        </UTooltip>
      </div>

      <!-- Slot Content -->
      <div
        class="pl-5 border-l-2 border-dashed border-default"
      >
        <NodeViewContent ref="nodeViewContentEl" />
      </div>
    </div>
  </NodeViewWrapper>
</template>
