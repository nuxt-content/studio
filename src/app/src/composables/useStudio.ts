import { createSharedComposable } from '@vueuse/core'
import { useDevelopmentGit, useGit } from './useGit'
import { useUI } from './useUI'
import { useContext } from './useContext'
import { useDraftDocuments } from './useDraftDocuments'
import { useDraftMedias } from './useDraftMedias'
import { ref } from 'vue'
import { useTree } from './useTree'
import type { RouteLocationNormalized } from 'vue-router'
import type { StudioHost, GitOptions, DatabaseItem } from '../types'
import { StudioFeature } from '../types'
import { documentStorage, mediaStorage, nullStorageDriver } from '../utils/storage'
import { useHooks } from './useHooks'
import { getDraftStatus } from '../utils/draft'
import { useStudioState } from './useStudioState'

export const studioFlags = {
  dev: false,
}

export const useStudio = createSharedComposable(() => {
  const isReady = ref(false)
  const host = window.useStudioHost()
  studioFlags.dev = host.meta.dev

  const gitOptions: GitOptions = {
    owner: host.repository.owner,
    repo: host.repository.repo,
    branch: host.repository.branch,
    rootDir: host.repository.rootDir,
    token: host.user.get().githubToken,
    authorName: host.user.get().name,
    authorEmail: host.user.get().email,
  }

  const git = studioFlags.dev ? useDevelopmentGit(gitOptions) : useGit(gitOptions)
  const { preferences, setManifestId } = useStudioState()
  const ui = useUI(host)
  const draftDocuments = useDraftDocuments(host, git)
  const documentTree = useTree(StudioFeature.Content, host, draftDocuments)
  const draftMedias = useDraftMedias(host, git)
  const mediaTree = useTree(StudioFeature.Media, host, draftMedias)
  const context = useContext(host, git, documentTree, mediaTree)

  host.on.mounted(async () => {
    if (studioFlags.dev) {
      initDevelopmentMode(host, draftDocuments, draftMedias, documentTree, mediaTree)
    }

    await draftDocuments.load()
    await draftMedias.load()

    host.app.requestRerender()
    isReady.value = true

    host.on.routeChange(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
      if (ui.isOpen.value && preferences.value.syncEditorAndRoute) {
        if (documentTree.currentItem.value.routePath === to.path) {
          return
        }

        await documentTree.selectByRoute(to)
      }
    })

    const id = await host.app.getManifestId()
    setManifestId(id)
    host.on.manifestUpdate((id) => {
      setManifestId(id)
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
  const areDocumentsEqual = host.document.utils.areEqual

  // Disable browser storages
  documentStorage.mount('/', nullStorageDriver)
  mediaStorage.mount('/', nullStorageDriver)

  host.on.documentUpdate(async (fsPath: string, type: 'remove' | 'update') => {
    const item = draftDocuments.list.value.find(item => item.fsPath === fsPath)

    if (type === 'remove') {
      if (item) {
        await draftDocuments.remove([fsPath])
      }
    }
    else if (item) {
      // Update draft if the document is not focused or the current item is not the one that was updated
      if (!window.document.hasFocus() || documentTree.currentItem.value?.fsPath !== fsPath) {
        const document = await host.document.db.get(fsPath)
        item.modified = document
        item.original = document
        item.status = getDraftStatus(document as DatabaseItem, item.original as DatabaseItem, areDocumentsEqual)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    await hooks.callHook('studio:draft:document:updated', { caller: 'useStudio.on.documentUpdate' })
  })

  host.on.mediaUpdate(async (fsPath: string, type: 'remove' | 'update') => {
    const item = draftMedias.list.value.find(item => item.fsPath === fsPath)

    if (type === 'remove') {
      if (item) {
        await draftMedias.remove([fsPath])
      }
    }
    else if (item) {
      if (!window.document.hasFocus() || mediaTree.currentItem.value?.fsPath !== fsPath) {
        const media = await host.media.get(fsPath)
        item.modified = media
        item.original = media
        item.status = getDraftStatus(media, item.original, areDocumentsEqual)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    await hooks.callHook('studio:draft:media:updated', { caller: 'useStudio.on.mediaUpdate' })
  })
}
