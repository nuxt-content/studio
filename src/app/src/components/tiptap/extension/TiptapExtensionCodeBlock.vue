<script setup lang="ts">
import { computed } from 'vue'
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

const nodeProps = defineProps(nodeViewProps)

const isEditable = computed(() => nodeProps.editor.isEditable)

const languages = ['diff', 'json', 'js', 'ts', 'css', 'bash', 'html', 'md', 'yaml', 'vue', 'mdc', 'sql', 'text']

const selectedLanguage = computed({
  get: () => nodeProps.node.attrs.language,
  set: language => nodeProps.updateAttributes({ language }),
})

const filename = computed({
  get: () => nodeProps.node.attrs.filename,
  set: filename => nodeProps.updateAttributes({ filename }),
})
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="section-code-block my-3"
  >
    <div
      class="group relative rounded-lg border border-default overflow-hidden transition-all duration-200 hover:border-accented"
    >
      <div
        :contenteditable="false"
        class="flex items-center gap-2 px-2 py-1.5 bg-muted/40 border-b border-default"
      >
        <USelect
          v-model="selectedLanguage"
          name="language"
          size="xs"
          :disabled="!isEditable"
          :items="languages"
          class="shrink-0"
        />
        <UInput
          v-model="filename"
          :disabled="!isEditable"
          class="flex-1 font-mono text-xs min-w-0 max-w-1/3"
          placeholder="filename.js"
          size="xs"
        />
      </div>

      <p class="bg-muted p-2 font-mono text-sm overflow-auto">
        <NodeViewContent class="outline-none" />
      </p>
    </div>
  </NodeViewWrapper>
</template>
