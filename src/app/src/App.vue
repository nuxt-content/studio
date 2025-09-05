<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue'
import PreviewEditor from './components/PreviewEditor.vue'
import ContentsListModal from './components/ContentsListModal.vue'
import { useStudio } from './composables/useStudio'
import StudioToolbar from './components/StudioToolbar.vue'
// import CommitPreviewModal from './components/CommitPreviewModal.vue'

const { host, draftFiles } = useStudio()

const activeDocuments = ref<{ id: string, label: string, value: string }[]>([])

const selectedContentId = ref<string | null>(null)
const selectedContent = ref<any | null>(null)

const ui = reactive({
  editorVisibility: false,
  commitPreviewVisibility: false,
  contentsListVisibility: false,
})

const contentItems = computed(() => {
  const items = []
  if (activeDocuments.value.length > 0) {
    items.unshift(
      activeDocuments.value,
    )
  }

  if (draftFiles.list.value.length > 0) {
    items.push([
      {
        label: `Drafts (${draftFiles.list.value.length})`,
        children: draftFiles.list.value.map((draft) => {
          return {
            label: draft.id,
            value: draft.id,
            onSelect: () => {
              onContentSelect(draft.id)
            },
          }
        }),
      },
    ])
  }

  items.push([{
    id: 'show-all-contents',
    label: 'Show all contents',
    value: 'show-all-contents',
    onSelect: () => {
      ui.contentsListVisibility = true
    },
  }])

  return items
})

const isSidebarOpen = computed(() => {
  return ui.editorVisibility
})

watch(isSidebarOpen, (value) => {
  if (value) {
    host.ui.expandSidebar()
  }
  else {
    host.ui.collapseSidebar()
  }
})

async function onContentSelect(id: string) {
  selectedContentId.value = id
  selectedContent.value = await host.document.get(id)
  ui.editorVisibility = true
}
function onEditorUpdate(content: any) {
  draftFiles.upsert(selectedContentId.value!, content)
}
function onRevert() {
  draftFiles.revert(selectedContentId.value!)
}

function detectActiveDocuments() {
  activeDocuments.value = host.document.detectActives().map((content) => {
    return {
      id: content.id,
      label: content.title,
      value: content.id,
      onSelect: () => {
        onContentSelect(content.id)
      },
    }
  })
}

host.on.mounted(() => {
  detectActiveDocuments()
  host.on.routeChange(() => {
    setTimeout(() => {
      detectActiveDocuments()
    }, 100)
  })
})
</script>

<template>
  <Suspense>
    <UApp :toaster="{ portal: false }">
      <div
        id="root"
        class="dark"
      >
        <div>
          <StudioToolbar>
            <template #left>
              <UDropdownMenu
                :portal="false"
                :items="contentItems"
                placeholder="Select a content"
              >
                <UButton
                  label="Contents"
                  icon="i-ph-list"
                  color="neutral"
                  variant="ghost"
                />
              </UDropdownMenu>
            </template>
            <template #right>
              <UButton
                label="Save Changes"
                color="primary"
                variant="solid"
                :disabled="!draftFiles.list.value.length"
                @click="ui.commitPreviewVisibility = true"
              />
            </template>
          </StudioToolbar>

          <PreviewEditor
            v-model="ui.editorVisibility"
            :content="selectedContent"
            :markdown="'selectedContent.markdown'"
            @update:content="onEditorUpdate"
            @revert="onRevert"
          />
          <CommitPreviewModal
            v-model="ui.commitPreviewVisibility"
          />
          <ContentsListModal
            v-model="ui.contentsListVisibility"
            @update:content="onEditorUpdate"
            @select="onContentSelect"
          />
        </div>
      </div>
    </UApp>
  </Suspense>
  <!-- </div> -->
</template>
