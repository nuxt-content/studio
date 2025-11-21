import type { StudioFeature } from './context'

export type EditorMode = 'code' | 'tiptap'

export interface StudioConfig {
  syncEditorAndRoute: boolean
  showTechnicalMode: boolean
  editorMode: EditorMode
  debug: boolean
}

export interface StudioLocation {
  active: boolean
  feature: StudioFeature
  fsPath: string
}
