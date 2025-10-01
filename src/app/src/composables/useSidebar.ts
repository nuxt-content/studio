import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createSharedComposable, useLocalStorage } from '@vueuse/core'

export const useSidebar = createSharedComposable(() => {
  const MIN_WIDTH = 440
  const MAX_WIDTH = 800
  const DEFAULT_WIDTH = 440

  const sidebarWidth = useLocalStorage('studio-sidebar-width', DEFAULT_WIDTH)
  const isResizing = ref(false)
  const resizeStartX = ref(0)
  const resizeStartWidth = ref(0)

  const constrainedWidth = computed(() => {
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, sidebarWidth.value))
  })

  const sidebarStyle = computed(() => ({
    width: `${constrainedWidth.value}px`,
  }))

  const bodyMarginStyle = computed(() => ({
    marginLeft: `${constrainedWidth.value}px`,
  }))

  function startResize(event: MouseEvent) {
    event.preventDefault()
    isResizing.value = true
    resizeStartX.value = event.clientX
    resizeStartWidth.value = constrainedWidth.value

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.body.style.transition = 'none'
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing.value) return

    event.preventDefault()
    const deltaX = event.clientX - resizeStartX.value
    const newWidth = resizeStartWidth.value + deltaX

    // Limit to constraints
    sidebarWidth.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
  }

  function stopResize() {
    if (!isResizing.value) return

    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.style.transition = ''
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isResizing.value) return

    event.preventDefault()
    const touch = event.touches[0]
    if (!touch) return

    const deltaX = touch.clientX - resizeStartX.value
    const newWidth = resizeStartWidth.value + deltaX

    sidebarWidth.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
  }

  function stopTouchResize() {
    if (!isResizing.value) return
    isResizing.value = false
  }

  function resetWidth() {
    sidebarWidth.value = DEFAULT_WIDTH
  }

  onMounted(() => {
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', stopResize)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', stopTouchResize)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', stopTouchResize)
  })

  return {
    sidebarWidth: constrainedWidth,
    isResizing,

    MIN_WIDTH,
    MAX_WIDTH,
    DEFAULT_WIDTH,

    sidebarStyle,
    bodyMarginStyle,

    startResize,
    resetWidth,
  }
})
