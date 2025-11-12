export function generateStemFromFsPath(fsPath: string) {
  return fsPath.split('.').slice(0, -1).join('.')
}

export const VirtualMediaCollectionName = 'public-assets' as const
