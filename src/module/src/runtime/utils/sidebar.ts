const DEFAULT_SIDEBAR_WIDTH = 440
const SIDEBAR_WIDTH_STORAGE_KEY = 'studio-sidebar-width'

export function getSidebarWidth(): number {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
    if (savedWidth) {
      const width = Number.parseInt(savedWidth, 10)
      if (!Number.isNaN(width)) {
        return width
      }
    }
  }

  return DEFAULT_SIDEBAR_WIDTH
}

export function adjustFixedElements(sidebarWidth: number) {
  document.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement
    if (window.getComputedStyle(htmlEl).position === 'fixed') {
      htmlEl.style.left = sidebarWidth > 0 ? `${sidebarWidth}px` : ''
    }
  })
}

export function getHostStyles(): Record<string, Record<string, string>> {
  const currentWidth = getSidebarWidth()
  return {
    'body[data-studio-active]': {
      transition: 'margin 0.2s ease',
    },
    'body[data-studio-active][data-expand-sidebar]': {
      marginLeft: `${currentWidth}px`,
    },
  }
}
