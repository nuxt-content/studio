<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui/components/Breadcrumb.vue.d.ts'
import type { DropdownMenuItem } from '@nuxt/ui/components/DropdownMenu.vue.d.ts'
import { computed, unref } from 'vue'
import type { TreeItem } from '../../../types'
import { useStudio } from '../../../composables/useStudio'
import { findParentFromId, ROOT_ITEM } from '../../../utils/tree'
import { FEATURE_DISPLAY_MAP } from '../../../utils/context'
import { DraftStatus } from '../../../types/draft'

const { context } = useStudio()

const currentItem = computed(() => context.featureTree.value.currentItem.value)
const tree = computed(() => context.featureTree.value.root.value)

const items = computed<BreadcrumbItem[]>(() => {
  const rootItem = {
    label: FEATURE_DISPLAY_MAP[context.featureTree.value.type as keyof typeof FEATURE_DISPLAY_MAP],
    onClick: () => {
      // TODO: update for ROOT_DOCUMENT_ITEM and ROOT_MEDIA_ITEM
      context.featureTree.value.select(ROOT_ITEM)
    },
  }

  if (currentItem.value.id === ROOT_ITEM.id) {
    return [rootItem]
  }

  const breadcrumbItems: BreadcrumbItem[] = []

  let currentTreeItem: TreeItem | null = unref(currentItem.value)
  while (currentTreeItem) {
    const itemToSelect = currentTreeItem
    breadcrumbItems.unshift({
      label: currentTreeItem.name,
      onClick: async () => {
        await context.featureTree.value.select(itemToSelect)
      },
    })

    currentTreeItem = findParentFromId(tree.value, currentTreeItem.id)
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
  <div class="flex gap-2">
    <UBreadcrumb
      :items="items"
      color="neutral"
    >
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
    <ItemBadge
      v-if="currentItem.status && currentItem.status !== DraftStatus.Opened"
      :status="currentItem.status"
    />
  </div>
</template>
