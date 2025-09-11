export type DraftStatus = 'created' | 'updated' | 'deleted' | 'renamed'

export const COLOR_STATUS_MAP: { [key in DraftStatus]?: string } = {
  created: 'green',
  updated: 'orange',
  deleted: 'red',
  renamed: 'blue',
}

// function _getDraftStatus(draft: DraftFileItem[], id: string) {
//   const draftItem = draft.find(item => item.id === id)
//   return draftItem?.status
// }
