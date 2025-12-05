<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { ref, computed, watch } from 'vue'
import { useStudio } from '../../../composables/useStudio'
import { useMonaco } from '../../../composables/useMonaco'
import { jsonToYaml, yamlToJson } from '../../../utils/data'

const nodeProps = defineProps(nodeViewProps)

const { ui } = useStudio()

const editorRef = ref<HTMLElement>()
const collapsed = ref(true)
const loadingMonaco = ref(true)

const textColor = computed(() => collapsed.value ? 'text-muted group-hover/header:text-default' : 'text-default')

const frontmatter = computed({
  get: () => {
    return jsonToYaml(nodeProps.node.attrs.frontmatter)
  },
  set: (value) => {
    return nodeProps.updateAttributes({ frontmatter: yamlToJson(value) })
  },
})

let monaco: ReturnType<typeof useMonaco> | null = null
watch(collapsed, async (isCollapsed) => {
  if (isCollapsed) {
    return
  }

  if (!monaco) {
    monaco = useMonaco(editorRef, {
      language: 'yaml',
      initialContent: frontmatter.value,
      readOnly: false,
      colorMode: ui.colorMode,
      onChange(value: string) {
        frontmatter.value = value
      },
    })

    loadingMonaco.value = false
  }
})

watch(frontmatter, () => {
  if (monaco) {
    monaco.setContent(frontmatter.value || '')
  }
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
        :initial-height="100"
        class="mt-1 border-l-2 shadow-xs border-dashed border-muted bg-muted/30 overflow-hidden"
      >
        <div
          ref="editorRef"
          class="w-full h-full overflow-hidden"
        />
      </ResizableElement>
    </div>
    <NodeViewContent />
  </NodeViewWrapper>
</template>
