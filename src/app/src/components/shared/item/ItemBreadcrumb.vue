<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui/components/Breadcrumb.vue.d.ts'
import type { DropdownMenuItem } from '@nuxt/ui/components/DropdownMenu.vue.d.ts'
import { computed, unref } from 'vue'
import { type TreeItem, TreeStatus } from '../../../types'
import { useStudio } from '../../../composables/useStudio'
import { findParentFromFsPath } from '../../../utils/tree'
import { useI18n } from 'vue-i18n'

const { context } = useStudio()
const { t } = useI18n()

const currentItem = computed(() => context.activeTree.value.currentItem.value)
const tree = computed(() => context.activeTree.value.root.value)

const items = computed<BreadcrumbItem[]>(() => {
  const rootTreeItem = context.activeTree.value.rootItem.value
  const rootBreadcrumbItem = {
    icon: 'i-lucide-folder-git',
    label: t(`studio.nav.${rootTreeItem.name.toLowerCase()}`, rootTreeItem.name),
    onClick: () => {
      context.activeTree.value.select(rootTreeItem)
    },
  }

  if (currentItem.value.fsPath === rootTreeItem.fsPath) {
    return [rootBreadcrumbItem]
  }

  const breadcrumbItems: BreadcrumbItem[] = []

  let currentTreeItem: TreeItem | null = unref(currentItem.value)
  while (currentTreeItem) {
    const itemToSelect = currentTreeItem
    breadcrumbItems.unshift({
      label: currentTreeItem.name,
      onClick: async () => {
        await context.activeTree.value.select(itemToSelect)
      },
    })

    currentTreeItem = findParentFromFsPath(tree.value, currentTreeItem.fsPath)
  }

  const allItems = [rootBreadcrumbItem, ...breadcrumbItems]

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
  <div class="flex items-center gap-1 overflow-hidden">
    <UBreadcrumb
      :items="items"
      color="neutral"
      :ui="{ link: 'text-sm', list: 'gap-0.5', separatorIcon: 'size-3', linkLeadingIcon: 'size-4' }"
    >
      <template #ellipsis="{ item }: { item: DropdownMenuItem }">
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
      v-if="currentItem.status && currentItem.status !== TreeStatus.Opened"
      :status="currentItem.status"
      size="xs"
    />
  </div>
</template>
