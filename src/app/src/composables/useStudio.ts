import { createSharedComposable } from '@vueuse/core'
import { useDevelopmentGit, useGit } from './useGit'
import { useUI } from './useUI'
import { useContext } from './useContext'
import { useDraftDocuments } from './useDraftDocuments'
import { useDraftMedias } from './useDraftMedias'
import { ref } from 'vue'
import { useTree } from './useTree'
import type { RouteLocationNormalized } from 'vue-router'
import { StudioFeature, StudioHost } from '../types'
import { documentStorage, mediaStorage, nullStorageDriver } from '../utils/storage'
import { useHooks } from './useHooks'
import { getDraftStatus } from '../utils/draft'

export const studioFlags = {
  dev: false,
}

export const useStudio = createSharedComposable(() => {
  const host = window.useStudioHost()
  studioFlags.dev = host.meta.dev

  const gitOptions = {
    owner: host.repository.owner,
    repo: host.repository.repo,
    branch: host.repository.branch,
    rootDir: host.repository.rootDir,
    token: host.user.get().githubToken,
    authorName: host.user.get().name,
    authorEmail: host.user.get().email,
  }
  const git = studioFlags.dev ? useDevelopmentGit(gitOptions) : useGit(gitOptions)

  const isReady = ref(false)
  const ui = useUI(host)
  const draftDocuments = useDraftDocuments(host, git)
  const documentTree = useTree(StudioFeature.Content, host, ui, draftDocuments)

  const draftMedias = useDraftMedias(host, git)
  const mediaTree = useTree(StudioFeature.Media, host, ui, draftMedias)

  const context = useContext(host, documentTree, mediaTree)

  host.on.mounted(async () => {
    if (studioFlags.dev) {
      initDevelopmentMode(host, draftDocuments, draftMedias, documentTree, mediaTree)
    }
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

function initDevelopmentMode(host: StudioHost, draftDocuments: ReturnType<typeof useDraftDocuments>, draftMedias: ReturnType<typeof useDraftMedias>, documentTree: ReturnType<typeof useTree>, mediaTree: ReturnType<typeof useTree>) {
  const hooks = useHooks()

  // Disable browser storages
  documentStorage.mount('/', nullStorageDriver)
  mediaStorage.mount('/', nullStorageDriver)

  host.on.documentUpdate(async (id: string, type: 'remove' | 'update') => {
    const item = draftDocuments.list.value.find(item => item.id === id)

    if (type === 'remove') {
      if (item) {
        await draftDocuments.remove([id])
      }
    } else if (item) {
      // Update draft if the document is not focused or the current item is not the one that was updated
      if (!window.document.hasFocus() || documentTree.currentItem.value?.id !== id) {
        const document = await host.document.get(id)
        item.modified = document
        item.original = document
        item.status = getDraftStatus(document, item.original)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    await hooks.callHook('studio:draft:document:updated')
  })

  host.on.mediaUpdate(async (id: string, type: 'remove' | 'update') => {
    const item = draftMedias.list.value.find(item => item.id === id)

    if (type === 'remove') {
      if (item) {
        await draftMedias.remove([id])
      }
    } else if (item) {
      if (!window.document.hasFocus() || mediaTree.currentItem.value?.id !== id) {
        const media = await host.media.get(id)
        item.modified = media
        item.original = media
        item.status = getDraftStatus(media, item.original)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    await hooks.callHook('studio:draft:media:updated')
  })
}