import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import type { useUi } from './useUi'
import { type UploadMediaParams, type CreateFileParams, type StudioHost, type StudioAction, type TreeItem, StudioItemActionId, type ActionHandlerParams, StudioFeature } from '../types'
import { oneStepActions, STUDIO_ITEM_ACTION_DEFINITIONS, twoStepActions } from '../utils/context'
import type { useDraftDocuments } from './useDraftDocuments'
import { useModal } from './useModal'
import type { useTree } from './useTree'
import type { useDraftMedias } from './useDraftMedias'
import { findDescendantsFileItemsFromId } from '../utils/tree'

export const useContext = createSharedComposable((
  host: StudioHost,
  ui: ReturnType<typeof useUi>,
  draftDocuments: ReturnType<typeof useDraftDocuments>,
  draftMedias: ReturnType<typeof useDraftMedias>,
  tree: ReturnType<typeof useTree>,
) => {
  const modal = useModal()

  const actionInProgress = ref<StudioItemActionId | null>(null)
  const currentFeature = computed<keyof typeof ui.panels | null>(() =>
    Object.keys(ui.panels).find(key => ui.panels[key as keyof typeof ui.panels]) as keyof typeof ui.panels,
  )
  const draft = computed(() => currentFeature.value === StudioFeature.Content ? draftDocuments : draftMedias)

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
      const draftItem = await draft.value.create(document)
      await tree.selectItemById(draftItem.id)
    },
    [StudioItemActionId.UploadMedia]: async ({ directory, files }: UploadMediaParams) => {
      for (const file of files) {
        await (draft.value as ReturnType<typeof useDraftMedias>).upload(directory, file)
      }
    },
    [StudioItemActionId.RevertItem]: async (id: string) => {
      modal.openConfirmActionModal(id, StudioItemActionId.RevertItem, async () => {
        await draft.value.revert(id)
      })
    },
    [StudioItemActionId.RenameItem]: async ({ path, file }: { path: string, file: TreeItem }) => {
      alert(`rename file ${path} ${file.name}`)
    },
    [StudioItemActionId.DeleteItem]: async (id: string) => {
      modal.openConfirmActionModal(id, StudioItemActionId.DeleteItem, async () => {
        const ids: string[] = findDescendantsFileItemsFromId(tree.root.value, id).map(item => item.id)
        await draft.value.remove(ids)
        await tree.selectParentById(id)
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
    feature: currentFeature,
    // itemActionHandler,
    itemActions,
    actionInProgress,

    unsetActionInProgress,
    itemActionHandler,
  }
})
