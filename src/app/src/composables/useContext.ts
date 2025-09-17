import { createSharedComposable } from '@vueuse/core'
import { computed, ref } from 'vue'
import type { useUi } from './useUi'
import { type StudioHost, type StudioAction, type TreeItem, StudioItemActionId } from '../types'
import { STUDIO_ITEM_ACTION_DEFINITIONS } from '../utils/context'
import type { useDraftFiles } from './useDraftFiles'

export const useContext = createSharedComposable((
  _host: StudioHost, ui: ReturnType<typeof useUi>, _draftFiles: ReturnType<typeof useDraftFiles>) => {
  const actionInProgress = ref<StudioItemActionId>()
  const currentFeature = computed<keyof typeof ui.panels | null>(() =>
    Object.keys(ui.panels).find(key => ui.panels[key as keyof typeof ui.panels]) as keyof typeof ui.panels,
  )

  const itemActions = computed<StudioAction[]>(() => {
    return STUDIO_ITEM_ACTION_DEFINITIONS.map(action => ({
      ...action,
      handler: async (...args: any) => {
        if (actionInProgress.value === action.id) {
          console.log('action already in progress')
          return
        }

        console.log('action in progress', action.id, 'with args', args)

        actionInProgress.value = action.id

        // await itemActionHandler[action.id](...args)
      },
    }))
  })

  const itemActionHandler: Record<StudioItemActionId, (...args: any) => Promise<void>> = {
    [StudioItemActionId.CreateFolder]: async (id: string) => {
      console.log('create folder', id)
      alert(`create folder ${id}`)
    },
    [StudioItemActionId.CreateFile]: async ({ id, content }: { id: string, content?: string }) => {
      alert(`create file ${id} ${content}`)
    },
    [StudioItemActionId.RevertItem]: async (id: string) => {
      alert(`revert file ${id}`)
    },
    [StudioItemActionId.RenameItem]: async ({ path, file }: { path: string, file: TreeItem }) => {
      alert(`rename file ${path} ${file.name}`)
    },
    [StudioItemActionId.DeleteItem]: async (id: string) => {
      alert(`delete file ${id}`)
    },
    [StudioItemActionId.DuplicateItem]: async (id: string) => {
      alert(`duplicate file ${id}`)
    },
  }

  return {
    feature: currentFeature,
    // itemActionHandler,
    itemActions,
    actionInProgress,
  }
})
