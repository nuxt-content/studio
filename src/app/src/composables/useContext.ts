import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import {
  type RenameFileParams,
  type TreeItem,
  type UploadMediaParams,
  type CreateFileParams,
  type StudioHost,
  type StudioAction,
  type ActionHandlerParams,
  type StudioActionInProgress,
  type CreateFolderParams,
  StudioItemActionId,
} from '../types'
import { oneStepActions, STUDIO_ITEM_ACTION_DEFINITIONS, twoStepActions } from '../utils/context'
import { useModal } from './useModal'
import type { useTree } from './useTree'
import { useRoute } from 'vue-router'
import { findDescendantsFileItemsFromId } from '../utils/tree'
import type { useDraftMedias } from './useDraftMedias'
import { joinURL } from 'ufo'
import { upperFirst } from 'scule'

export const useContext = createSharedComposable((
  host: StudioHost,
  documentTree: ReturnType<typeof useTree>,
  mediaTree: ReturnType<typeof useTree>,
) => {
  const modal = useModal()
  const route = useRoute()

  const actionInProgress = ref<StudioActionInProgress | null>(null)
  const activeTree = computed(() => {
    if (route.name === 'media') {
      return mediaTree
    }
    return documentTree
  })

  const itemActions = computed<StudioAction[]>(() => {
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
      const draftItem = await activeTree.value.draft.create(document)
      await activeTree.value.selectItemById(draftItem.id)
    },
    [StudioItemActionId.UploadMedia]: async ({ directory, files }: UploadMediaParams) => {
      for (const file of files) {
        await (activeTree.value.draft as ReturnType<typeof useDraftMedias>).upload(directory, file)
      }
    },
    [StudioItemActionId.RevertItem]: async (item: TreeItem) => {
      modal.openConfirmActionModal(item.id, StudioItemActionId.RevertItem, async () => {
        await activeTree.value.draft.revert(item.id)
      })
    },
    [StudioItemActionId.RenameItem]: async (params: TreeItem | RenameFileParams) => {
      const { id, newFsPath } = params as RenameFileParams
      await activeTree.value.draft.rename(id, newFsPath)
    },
    [StudioItemActionId.DeleteItem]: async (item: TreeItem) => {
      modal.openConfirmActionModal(item.id, StudioItemActionId.DeleteItem, async () => {
        const ids: string[] = findDescendantsFileItemsFromId(activeTree.value.root.value, item.id).map(item => item.id)
        await activeTree.value.draft.remove(ids)
      })
    },
    [StudioItemActionId.DuplicateItem]: async (item: TreeItem) => {
      const draftItem = await activeTree.value.draft.duplicate(item.id)
      await activeTree.value.selectItemById(draftItem.id)
    },
  }

  function unsetActionInProgress() {
    actionInProgress.value = null
  }

  return {
    activeTree,
    itemActions,
    actionInProgress,
    unsetActionInProgress,
    itemActionHandler,
  }
})
