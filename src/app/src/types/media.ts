import type { BaseItem } from './item'

export enum MediaFileExtension {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  SVG = 'svg',
  WEBP = 'webp',
  ICO = 'ico',
  GIF = 'gif',
}

export interface MediaItem extends BaseItem {
  [key: string]: unknown
}
