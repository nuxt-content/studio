import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import { type UploadMediaParams, type CreateFileParams, type StudioHost, type StudioAction, type TreeItem, StudioItemActionId, type ActionHandlerParams } from '../types'
import { oneStepActions, STUDIO_ITEM_ACTION_DEFINITIONS, twoStepActions } from '../utils/context'
import { useModal } from './useModal'
import type { useTree } from './useTree'
import { useRoute } from 'vue-router'
import { findDescendantsFileItemsFromId } from '../utils/tree'
import type { useDraftMedias } from './useDraftMedias'

export const useContext = createSharedComposable((
  host: StudioHost,
  documentTree: ReturnType<typeof useTree>,
  mediaTree: ReturnType<typeof useTree>,
) => {
  const modal = useModal()
  const route = useRoute()

  const actionInProgress = ref<StudioItemActionId | null>(null)
  const featureTree = computed(() => {
    if (route.name === 'media') {
      return mediaTree
    }
    return documentTree
  })

  const itemActions = computed<StudioAction[]>(() => {
    return STUDIO_ITEM_ACTION_DEFINITIONS.map(action => ({
      ...action,
      handler: async (args) => {
        if (actionInProgress.value === action.id) {
          // Two steps actions need to be already in progress to be executed
          if (twoStepActions.includes(action.id)) {
            await itemActionHandler[action.id](args as never)
            unsetActionInProgress()
            return
          }
          // One step actions can't be executed if already in progress
          else {
            return
          }
        }

        actionInProgress.value = action.id

        // One step actions can be executed immediately
        if (oneStepActions.includes(action.id)) {
          await itemActionHandler[action.id](args as never)
          unsetActionInProgress()
        }
      },
    }))
  })

  const itemActionHandler: { [K in StudioItemActionId]: (args: ActionHandlerParams[K]) => Promise<void> } = {
    [StudioItemActionId.CreateFolder]: async (args: string) => {
      alert(`create folder ${args}`)
    },
    [StudioItemActionId.CreateDocument]: async ({ fsPath, routePath, content }: CreateFileParams) => {
      const document = await host.document.create(fsPath, routePath, content)
      const draftItem = await featureTree.value.draft.create(document)
      await featureTree.value.selectItemById(draftItem.id)
    },
    [StudioItemActionId.UploadMedia]: async ({ directory, files }: UploadMediaParams) => {
      for (const file of files) {
        await (featureTree.value.draft as ReturnType<typeof useDraftMedias>).upload(directory, file)
      }
    },
    [StudioItemActionId.RevertItem]: async (id: string) => {
      modal.openConfirmActionModal(id, StudioItemActionId.RevertItem, async () => {
        await featureTree.value.draft.revert(id)
      })
    },
    [StudioItemActionId.RenameItem]: async ({ path, file }: { path: string, file: TreeItem }) => {
      alert(`rename file ${path} ${file.name}`)
    },
    [StudioItemActionId.DeleteItem]: async (id: string) => {
      modal.openConfirmActionModal(id, StudioItemActionId.DeleteItem, async () => {
        const ids: string[] = findDescendantsFileItemsFromId(featureTree.value.root.value, id).map(item => item.id)
        await featureTree.value.draft.remove(ids)
        await featureTree.value.selectParentById(id)
      })
    },
    [StudioItemActionId.DuplicateItem]: async (id: string) => {
      alert(`duplicate file ${id}`)
    },
  }

  function unsetActionInProgress() {
    actionInProgress.value = null
  }

  return {
    featureTree,
    itemActions,
    actionInProgress,

    unsetActionInProgress,
    itemActionHandler,
  }
})
