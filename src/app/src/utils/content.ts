export function areContentEqual(content1: string | null, content2: string | null): boolean {
  if (content1 && content2) {
    return content1.trim() === content2.trim()
  }

  return false
}
