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

export function getSolved(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SOLVED_KEY) || '{}')
  } catch {
    return {}
  }
}

export function markSolved(id: string, passed: boolean): void {
  const all = getSolved()
  if (passed) {
    all[id] = true
  } else {
    delete all[id]
  }
  localStorage.setItem(SOLVED_KEY, JSON.stringify(all))
}
