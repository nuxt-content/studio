import { useGit } from './useGit'
import { useUi } from './useUi'
import { useContext } from './useContext'
import { useDraftDocuments } from './useDraftDocuments'
import { useDraftMedias } from './useDraftMedias'
import { ref } from 'vue'
import { useTree } from './useTree'
import { createSharedComposable } from '@vueuse/core'
import type { RouteLocationNormalized } from 'vue-router'
import { StudioFeature } from '../types'

export const useStudio = createSharedComposable(() => {
  const host = window.useStudioHost()
  const git = useGit({
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    token: '',
    authorName: 'Name',
    authorEmail: 'email@example.com',
  })

  const isReady = ref(false)
  const ui = useUi(host)
  const draftDocuments = useDraftDocuments(host, git)
  const documentTree = useTree(StudioFeature.Content, host, draftDocuments)

  const draftMedias = useDraftMedias(host, git)
  const mediaTree = useTree(StudioFeature.Media, host, draftMedias)

  const context = useContext(host, ui, draftDocuments, draftMedias, documentTree)

  host.on.mounted(async () => {
    await draftDocuments.load()
    await draftMedias.load()

    host.app.requestRerender()
    isReady.value = true

    host.on.routeChange(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
      if (ui.isPanelOpen.value && ui.config.value.syncEditorAndRoute) {
        await documentTree.selectByRoute(to)
      }
      // setTimeout(() => {
      //   host.document.detectActives()
      // }, 100)
    })
  })

  // host.on.beforeUnload((event: BeforeUnloadEvent) => {
  //   // Ignore on development to prevent annoying dialogs
  //   if (import.meta.dev) return
  //   if (!draft.list.value.length) return

  //   // Recommended
  //   event.preventDefault()
  //   event = event || window.event

  //   // For IE and Firefox prior to version 4
  //   if (event) {
  //     event.returnValue = 'Sure?'
  //   }

  //   // For Safari
  //   return 'Sure?'
  // })

  return {
    isReady,
    host,
    git,
    ui,
    context,
    draftDocuments,
    draftMedias,
    documentTree,
    mediaTree,
    // draftMedia: {
    //   get -> DraftItem
    //   upsert
    //   remove
    //   revert
    //   move
    //   list -> DraftItem[]
    //   revertAll
    // }
    // media: {
    //   list -> MediaItem[]
    // }
    // config {
    //   get -> ConfigItem
    //   update
    //   revert
    // }
  }
})
