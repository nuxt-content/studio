import { StudioFeature, type StudioHost, type TreeItem } from '../types'
import { ref, computed } from 'vue'
import type { useDraftDocuments } from './useDraftDocuments'
import type { useDraftMedias } from './useDraftMedias'
import { buildTree, findItemFromId, findItemFromRoute, ROOT_ITEM, findParentFromId } from '../utils/tree'
import type { RouteLocationNormalized } from 'vue-router'
import { useHooks } from './useHooks'

export const useTree = (type: StudioFeature, host: StudioHost, draft: ReturnType<typeof useDraftDocuments | typeof useDraftMedias>) => {
  const hooks = useHooks()

  const tree = ref<TreeItem[]>([])
  const currentItem = ref<TreeItem>(ROOT_ITEM)

  const currentTree = computed<TreeItem[]>(() => {
    if (currentItem.value.id === ROOT_ITEM.id) {
      return tree.value
    }

    let subTree = tree.value
    const idSegments = currentItem.value.id.split('/').filter(Boolean)
    for (let i = 0; i < idSegments.length; i++) {
      const id = idSegments.slice(0, i + 1).join('/')
      const file = subTree.find(item => item.id === id) as TreeItem
      if (file) {
        subTree = file.children!
      }
    }

    return subTree
  })

  // const parentItem = computed<TreeItem | null>(() => {
  //   if (currentItem.value.id === ROOT_ITEM.id) return null

  //   const parent = findParentFromId(tree.value, currentItem.value.id)
  //   return parent || ROOT_ITEM
  // })

  async function select(item: TreeItem) {
    currentItem.value = item || ROOT_ITEM
    if (item?.type === 'file') {
      if (type === StudioFeature.Content) {
        host.app.navigateTo(item.routePath!)
      }

      await draft.selectById(item.id)
    }
    else {
      draft.select(null)
    }
  }

  async function selectByRoute(route: RouteLocationNormalized) {
    const item = findItemFromRoute(tree.value, route)

    if (!item || item.id === currentItem.value.id) return

    await select(item)
  }

  async function selectItemById(id: string) {
    const treeItem = findItemFromId(tree.value, id)

    if (!treeItem || treeItem.id === currentItem.value.id) return

    await select(treeItem)
  }

  async function selectParentById(id: string) {
    const parent = findParentFromId(tree.value, id)
    if (parent) {
      await select(parent)
    }
  }

  async function handleDraftUpdate() {
    const api = type === StudioFeature.Content ? host.document : host.media
    const list = await api.list()
    const listWithFsPath = list.map((item) => {
      const fsPath = api.getFileSystemPath(item.id)
      return { ...item, fsPath }
    })

    // Trigger tree rebuild to update files status
    tree.value = buildTree(listWithFsPath, draft.list.value)

    // Reselect current item to update status
    select(findItemFromId(tree.value, currentItem.value.id)!)
  }

  hooks.hook('studio:draft:document:updated', async () => {
    if (type !== StudioFeature.Content) return

    await handleDraftUpdate()
  })

  hooks.hook('studio:draft:media:updated', async () => {
    if (type !== StudioFeature.Media) return

    await handleDraftUpdate()
  })

  return {
    root: tree,
    current: currentTree,
    currentItem,
    // parentItem,
    select,
    selectByRoute,
    selectItemById,
    selectParentById,
  }
}
