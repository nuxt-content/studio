import type { StudioHost, TreeItem } from '../types'
import { ref, watch, computed } from 'vue'
import type { useDraftFiles } from './useDraftFiles'
import { findParentFromId, buildTree } from '../utils/tree'

export function useTree(host: StudioHost, draftFiles: ReturnType<typeof useDraftFiles>) {
  const tree = ref<TreeItem[]>([])
  const currentItem = ref<TreeItem | null>(null)

  const currentTree = computed<TreeItem[]>(() => {
    // If no files is selected
    if (!currentItem.value) {
      return tree.value
    }

    let subTree = tree.value
    const parts = currentItem.value.path.split('/').filter(Boolean)
    for (let i = 0; i < parts.length; i++) {
      const fileName = parts[i]
      const file = subTree.find(f => f.name === fileName) as TreeItem
      if (file) {
        subTree = file.children!
      }
    }

    return subTree
  })

  const parentItem = computed<TreeItem | null>(() => {
    if (!currentItem.value) return null

    const parent = findParentFromId(tree.value, currentItem.value.id)
    return parent || { name: 'content', path: '../', type: 'directory' } as TreeItem
  })

  function selectItem(item: TreeItem | null) {
    currentItem.value = item
  }

  watch(draftFiles.list, async (draftItems) => {
    const list = await host.document.list()
    tree.value = buildTree(list, draftItems)
  })

  return {
    current: currentTree,
    currentItem,
    parentItem,
    selectItem,
  }
}
