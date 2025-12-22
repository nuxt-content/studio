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

export interface StudioUI {
  header: {
    root: string
  }
  footer: {
    root: string
    text: string
    userMenuButton: string
    debugSwitchContainer: string
    debugSwitch: {
      root: string
      wrapper: string
    }
    actions: string
  }
  layout: {
    sidebar: string
    monaco: string
    body: string
  }
}
