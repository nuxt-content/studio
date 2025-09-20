import type { DatabaseItem } from '../types/database'
import { DraftStatus } from '../types/draft'

export const COLOR_STATUS_MAP: { [key in DraftStatus]?: string } = {
  created: 'green',
  updated: 'orange',
  deleted: 'red',
  renamed: 'blue',
  opened: 'gray',
} as const

export const COLOR_UI_STATUS_MAP: { [key in DraftStatus]?: string } = {
  created: 'primary',
  updated: 'warning',
  deleted: 'danger',
  renamed: 'info',
  opened: 'neutral',
} as const

export function getDraftStatus(draftedDocument: DatabaseItem, originalDatabaseItem: DatabaseItem | undefined) {
  if (!originalDatabaseItem) {
    return DraftStatus.Created
  }
  else {
    if (JSON.stringify(originalDatabaseItem) !== JSON.stringify(draftedDocument)) {
      return DraftStatus.Updated
    }
  }

  return DraftStatus.Opened
}
