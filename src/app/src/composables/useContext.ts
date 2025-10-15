import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import { StudioItemActionId, DraftStatus, StudioBranchActionId } from '../types'
import type {
  PublishBranchParams,
  RenameFileParams,
  TreeItem,
  UploadMediaParams,
  CreateFileParams,
  StudioHost,
  StudioAction,
  ActionHandlerParams,
  StudioActionInProgress,
  CreateFolderParams,
  DatabaseItem,

} from '../types'
import { oneStepActions, STUDIO_ITEM_ACTION_DEFINITIONS, twoStepActions, STUDIO_BRANCH_ACTION_DEFINITIONS } from '../utils/context'
import type { useTree } from './useTree'
import type { useGit } from './useGit'
import type { useDraftMedias } from './useDraftMedias'
import { useRoute, useRouter } from 'vue-router'
import { findDescendantsFileItemsFromId, findItemFromId } from '../utils/tree'
import { joinURL } from 'ufo'
import { upperFirst } from 'scule'

export const useContext = createSharedComposable((
  host: StudioHost,
  git: ReturnType<typeof useGit>,
  documentTree: ReturnType<typeof useTree>,
  mediaTree: ReturnType<typeof useTree>,
) => {
  const route = useRoute()
  const router = useRouter()

  /**
   * Drafts
   */
  const allDrafts = computed(() => [...documentTree.draft.list.value, ...mediaTree.draft.list.value].filter(draft => draft.status !== DraftStatus.Pristine))
  const isDraftInProgress = computed(() => allDrafts.value.some(draft => draft.status !== DraftStatus.Pristine))
  const draftCount = computed(() => allDrafts.value.length)

  /**
   * Actions
   */
  const actionInProgress = ref<StudioActionInProgress | null>(null)
  const activeTree = computed(() => {
    if (route.name === 'media') {
      return mediaTree
    }
    return documentTree
  })

  const itemActions = computed<StudioAction<StudioItemActionId>[]>(() => {
    return STUDIO_ITEM_ACTION_DEFINITIONS.map(<K extends StudioItemActionId>(action: StudioAction<K>) => ({
      ...action,
      handler: async (args: ActionHandlerParams[K]) => {
        // Two steps actions need to be already in progress to be executed
        if (actionInProgress.value?.id === action.id) {
          if (twoStepActions.includes(action.id)) {
            await itemActionHandler[action.id](args)
            unsetActionInProgress()
            return
          }
          // One step actions can't be executed if already in progress
          else {
            return
          }
        }

        actionInProgress.value = { id: action.id }

        if (action.id === StudioItemActionId.RenameItem) {
          if (activeTree.value.currentItem.value) {
            const itemToRename = args as TreeItem
            await activeTree.value.selectParentById(itemToRename.id)
            actionInProgress.value.item = itemToRename
          }
        }

        // One step actions can be executed immediately
        if (oneStepActions.includes(action.id)) {
          await itemActionHandler[action.id](args)
          unsetActionInProgress()
        }
      },
    }))
  })

  const itemActionHandler: { [K in StudioItemActionId]: (args: ActionHandlerParams[K]) => Promise<void> } = {
    [StudioItemActionId.CreateFolder]: async (params: CreateFolderParams) => {
      const { fsPath } = params
      const folderName = fsPath.split('/').pop()!
      const rootDocumentFsPath = joinURL(fsPath, 'index.md')
      const navigationDocumentFsPath = joinURL(fsPath, '.navigation.yml')

      const navigationDocument = await host.document.create(navigationDocumentFsPath, `title: ${folderName}`)
      const rootDocument = await host.document.create(rootDocumentFsPath, `# ${upperFirst(folderName)} root file`)

      await activeTree.value.draft.create(navigationDocument)

      unsetActionInProgress()

      const rootDocumentDraftItem = await activeTree.value.draft.create(rootDocument)

      await activeTree.value.selectItemById(rootDocumentDraftItem.id)
    },
    [StudioItemActionId.CreateDocument]: async (params: CreateFileParams) => {
      const { fsPath, content } = params
      const document = await host.document.create(fsPath, content)
      const draftItem = await activeTree.value.draft.create(document as DatabaseItem)
      await activeTree.value.selectItemById(draftItem.id)
    },
    [StudioItemActionId.UploadMedia]: async ({ parentFsPath, files }: UploadMediaParams) => {
      for (const file of files) {
        await (activeTree.value.draft as ReturnType<typeof useDraftMedias>).upload(parentFsPath, file)
      }
    },
    [StudioItemActionId.RevertItem]: async (item: TreeItem) => {
      await activeTree.value.draft.revert(item.id)
    },
    [StudioItemActionId.RenameItem]: async (params: TreeItem | RenameFileParams) => {
      const { id, newFsPath } = params as RenameFileParams

      const descendants = findDescendantsFileItemsFromId(activeTree.value.root.value, id)
      if (descendants.length > 0) {
        const parent = findItemFromId(activeTree.value.root.value, id)!
        const itemsToRename = descendants.map(item => ({ id: item.id, newFsPath: item.fsPath.replace(parent.fsPath, newFsPath) }))
        await activeTree.value.draft.rename(itemsToRename)
      }
      else {
        await activeTree.value.draft.rename([{ id, newFsPath }])
      }
    },
    [StudioItemActionId.DeleteItem]: async (item: TreeItem) => {
      const ids: string[] = findDescendantsFileItemsFromId(activeTree.value.root.value, item.id).map(item => item.id)
      await activeTree.value.draft.remove(ids)
    },
    [StudioItemActionId.DuplicateItem]: async (item: TreeItem) => {
      const draftItem = await activeTree.value.draft.duplicate(item.id)
      await activeTree.value.selectItemById(draftItem!.id)
    },
    [StudioItemActionId.RevertAllItems]: async () => {
      await documentTree.draft.revertAll()
      await mediaTree.draft.revertAll()
    },
  }

  const branchActions = computed<StudioAction<StudioBranchActionId>[]>(() => {
    return STUDIO_BRANCH_ACTION_DEFINITIONS.map(<K extends StudioBranchActionId>(action: StudioAction<K>) => ({
      ...action,
      handler: async (args: ActionHandlerParams[K]) => {
        actionInProgress.value = { id: action.id }
        await branchActionHandler[action.id](args)
        unsetActionInProgress()
      },
    }))
  })

  const branchActionHandler: { [K in StudioBranchActionId]: (args: ActionHandlerParams[K]) => Promise<void> } = {
    [StudioBranchActionId.PublishBranch]: async (params: PublishBranchParams) => {
      const { commitMessage } = params
      const documentFiles = await documentTree.draft.listAsRawFiles()
      const mediaFiles = await mediaTree.draft.listAsRawFiles()
      await git.commitFiles([...documentFiles, ...mediaFiles], commitMessage)

      // @ts-expect-error params is null
      await itemActionHandler[StudioItemActionId.RevertAllItems]()

      router.push('/content')
    },
  }

  function unsetActionInProgress() {
    actionInProgress.value = null
  }

  return {
    activeTree,
    itemActions,
    itemActionHandler,
    branchActions,
    branchActionHandler,
    actionInProgress,
    allDrafts,
    draftCount,
    isDraftInProgress,
    unsetActionInProgress,
  }
})
