import { createSharedComposable } from '@vueuse/core'
import ModalConfirmAction from '../components/modal/ModalConfirmAction.vue'
import type { StudioItemActionId } from '../types'

export const useModal = createSharedComposable(() => {
  const overlay = useOverlay()

  const modal = overlay.create(ModalConfirmAction)

  async function openConfirmActionModal(itemId: string, actionId: StudioItemActionId, successCallback: () => Promise<void>) {
    modal.open({
      itemId,
      actionId,
      successCallback,
    })
  }

  return {
    openConfirmActionModal,
  }
})
