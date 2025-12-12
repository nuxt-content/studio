import { ImageFileExtension, VideoFileExtension, AudioFileExtension, ContentFileExtension } from '../types'

export const IMAGE_EXTENSIONS = [
  ImageFileExtension.PNG,
  ImageFileExtension.JPG,
  ImageFileExtension.JPEG,
  ImageFileExtension.SVG,
  ImageFileExtension.WEBP,
  ImageFileExtension.AVIF,
  ImageFileExtension.ICO,
  ImageFileExtension.GIF,
]

export const VIDEO_EXTENSIONS = [
  VideoFileExtension.MP4,
  VideoFileExtension.MOV,
  VideoFileExtension.AVI,
  VideoFileExtension.MKV,
  VideoFileExtension.WEBM,
]

export const AUDIO_EXTENSIONS = [
  AudioFileExtension.MP3,
  AudioFileExtension.WAV,
  AudioFileExtension.OGG,
  AudioFileExtension.M4A,
  AudioFileExtension.AAC,
  AudioFileExtension.FLAC,
]

export const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
]

export const CONTENT_EXTENSIONS = [
  ContentFileExtension.Markdown,
  ContentFileExtension.YAML,
  ContentFileExtension.YML,
  ContentFileExtension.JSON,
]

export const FILE_ICONS = {
  md: 'i-lucide-file-text',
  yaml: 'i-lucide-file-code',
  yml: 'i-lucide-file-code',
  json: 'i-lucide-file-json',
  ...IMAGE_EXTENSIONS.reduce((acc, ext) => ({ ...acc, [ext]: 'i-lucide-file-image' }), {}),
  ...VIDEO_EXTENSIONS.reduce((acc, ext) => ({ ...acc, [ext]: 'i-lucide-file-video' }), {}),
  ...AUDIO_EXTENSIONS.reduce((acc, ext) => ({ ...acc, [ext]: 'i-lucide-file-audio' }), {}),
}

export function parseName(name: string): { name: string, prefix: string | null, extension: string | null } {
  const prefixMatch = name.match(/^(\d+)\./)
  const extensionMatch = name.match(/\.(\w+)$/)
  return {
    prefix: prefixMatch ? prefixMatch[1] : null,
    extension: extensionMatch ? extensionMatch[1] : null,
    name: name.replace(/^\d+\./, ''),
  }
}

export function getFileExtension(fsPath: string) {
  return fsPath.split('#')[0].split('.').pop()!.toLowerCase()
}

export function getFileIcon(fsPath: string) {
  return FILE_ICONS[getFileExtension(fsPath) as keyof typeof FILE_ICONS] || 'i-mdi-file'
}

export function isMediaFile(fsPath: string) {
  return MEDIA_EXTENSIONS.includes(getFileExtension(fsPath) as ImageFileExtension | VideoFileExtension | AudioFileExtension)
}

export function isVideoFile(fsPath: string) {
  return VIDEO_EXTENSIONS.includes(getFileExtension(fsPath) as VideoFileExtension)
}

export function isAudioFile(fsPath: string) {
  return AUDIO_EXTENSIONS.includes(getFileExtension(fsPath) as AudioFileExtension)
}

export function isImageFile(fsPath: string) {
  return IMAGE_EXTENSIONS.includes(getFileExtension(fsPath) as ImageFileExtension)
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * Math.pow(10, dm)) / Math.pow(10, dm) + ' ' + sizes[i]
}

export function slugifyFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex === -1) {
    const normalized = fileName.normalize('NFKD').replace(/[\u0300-\u036F]/g, '')
    return slugifyString(normalized)
  }

  const name = fileName.substring(0, lastDotIndex)
  const extension = fileName.substring(lastDotIndex + 1)

  const normalized = name.normalize('NFKD').replace(/[\u0300-\u036F]/g, '')
  const slugifiedName = slugifyString(normalized)

  return `${slugifiedName}.${extension}`
}

function slugifyString(str: string): string {
  return str.replace(/[\s_()@#$%^&*+={}';:"<>?/|`~!-]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}
