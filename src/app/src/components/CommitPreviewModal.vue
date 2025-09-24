<!-- <script setup lang="ts">
import { ref, watch } from 'vue'
import ReviewPanel from './ReviewPanel.vue'
import { useStudio } from '../composables/useStudio'
import type { DraftItem } from '../types'
// import { useToast } from '@nuxt/ui/composables/useToast'

const modelValue = defineModel<any>()

// const props = defineProps({
//   content: {
//     type: Object,
//   },
// })

const preview = useStudio()
// const toast = useToast()

const loading = ref(false)
const filesToReview = ref<DraftItem[]>([])

async function prepareReview() {
  loading.value = true
  filesToReview.value = await Promise.all(preview.draft.list.value.map(async ({ id }) => {
    const draft = await preview.draft.get(id, { generateContent: true })
    return {
      ...draft,
      markdown: draft.content!,
      original: draft.originalGithubFile?.content ? atob(draft.originalGithubFile.content) : '',
    }
  }))
  loading.value = false
}

// const emit = defineEmits(['commit'])

const commitMessage = ref('')
const commiting = ref(false)

async function commitChanges() {
  commiting.value = true

  try {
    const files = filesToReview.value

    await preview.git.commitFiles(files, commitMessage.value || `Chnaged ${files.length} files`)

    // toast.add({
    //   title: 'Changes committed',
    //   description: 'Changes committed to the repository',
    //   color: 'green',
    // })

    await preview.draft.revertAll()
    modelValue.value = false
  }
  catch (e) {
    // toast.add({
    //   title: 'Error',
    //   description: 'Error committing changes',
    //   color: 'red',
    // })
  }
  finally {
    commiting.value = false
  }
}

watch(modelValue, () => {
  if (modelValue.value) {
    prepareReview()
  }
})
</script>

<template>
  <UModal
    v-model:open="modelValue"
    :close="false"
    :portal="false"
    :ui="{ body: '!p-0', content: 'w-[80vw] h-[80vh] max-w-none max-h-none' }"
  >
    <template #header>
      <UInput
        v-model="commitMessage"
        :disabled="commiting"
        color="primary"
        placeholder="Commit message"
      />
      <UButton
        label="Commit Changes"
        :loading="commiting"
        @click="commitChanges"
      />
    </template>
    <template #body>
      <div class="h-full overflow-hidden">
        <ReviewPanel
          :changed-files="filesToReview"
          :db-files="[]"
        />
      </div>
    </template>
  </UModal>
</template> -->
