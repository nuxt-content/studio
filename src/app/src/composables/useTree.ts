import { StudioFeature, TreeStatus, type StudioHost, type TreeItem, DraftStatus } from '../types'
import { ref, computed } from 'vue'
import type { useDraftDocuments } from './useDraftDocuments'
import type { useDraftMedias } from './useDraftMedias'
import { buildTree, findItemFromFsPath, findItemFromRoute, findParentFromFsPath, generateIdFromFsPath } from '../utils/tree'
import type { RouteLocationNormalized } from 'vue-router'
import { useHooks } from './useHooks'
import { useStudioState } from './useStudioState'
import { TreeRootId } from '../types/tree'

export const useTree = (type: StudioFeature, host: StudioHost, draft: ReturnType<typeof useDraftDocuments | typeof useDraftMedias>) => {
  const hooks = useHooks()
  const { preferences, setLocation, devMode } = useStudioState()

  const tree = ref<TreeItem[]>([])

  const rootItem = computed<TreeItem>(() => {
    const draftedTreeItems = draft.list.value.filter(draft => draft.status !== DraftStatus.Pristine)
    return {
      name: type === StudioFeature.Content ? 'content' : 'public',
      type: 'root',
      fsPath: '/',
      children: tree.value,
      status: draftedTreeItems.length > 0 ? TreeStatus.Updated : null,
      collections: [type === StudioFeature.Content ? TreeRootId.Content : TreeRootId.Media],
      prefix: null,
    } as TreeItem
  })

  const currentItem = ref<TreeItem>(rootItem.value)

  const currentTree = computed<TreeItem[]>(() => {
    if (currentItem.value.type === 'root') {
      return tree.value
    }

    let subTree = tree.value
    const fsPathSegments = currentItem.value.fsPath.split('/').filter(Boolean)
    for (let i = 0; i < fsPathSegments.length; i++) {
      const fsPath = fsPathSegments.slice(0, i + 1).join('/')
      const file = subTree.find(item => item.fsPath === fsPath) as TreeItem
      if (file) {
        subTree = file.children!
      }
    }

    return subTree
  })

  async function select(item: TreeItem) {
    currentItem.value = item || rootItem.value

    setLocation(type, currentItem.value.fsPath)

    if (item?.type === 'file') {
      await draft.selectById(generateIdFromFsPath(item.fsPath, item.collections![0]))

      if (
        !preferences.value.syncEditorAndRoute
        || type === StudioFeature.Media
        || item.name === '.navigation'
        || !item.routePath
      ) {
        return
      }

      host.app.navigateTo(item.routePath)
    }
    else {
      draft.unselect()
    }
  }

  async function selectByRoute(route: RouteLocationNormalized) {
    const item = findItemFromRoute(tree.value, route)

    if (!item || item.fsPath === currentItem.value.fsPath) return

    await select(item)
  }

  async function selectItemByFsPath(fsPath: string) {
    const treeItem = findItemFromFsPath(tree.value, fsPath)

    if (!treeItem) {
      await select(rootItem.value)
      return
    }

    if (treeItem.fsPath === currentItem.value.fsPath) return

    await select(treeItem)
  }

  async function selectParentByFsPath(fsPath: string) {
    const parent = findParentFromFsPath(tree.value, fsPath)
    await select(parent || rootItem.value)
  }

  // Trigger tree rebuild to update files status
  async function handleDraftUpdate(selectItem: boolean = true) {
    const api = type === StudioFeature.Content ? host.document : host.media
    const list = await api.list()
    const listWithFsPath = list.map((item) => {
      const fsPath = api.getFileSystemPath(item.id)
      return { ...item, fsPath }
    })

    tree.value = buildTree(listWithFsPath, draft.list.value, devMode.value)

    // Reselect current item to update status
    if (selectItem) {
      select(findItemFromFsPath(tree.value, currentItem.value.fsPath)!)
    }

    // Rerender host app
    host.app.requestRerender()
  }

  if (type === StudioFeature.Content) {
    hooks.hook('studio:draft:document:updated', async ({ caller }) => {
      console.info('studio:draft:document:updated have been called by', caller)
      await handleDraftUpdate(caller !== 'useDraftBase.load')
    })
  }
  else {
    hooks.hook('studio:draft:media:updated', async ({ caller }) => {
      console.info('studio:draft:media:updated have been called by', caller)
      await handleDraftUpdate(caller !== 'useDraftBase.load')
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
    selectItemByFsPath,
    selectParentByFsPath,
    type,
    draft,
  }
}
