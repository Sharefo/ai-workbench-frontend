const KEY = 'ai-workbench-session-id'

function randomId(): string {
  return 'u' + Math.random().toString(16).slice(2, 8) + Date.now().toString(16).slice(-4)
}

export function getSessionId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = randomId()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function setSessionId(id: string): void {
  localStorage.setItem(KEY, id)
}

const SOLVED_KEY = 'ai-workbench-solved'

/** 做题进度也按空间隔离：不同空间的题目不同，进度不该串 */
export function getSolved(sessionId?: string): Record<string, boolean> {
  try {
    const key = sessionId ? `${SOLVED_KEY}:${sessionId}` : SOLVED_KEY
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

export function markSolved(id: string, passed: boolean, sessionId?: string): void {
  const all = getSolved(sessionId)
  if (passed) {
    all[id] = true
  } else {
    delete all[id]
  }
  const key = sessionId ? `${SOLVED_KEY}:${sessionId}` : SOLVED_KEY
  localStorage.setItem(key, JSON.stringify(all))
}
