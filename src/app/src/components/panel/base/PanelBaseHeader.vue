<script setup lang="ts">
import { useStudio } from '../../../composables/useStudio'
import { StudioFeature } from '../../../types'
import { ROOT_ITEM } from '../../../utils/tree'

const { ui, context, tree } = useStudio()

const features = [{
  label: 'Content',
  icon: 'i-lucide-files',
  onClick: () => {
    if (context.feature.value === StudioFeature.Content) {
      tree.selectItem(ROOT_ITEM)
      return
    }

    ui.openPanel(StudioFeature.Content)
  },
}, {
  label: 'Media',
  icon: 'i-lucide-image',
  onClick: () => {
    if (context.feature.value === StudioFeature.Media) {
      tree.selectItem(ROOT_ITEM)
      return
    }

    ui.openPanel(StudioFeature.Media)
  },
},
{
  label: 'Config',
  icon: 'i-lucide-settings',
  onClick: () => {
    if (context.feature.value === StudioFeature.Config) {
      tree.selectItem(ROOT_ITEM)
      return
    }

    ui.openPanel(StudioFeature.Config)
  },
}]
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
      />
      <!-- <USeparator
        orientation="vertical"
        class="h-8"
      /> -->
    </template>
  </UHeader>
</template>
