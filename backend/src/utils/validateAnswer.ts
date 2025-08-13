export function validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  if (!correctAnswer) return false
  const ua = (userAnswer || '').trim().toLowerCase()
  const ans = (correctAnswer || '').trim().toLowerCase()
  if (ans.includes(';') || ans.includes(' or ')) {
    const correctParts = ans.split(/;|\s+or\s+/).map(p => p.trim()).filter(Boolean)
    const userParts = ua.split(/\s+or\s+/).map(p => p.trim()).filter(Boolean)
    return userParts.some(p => correctParts.includes(p))
  }
  return ua === ans
}


