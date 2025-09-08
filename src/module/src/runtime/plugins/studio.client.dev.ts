import { useRuntimeConfig } from '#imports'
import type { ContentStudioUser } from 'nuxt-studio/app'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineStudioActivationPlugin(async (_user: ContentStudioUser) => {
  console.log(`
 ██████╗ ██████╗ ███╗   ██╗████████╗███████╗███╗   ██╗████████╗    ██████╗ ███████╗██╗   ██╗
██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝████╗  ██║╚══██╔══╝    ██╔══██╗██╔════╝██║   ██║
██║     ██║   ██║██╔██╗ ██║   ██║   █████╗  ██╔██╗ ██║   ██║       ██║  ██║█████╗  ██║   ██║
██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝  ██║╚██╗██║   ██║       ██║  ██║██╔══╝  ╚██╗ ██╔╝
╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗██║ ╚████║   ██║       ██████╔╝███████╗ ╚████╔╝
 ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═════╝ ╚══════╝  ╚═══╝
  `)

  const config = useRuntimeConfig()
  const el = document.createElement('script')
  el.src = `${config.public.contentStudio?.studioDevServer}/src/index.ts`
  el.type = 'module'
  document.body.appendChild(el)

  const wp = document.createElement('nuxt-studio')
  document.body.appendChild(wp)
})
