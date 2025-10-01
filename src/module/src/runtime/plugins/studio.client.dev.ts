import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { defineStudioActivationPlugin } from '../utils/activation'

export default defineNuxtPlugin(() => {
  defineStudioActivationPlugin(async (user) => {
    console.log(`
  ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗     ██████╗ ███████╗██╗   ██╗
  ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗    ██╔══██╗██╔════╝██║   ██║
  ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║    ██║  ██║█████╗  ██║   ██║
  ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║    ██║  ██║██╔══╝  ╚██╗ ██╔╝
  ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝    ██████╔╝███████╗ ╚████╔╝
  ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝     ╚═════╝ ╚══════╝  ╚═══╝
    `)

    // Initialize host
    const host = await import('../host.dev').then(m => m.useStudioHost)
    window.useStudioHost = () => host(user)

    const config = useRuntimeConfig()
    const el = document.createElement('script')
    el.src = `${config.public.contentStudio?.studioDevServer}/src/main.ts`
    el.type = 'module'
    document.body.appendChild(el)

    const wp = document.createElement('nuxt-studio')
    document.body.appendChild(wp)
  })
})
