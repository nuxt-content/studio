<script setup lang="ts">
import { useStudio } from '../../../composables/useStudio'

const { ui, context, tree } = useStudio()

const features = [{
  label: 'Content',
  icon: 'i-lucide-files',
  onClick: () => {
    if (context.feature.value === 'content') {
      tree.selectItem(null)
      return
    }

    ui.openPanel('content')
  },
}, {
  label: 'Media',
  icon: 'i-lucide-image',
  onClick: () => {
    if (context.feature.value === 'media') {
      return
    }

    ui.openPanel('media')
  },
},
{
  label: 'Config',
  icon: 'i-lucide-settings',
  onClick: () => {
    if (context.feature.value === 'config') {
      return
    }

    ui.openPanel('config')
  },
}]
</script>

<template>
  <UHeader class="">
    <template #title>
      <div class="flex gap-2">
        <UNavigationMenu
          :items="features"
          size="sm"
          highlight
        />
      </div>
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
