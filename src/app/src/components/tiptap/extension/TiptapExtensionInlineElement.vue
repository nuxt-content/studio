<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nodeViewProps, NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3'
import { kebabCase, titleCase } from 'scule'
import { useI18n } from 'vue-i18n'
import { useStudio } from '../../../composables/useStudio'
import { isEmpty } from '../../../utils/object'
import { standardNuxtUIComponents } from '../../../utils/tiptap/editor'
import TiptapComponentProps from '../TiptapComponentProps.vue'

const nodeProps = defineProps(nodeViewProps)

const { host } = useStudio()
const { t } = useI18n()

const isPopoverOpen = ref(false)
const componentTag = computed(() => nodeProps.node.attrs.tag)
const componentName = computed(() => titleCase(componentTag.value).replace(/^U /, ''))
const componentMeta = computed(() => host.meta.getComponents().find(c => kebabCase(c.name) === kebabCase(componentTag.value)))
const defaultSlot = computed(() => (componentMeta.value?.meta?.slots || []).find(s => s.name === 'default'))
const hasDefaultSlot = computed(() => !isEmpty(defaultSlot.value as never))
const activeTab = ref<'content' | 'props'>(hasDefaultSlot.value ? 'content' : 'props')

// Sync content value when node changes
const contentValue = ref(nodeProps.node.textContent)
watch(() => nodeProps.node.textContent, (text) => {
  contentValue.value = text
})

// Nuxt UI Components bindings
const nuxtUIComponent = computed(() => standardNuxtUIComponents[componentTag.value])
const displayName = computed(() => nuxtUIComponent.value?.name || componentName.value)
const displayIcon = computed(() => nuxtUIComponent.value?.icon || 'i-lucide-box')

function applyContent() {
  const pos = nodeProps.getPos() as number
  const text = contentValue.value?.trim()

  if (isEmpty(text)) {
    nodeProps.editor.chain().deleteRange({
      from: pos,
      to: pos + nodeProps.node.nodeSize,
    }).run()
  }
  else {
    nodeProps.editor.chain().insertContentAt({
      from: pos + 1,
      to: pos + nodeProps.node.nodeSize,
    }, text).run()
  }
  isPopoverOpen.value = false
}

function updateComponentProps(props: Record<string, unknown>) {
  nodeProps.updateAttributes({ props })
}

function deleteElement() {
  const pos = nodeProps.getPos() as number
  const transaction = nodeProps.editor.state.tr.delete(pos, pos + nodeProps.node.nodeSize)
  nodeProps.editor.view.dispatch(transaction)
  isPopoverOpen.value = false
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    applyContent()
  }
}
</script>

<template>
  <NodeViewWrapper as="span">
    <div
      class="group inline-flex items-center gap-1 border border-default rounded-md text-muted px-2 mx-0.5 hover:bg-muted transition-colors cursor-pointer"
      :contenteditable="false"
      @click="isPopoverOpen = true"
    >
      <UIcon
        :name="displayIcon"
        class="size-3 shrink-0 text-muted group-hover:text-default my-2"
        :class="{ 'text-default': isPopoverOpen }"
      />
      <div
        v-if="isEmpty(contentValue)"
        class="text-xs text-muted"
      >
        {{ displayName }}
      </div>
      <NodeViewContent
        class="text-sm text-default truncate! max-w-40"
        as="span"
      />
    </div>

    <UPopover
      v-model:open="isPopoverOpen"
      :ui="{ content: 'p-0' }"
    >
      <span />
      <template #content>
        <div class="flex flex-col min-w-80">
          <!-- Header with tabs -->
          <div class="flex items-center justify-between border-b border-default px-2 py-1.5">
            <div class="flex items-center gap-2">
              <UIcon
                :name="displayIcon"
                class="size-4 text-muted"
              />
              <span class="text-sm font-medium text-highlighted">
                {{ displayName }}
              </span>
            </div>

            <div class="flex items-center gap-0.5">
              <UTooltip
                v-if="hasDefaultSlot"
                :text="t('studio.tiptap.inlineElement.editContent')"
              >
                <UButton
                  icon="i-lucide-text-cursor"
                  :color="activeTab === 'content' ? 'primary' : 'neutral'"
                  :variant="activeTab === 'content' ? 'soft' : 'ghost'"
                  size="xs"
                  @click="activeTab = 'content'"
                />
              </UTooltip>

              <UTooltip :text="t('studio.tiptap.inlineElement.editProps')">
                <UButton
                  icon="i-lucide-sliders-horizontal"
                  :color="activeTab === 'props' ? 'primary' : 'neutral'"
                  :variant="activeTab === 'props' ? 'soft' : 'ghost'"
                  size="xs"
                  @click="activeTab = 'props'"
                />
              </UTooltip>

              <USeparator
                orientation="vertical"
                class="h-5 mx-1"
              />

              <UTooltip :text="t('studio.tiptap.inlineElement.delete')">
                <UButton
                  icon="i-lucide-trash"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="deleteElement"
                />
              </UTooltip>
            </div>
          </div>

          <!-- Edit Content -->
          <div
            v-if="activeTab === 'content' && hasDefaultSlot"
            class="p-0.5 min-w-[400px] max-w-[500px]"
          >
            <UInput
              v-model="contentValue"
              autofocus
              variant="none"
              name="content"
              leading-icon="i-lucide-type"
              class="w-full"
              :placeholder="t('studio.tiptap.inlineElement.enterContentPlaceholder')"
              :ui="{ root: 'w-full' }"
              @keydown="handleKeyDown"
            >
              <div class="flex items-center mr-0.5">
                <UTooltip :text="t('studio.tiptap.inlineElement.apply')">
                  <UButton
                    icon="i-lucide-corner-down-left"
                    variant="ghost"
                    size="sm"
                    @click="applyContent"
                  />
                </UTooltip>
              </div>
            </UInput>
          </div>

          <!-- Edit props -->
          <div
            v-else-if="activeTab === 'props'"
            class="max-h-96 overflow-y-auto"
          >
            <TiptapComponentProps
              :node="nodeProps.node"
              hide-title
              :update-props="updateComponentProps"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </NodeViewWrapper>
</template>
