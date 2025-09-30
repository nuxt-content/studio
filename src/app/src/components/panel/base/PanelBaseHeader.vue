<script setup lang="ts">
import { useStudio } from '../../../composables/useStudio'
import { StudioFeature } from '../../../types'
import { ROOT_ITEM } from '../../../utils/tree'

const { ui, git, context, documentTree, mediaTree, draftDocuments, draftMedias } = useStudio()

const features = [{
  label: 'Content',
  icon: 'i-lucide-files',
  onClick: () => {
    if (context.feature.value === StudioFeature.Content) {
      documentTree.select(ROOT_ITEM)
      return
    }

    ui.openPanel(StudioFeature.Content)
  },
}, {
  label: 'Media',
  icon: 'i-lucide-image',
  onClick: () => {
    if (context.feature.value === StudioFeature.Media) {
      mediaTree.select(ROOT_ITEM)
      return
    }

    ui.openPanel(StudioFeature.Media)
  },
}]

async function publishFiles() {
  const files = await Promise.all([
    draftDocuments.generateRawFiles(),
    draftMedias.generateRawFiles(),
  ]).then(([documents, medias]) => ([...documents, ...medias]))

  const message = window.prompt('Enter a commit message')
  await git.commitFiles(files, message || 'Publish files')
}
</script>

<template>
  <UHeader>
    <template #title>
      <UNavigationMenu
        :items="features"
        highlight
      />
    </template>

    <template #right>
      <UButton
        label="Publish"
        icon="i-lucide-save"
        color="primary"
        variant="solid"
        size="sm"
        @click="publishFiles"
      />
      <!-- <USeparator
        orientation="vertical"
        class="h-8"
      /> -->
    </template>
  </UHeader>
</template>
