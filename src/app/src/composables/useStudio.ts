import { createSharedComposable } from '@vueuse/core'
import { useGit } from './useGit'
import { useUI } from './useUI'
import { useContext } from './useContext'
import { useDraftDocuments } from './useDraftDocuments'
import { useDraftMedias } from './useDraftMedias'
import { ref } from 'vue'
import { useTree } from './useTree'
import type { RouteLocationNormalized } from 'vue-router'
import { StudioFeature } from '../types'

export const useStudio = createSharedComposable(() => {
  const host = window.useStudioHost()
  const git = useGit({
    owner: host.repository.owner,
    repo: host.repository.repo,
    branch: host.repository.branch,
    rootDir: host.repository.rootDir,
    token: host.user.get().githubToken,
    authorName: host.user.get().name,
    authorEmail: host.user.get().email,
  })

  const isReady = ref(false)
  const ui = useUI(host)
  const draftDocuments = useDraftDocuments(host, git)
  const documentTree = useTree(StudioFeature.Content, host, ui, draftDocuments)

  const draftMedias = useDraftMedias(host, git)
  const mediaTree = useTree(StudioFeature.Media, host, ui, draftMedias)

  const context = useContext(host, documentTree, mediaTree)

  host.on.mounted(async () => {
    await draftDocuments.load()
    await draftMedias.load()

    host.app.requestRerender()
    isReady.value = true

    host.on.routeChange(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
      if (ui.isOpen.value && ui.config.value.syncEditorAndRoute) {
        if (documentTree.currentItem.value.routePath === to.path) {
          return
        }

        await documentTree.selectByRoute(to)
      }
      // setTimeout(() => {
      //   host.document.detectActives()
      // }, 100)
    })
  })

  return {
    isReady,
    host,
    git,
    ui,
    context,
    documentTree,
    mediaTree,
  }
})
