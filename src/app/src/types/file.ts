export enum ContentFileExtension {
  Markdown = 'md',
  YAML = 'yaml',
  YML = 'yml',
  JSON = 'json',
}

export type MediaFileExtension = ImageFileExtension | AudioFileExtension | VideoFileExtension

export enum ImageFileExtension {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  SVG = 'svg',
  WEBP = 'webp',
  AVIF = 'avif',
  ICO = 'ico',
  GIF = 'gif',
}

export enum AudioFileExtension {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  M4A = 'm4a',
  AAC = 'aac',
  FLAC = 'flac',
}

export enum VideoFileExtension {
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  MKV = 'mkv',
  WEBM = 'webm',
}

export interface ExtensionConfig {
  allowed: string[]
  default?: string
  editable: boolean
}
