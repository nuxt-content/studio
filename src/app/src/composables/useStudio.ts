import { createSharedComposable } from './createSharedComposable'
import { useGitProvider } from './useGitProvider'
import { useUI } from './useUI'
import { useContext } from './useContext'
import { useDraftDocuments } from './useDraftDocuments'
import { useDraftMedias } from './useDraftMedias'
import { ref, watch } from 'vue'
import { useTree } from './useTree'
import type { RouteLocationNormalized } from 'vue-router'
import type { GitOptions, DatabaseItem } from '../types'
import { StudioFeature } from '../types'
import { documentStorage, mediaStorage, nullStorageDriver } from '../utils/storage'
import { useHooks } from './useHooks'
import { useStudioState } from './useStudioState'
import { useAI } from './useAI'

export const useStudio = createSharedComposable(() => {
  const isReady = ref(false)
  const host = window.useStudioHost()
  const { devMode, enableDevMode, preferences, setManifestId } = useStudioState()

  if (host.meta.dev) {
    enableDevMode()
  }

  const gitOptions: GitOptions = {
    provider: host.repository.provider,
    owner: host.repository.owner,
    repo: host.repository.repo,
    branch: host.repository.branch,
    rootDir: host.repository.rootDir,
    token: host.user.get().accessToken,
    authorName: host.user.get().name,
    authorEmail: host.user.get().email,
    instanceUrl: host.repository.instanceUrl,
  }

  const gitProvider = useGitProvider(gitOptions, devMode.value)
  const ui = useUI(host)
  const ai = useAI(host)
  const draftDocuments = useDraftDocuments(host, gitProvider)
  const documentTree = useTree(StudioFeature.Content, host, draftDocuments)
  const draftMedias = useDraftMedias(host, gitProvider)
  const mediaTree = useTree(StudioFeature.Media, host, draftMedias)
  const aiContextTree = ai.enabled ? useTree(StudioFeature.AI, host, draftDocuments) : undefined
  const context = useContext(host, gitProvider, documentTree, mediaTree, aiContextTree)

  watch(() => host.meta.defaultLocale, (locale) => {
    ui.setLocale(locale)
  }, { immediate: true })

  watch(ui.isOpen, (open) => {
    if (open) {
      ui.setLocale(host.meta.defaultLocale)
    }
  })

  host.on.mounted(async () => {
    host.app.registerServiceWorker()

    if (devMode.value) {
      initDevelopmentMode()
    }

    await draftDocuments.load()
    await draftMedias.load()

    host.app.requestRerender()
    isReady.value = true

    host.on.routeChange(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
      ui.setLocale(host.meta.defaultLocale)
      if (ui.isOpen.value && preferences.value.syncEditorAndRoute) {
        if (context.activeTree.value.currentItem.value.routePath === to.path) {
          return
        }

        // Always switch to Content tab when navigating via host website links
        if (context.currentFeature.value !== StudioFeature.Content) {
          await context.switchFeature(StudioFeature.Content)
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
    gitProvider,
    ui,
    context,
    documentTree,
    mediaTree,
    aiContextTree,
  }
})

function initDevelopmentMode() {
  const { host, documentTree, mediaTree, context, ui } = useStudio()
  const aiEnabled = host.meta.ai?.enabled
  const aiContextFolder = host.meta.ai?.context?.contentFolder
  const hooks = useHooks()

  // Disable browser storages
  documentStorage.mount('/', nullStorageDriver)
  mediaStorage.mount('/', nullStorageDriver)

  host.on.documentUpdate(async (fsPath: string, type: 'remove' | 'update') => {
    const item = context.activeTree.value.draft.list.value.find(item => item.fsPath === fsPath)

    if (type === 'remove') {
      if (item) {
        await context.activeTree.value.draft.remove([fsPath])
      }
    }
    else if (item) {
      // Update draft if the document is not focused or the current item is not the one that was updated
      if (!window.document.hasFocus() || context.activeTree.value.currentItem.value?.fsPath !== fsPath) {
        const document = await host.document.db.get(fsPath)
        item.modified = document
        item.original = document
        item.formattingApplied = false
        item.status = await context.activeTree.value.draft.getStatus(document as DatabaseItem, item.original as DatabaseItem)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    const isAIUpdate = aiEnabled ? fsPath.startsWith(aiContextFolder) : false
    const hookName = isAIUpdate ? 'studio:draft:ai:updated' : 'studio:draft:document:updated'
    await hooks.callHook(hookName, { caller: 'useStudio.on.documentUpdate' })
  })

  host.on.mediaUpdate(async (fsPath: string, type: 'remove' | 'update') => {
    const item = mediaTree.draft.list.value.find(item => item.fsPath === fsPath)

    if (type === 'remove') {
      if (item) {
        await mediaTree.draft.remove([fsPath])
      }
    }
    else if (item) {
      if (!window.document.hasFocus() || mediaTree.currentItem.value?.fsPath !== fsPath) {
        const media = await host.media.get(fsPath)
        item.modified = media
        item.original = media
        item.status = await mediaTree.draft.getStatus(media, item.original)
        item.version = item.version ? item.version + 1 : 1
      }
    }

    await hooks.callHook('studio:draft:media:updated', { caller: 'useStudio.on.mediaUpdate' })
  })

  host.on.requestDocumentEdit(async (fsPath: string) => {
    // Always route to Content tab when selecting from host website
    if (context.currentFeature.value !== StudioFeature.Content) {
      await context.switchFeature(StudioFeature.Content)
    }

    await documentTree.selectItemByFsPath(fsPath)
    ui.open()
  })
}
