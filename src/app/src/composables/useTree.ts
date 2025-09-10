import type { StudioHost, TreeItem } from '../types'
import { ref, watch, computed } from 'vue'
import type { useDraft } from './useDraft'
import { buildTree } from '../utils/draft'

export function useTree(host: StudioHost, draft: ReturnType<typeof useDraft>) {
  const tree = ref<TreeItem[]>([])
  const currentItem = ref<TreeItem | null>(null)

  const currentTree = computed(() => {
    console.log('🔍 currentTree computed triggered', { currentItem: currentItem.value, treeLength: tree.value.length })
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

  function selectItem(item: TreeItem) {
    console.log('🎯 selectItem', item)
    currentItem.value = item
  }

  watch(draft.list, async (draftItems) => {
    console.log('🔍 draft.list watcher triggered', { draftItemsLength: draftItems.length })
    const list = await host.document.list()
    tree.value = buildTree(list, draftItems)
  })

  // watch(currentTree, (newTree) => {
  //   console.log('🌳 currentTree computed result changed:', newTree?.length)
  // })

  return {
    current: currentTree,
    currentItem,
    selectItem,
  }
}
