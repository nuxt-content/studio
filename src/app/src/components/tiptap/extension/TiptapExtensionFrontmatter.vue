<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { ref, computed } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import type { Draft07 } from '@nuxt/content'

const nodeProps = defineProps(nodeViewProps)

const { host, documentTree } = useStudio()

const collapsed = ref(true)

const textColor = computed(() => collapsed.value ? 'text-muted group-hover/header:text-default' : 'text-default')

const collection = computed(() => {
  const currentItem = documentTree.currentItem.value
  if (!currentItem?.fsPath) return null
  return host.collection.getByFsPath(currentItem.fsPath)
})

const frontmatterJSON = computed({
  get: () => {
    return nodeProps.node.attrs.frontmatter || {}
  },
  set: (value) => {
    nodeProps.updateAttributes({ frontmatter: value })
  },
})
</script>

<template>
  <NodeViewWrapper as="div">
    <div
      class="group mt-4 mb-3 transition-all duration-150"
      contenteditable="false"
    >
      <div
        class="group/header flex items-center justify-between cursor-pointer px-2 py-1.5 border-l-2 border-muted hover:border-accented transition-colors duration-150"
        @click="collapsed = !collapsed"
      >
        <div class="flex items-center gap-1.5">
          <UIcon
            :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            class="w-3.5 h-3.5 transition-colors duration-150"
            :class="textColor"
          />
          <span
            class="text-xs font-medium transition-colors duration-150"
            :class="textColor"
          >
            {{ $t('studio.headings.pageSettings') }}
          </span>
        </div>

        <UIcon
          name="i-lucide-settings"
          class="w-3.5 h-3.5 transition-colors duration-150"
          :class="textColor"
        />
      </div>

      <ResizableElement
        v-show="!collapsed"
        :min-height="100"
        :max-height="500"
        :initial-height="270"
        class="mt-1 border-l-2 shadow-xs border-dashed border-muted bg-muted/30 overflow-hidden"
      >
        <div class="px-4 pt-2 pb-4 overflow-y-auto h-full">
          <FormSchemaBased
            v-model="frontmatterJSON"
            :collection-name="collection!.name"
            :schema="collection!.schema as Draft07"
          />
        </div>
      </ResizableElement>
    </div>
    <NodeViewContent />
  </NodeViewWrapper>
</template>
