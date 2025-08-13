// Lazy-loaded pinyin utility to reduce initial bundle size
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pinyinPro: any = null

export async function getPinyinForText(text: string): Promise<string> {
  if (!hasChinese(text)) return ''
  
  if (!pinyinPro) {
    const { pinyin } = await import('pinyin-pro')
    pinyinPro = pinyin
  }
  
  try {
    return pinyinPro!(text, { toneType: 'symbol' }) || ''
  } catch {
    return ''
  }
}

export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}