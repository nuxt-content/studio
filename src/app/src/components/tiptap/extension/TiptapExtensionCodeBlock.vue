<template>
  <NodeViewWrapper
    as="div"
    class="section-code-block my-3"
  >
    <div
      class="group relative rounded-md border border-transparent cursor-pointer transition-all duration-150"
    >
      <div
        :contenteditable="false"
        class="absolute top-0.5 right-0.5 z-10 flex items-center gap-2 rounded-md border border-muted bg-muted/60 backdrop-blur px-0.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
      >
        <USelect
          v-model="selectedLanguage"
          name="language"
          size="xs"
          :disabled="!isEditable"
          :items="languages || []"
          class="pointer-events-auto"
        />
        <UInput
          v-model="filename"
          :disabled="!isEditable"
          class="font-mono text-xs w-36 pointer-events-auto"
          color="white"
          placeholder="filename.js"
          size="xs"
        />
      </div>

      <pre
        :draggable="false"
        class="border rounded-md bg-muted/30 px-3 py-2 !pt-6 font-mono text-xs overflow-auto"
      ><NodeViewContent class="outline-none" /></pre>
    </div>
  </NodeViewWrapper>
</template>

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