import { StudioFeature, TreeStatus, type StudioHost, type TreeItem, DraftStatus, TreeRootId } from '../types'
import { ref, computed } from 'vue'
import type { useDraftDocuments } from './useDraftDocuments'
import type { useDraftMedias } from './useDraftMedias'
import { buildTree, findItemFromId, findItemFromRoute, findParentFromId } from '../utils/tree'
import type { RouteLocationNormalized } from 'vue-router'
import { useHooks } from './useHooks'
import type { useUI } from './useUI'

export const useTree = (type: StudioFeature, host: StudioHost, ui: ReturnType<typeof useUI>, draft: ReturnType<typeof useDraftDocuments | typeof useDraftMedias>) => {
  const hooks = useHooks()

  const tree = ref<TreeItem[]>([])

  const rootItem = computed<TreeItem>(() => {
    const draftedTreeItems = draft.list.value.filter(draft => draft.status !== DraftStatus.Pristine)
    return {
      id: type === StudioFeature.Content ? TreeRootId.Content : TreeRootId.Media,
      name: type === StudioFeature.Content ? 'content' : 'public',
      type: 'root',
      fsPath: '/',
      children: tree.value,
      status: draftedTreeItems.length > 0 ? TreeStatus.Updated : null,
    } as TreeItem
  })

  const currentItem = ref<TreeItem>(rootItem.value)

  const currentTree = computed<TreeItem[]>(() => {
    if (currentItem.value.id === rootItem.value.id) {
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

  async function select(item: TreeItem) {
    currentItem.value = item || rootItem.value
    if (item?.type === 'file') {
      await draft.selectById(item.id)

      if (
        !ui.config.value.syncEditorAndRoute
        || type === StudioFeature.Media
        || item.name === '.navigation'
      ) {
        return
      }

      host.app.navigateTo(item.routePath!)
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
    await select(parent || rootItem.value)
  }

  // Trigger tree rebuild to update files status
  async function handleDraftUpdate() {
    const api = type === StudioFeature.Content ? host.document : host.media
    const list = await api.list()
    const listWithFsPath = list.map((item) => {
      const fsPath = api.getFileSystemPath(item.id)
      return { ...item, fsPath }
    })

    tree.value = buildTree(listWithFsPath, draft.list.value)

    // Reselect current item to update status
    select(findItemFromId(tree.value, currentItem.value.id)!)

    // Rerender host app
    host.app.requestRerender()
  }

  if (type === StudioFeature.Content) {
    hooks.hook('studio:draft:document:updated', async ({ caller }) => {
      console.info('studio:draft:document:updated have been called by', caller)
      await handleDraftUpdate()
    })
  }
  else {
    hooks.hook('studio:draft:media:updated', async ({ caller }) => {
      console.info('studio:draft:media:updated have been called by', caller)
      await handleDraftUpdate()
    })
  }

  return {
    root: tree,
    rootItem,
    current: currentTree,
    currentItem,
    // parentItem,
    select,
    selectByRoute,
    selectItemById,
    selectParentById,
    type,
    draft,
  }
}
