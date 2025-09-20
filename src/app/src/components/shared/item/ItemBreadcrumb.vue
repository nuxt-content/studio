<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui/components/Breadcrumb.vue.d.ts'
import type { DropdownMenuItem } from '@nuxt/ui/components/DropdownMenu.vue.d.ts'
import { computed, type PropType, unref } from 'vue'
import type { TreeItem } from '../../../types'
import { useStudio } from '../../../composables/useStudio'
import { findParentFromId, ROOT_ITEM } from '../../../utils/tree'
import { FEATURE_DISPLAY_MAP } from '../../../utils/context'

const { tree: treeApi, context } = useStudio()

const props = defineProps({
  currentItem: {
    type: Object as PropType<TreeItem>,
    required: true,
  },
  tree: {
    type: Array as PropType<TreeItem[]>,
    default: () => [],
  },
})

const items = computed<BreadcrumbItem[]>(() => {
  const rootItem = {
    label: FEATURE_DISPLAY_MAP[context.feature.value as keyof typeof FEATURE_DISPLAY_MAP],
    onClick: () => {
      treeApi.selectItem(ROOT_ITEM)
    },
  }

  if (props.currentItem.id === ROOT_ITEM.id) {
    return [rootItem]
  }

  const breadcrumbItems: BreadcrumbItem[] = []

  let currentTreeItem: TreeItem | null = unref(props.currentItem)
  while (currentTreeItem) {
    const itemToSelect = currentTreeItem
    breadcrumbItems.unshift({
      label: currentTreeItem.name,
      onClick: async () => {
        await treeApi.selectItem(itemToSelect)
      },
    })

    currentTreeItem = findParentFromId(props.tree, currentTreeItem.id)
  }

  const allItems = [rootItem, ...breadcrumbItems]

  // Handle ellipsis dropdown
  if (allItems.length > 3) {
    const firstItem = allItems[0]
    const lastItem = allItems[allItems.length - 1]
    const hiddenItems = allItems.slice(1, -1)

    const dropdownItems: DropdownMenuItem[] = hiddenItems.map(item => ({
      label: item.label,
      onSelect: item.onClick,
    }))

    return [
      firstItem,
      {
        slot: 'ellipsis',
        icon: 'i-lucide-ellipsis',
        children: dropdownItems,
      },
      lastItem,
    ]
  }

  return allItems
})
</script>

<template>
  <UBreadcrumb :items="items">
    <template #ellipsis="{ item }">
      <UDropdownMenu :items="item.children">
        <UButton
          :icon="item.icon"
          color="neutral"
          variant="link"
          class="p-0.5"
        />
      </UDropdownMenu>
    </template>
  </UBreadcrumb>
</template>
