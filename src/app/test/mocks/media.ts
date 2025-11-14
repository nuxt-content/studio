import type { MediaItem } from '../../src/types'
import { vi } from 'vitest'

export const createMockFile = (name: string, overrides?: Partial<File>): File => {
  return {
    name,
    lastModified: Date.now(),
    type: 'image/png',
    size: 100,
    webkitRelativePath: '',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    bytes: () => Promise.resolve(new Uint8Array(100)),
    slice: () => new File([], ''),
    ...overrides,
  } as File
}

export const createMockMedia = (id: string, overrides?: Partial<MediaItem>): MediaItem => {
  const fsPath = id.split('/').slice(1).join('/')
  const extension = id.split('.').pop()!
  const stem = id.split('.').slice(0, -1).join('.')

  return {
    id,
    fsPath,
    stem,
    extension,
    ...overrides,
  }
}

export const mockFileToDataUrl = () => {
  const mockFileReader = {
    readAsDataURL: vi.fn(),
    result: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
    onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
  }

  mockFileReader.readAsDataURL = vi.fn().mockImplementation(() => {
    setTimeout(() => {
      if (mockFileReader.onload) {
        mockFileReader.onload({} as ProgressEvent<FileReader>)
      }
    }, 0)
  })

  global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as unknown as typeof FileReader

  return mockFileReader
}

export const mockResizeDataURL = () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  }

  const mockImage = {
    onload: null as (() => void) | null,
    src: '',
  }

  if (typeof document === 'undefined') {
    global.document = {
      createElement: vi.fn(),
    } as never
  }

  const originalCreateElement = document.createElement || vi.fn()
  document.createElement = vi.fn().mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement
    }
    if (tagName === 'img') {
      const img = mockImage
      // Simulate image loading
      setTimeout(() => {
        if (img.onload) {
          img.onload()
        }
      }, 0)
      return img as unknown as HTMLImageElement
    }
    if (typeof originalCreateElement === 'function') {
      return originalCreateElement.call(document, tagName)
    }
    return {} as HTMLElement
  }) as typeof document.createElement

  return { mockCanvas, mockImage }
}

// Setup all media-related mocks
export const setupMediaMocks = () => {
  const fileReader = mockFileToDataUrl()
  const { mockCanvas, mockImage } = mockResizeDataURL()

  return {
    fileReader,
    mockCanvas,
    mockImage,
  }
}
