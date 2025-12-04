<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { decompressTree } from '@nuxt/content/runtime'
import type { MarkdownRoot } from '@nuxt/content'
import type { DatabaseDataItem, DatabasePageItem, DraftItem, DatabaseItem } from '../../types'
import { DraftStatus, ContentFileExtension } from '../../types'
import { useStudio } from '../../composables/useStudio'
import { useStudioState } from '../../composables/useStudioState'
import { fromBase64ToUTF8 } from '../../utils/string'
import { areContentEqual } from '../../utils/content'

const props = defineProps({
  draftItem: {
    type: Object as PropType<DraftItem>,
    required: true,
  },
  readOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const { context, host } = useStudio()
const { preferences } = useStudioState()

const isAutomaticFormattingDetected = ref(false)
const showAutomaticFormattingDiff = ref(false)
const originalContent = ref<string>('')
const formattedContent = ref<string>('')

function toggleDiffView(show: boolean) {
  showAutomaticFormattingDiff.value = show
}

const document = computed<DatabaseItem>({
  get() {
    if (!props.draftItem) {
      return {} as DatabasePageItem
    }

    if (props.draftItem.status === DraftStatus.Deleted) {
      return props.draftItem.original as DatabasePageItem
    }

    let doc: DatabaseItem = props.draftItem.modified as DatabaseItem

    // Page type
    if ((doc as DatabasePageItem).body?.type === 'minimark') {
      doc = {
        ...doc,
        body: decompressTree((doc as DatabasePageItem).body),
      }
    }

    // Data type
    if (((doc as DatabaseDataItem).meta?.body as MarkdownRoot)?.type === 'minimark') {
      doc = {
        ...doc,
        meta: {
          ...doc.meta,
          body: decompressTree((doc as DatabaseDataItem).meta?.body as MarkdownRoot),
        },
      }
    }

    return doc
  },
  set(value) {
    if (props.readOnly) {
      return
    }

    context.activeTree.value.draft.update(props.draftItem.fsPath, value)
  },
})

watch(() => props.draftItem.fsPath, async () => {
  isAutomaticFormattingDetected.value = false
  showAutomaticFormattingDiff.value = false

  if (props.draftItem.original && props.draftItem.remoteFile?.content) {
    const generateContentFromDocument = host.document.generate.contentFromDocument
    const localOriginal = await generateContentFromDocument(props.draftItem.original as DatabaseItem) as string
    const remoteOriginal = props.draftItem.remoteFile.encoding === 'base64'
      ? fromBase64ToUTF8(props.draftItem.remoteFile.content!)
      : props.draftItem.remoteFile.content!

    isAutomaticFormattingDetected.value = !areContentEqual(localOriginal, remoteOriginal)
    if (isAutomaticFormattingDetected.value) {
      originalContent.value = remoteOriginal
      formattedContent.value = localOriginal
    }
  }
}, { immediate: true })

const language = computed(() => {
  switch (document.value?.extension) {
    case ContentFileExtension.Markdown:
      return 'mdc'
    case ContentFileExtension.YAML:
    case ContentFileExtension.YML:
      return 'yaml'
    case ContentFileExtension.JSON:
      return 'javascript'
    default:
      return 'text'
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <ContentEditorConflict
      v-if="draftItem.conflict"
      :draft-item="draftItem"
    />
    <template v-else>
      <MDCFormattingBanner
        v-if="isAutomaticFormattingDetected"
        show-action
        class="flex-none"
        @show-diff="toggleDiffView"
      />
      <ContentEditorDiff
        v-if="showAutomaticFormattingDiff"
        :language="language"
        :original-content="originalContent"
        :formatted-content="formattedContent"
        class="flex-1"
      />
      <template v-else>
        <ContentEditorTipTap
          v-if="preferences.editorMode === 'tiptap' && document.extension === ContentFileExtension.Markdown"
          v-model="document"
          :draft-item="draftItem"
          class="flex-1"
        />
        <ContentEditorCode
          v-else
          v-model="document"
          :draft-item="draftItem"
          :read-only="readOnly"
          class="flex-1"
        />
      </template>
    </template>
  </div>
</template>
