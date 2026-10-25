import type {
  ApiResp,
  ExecuteResp,
  GradeResp,
  LabConfig,
  SchemaResp,
  SeedPlan,
  SessionInfo,
  Exercise,
} from './types'
import { getSessionId } from './session'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Workbench-Session': getSessionId(),
      ...(init.headers || {}),
    },
  })
  const body = (await res.json()) as ApiResp<T>
  if (!res.ok || !body.ok) {
    const message = body.error?.message || `请求失败（HTTP ${res.status}）`
    throw new Error(message)
  }
  return body.data as T
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const api = {
  config: () => request<LabConfig>('/api/sql/config'),
  schema: () => request<SchemaResp>('/api/sql/schema'),
  sample: (table: string, n = 5) =>
    request<{ table: string; rows: string[][] }>(`/api/sql/sample?table=${encodeURIComponent(table)}&n=${n}`),
  execute: (sql: string, mode: 'QUERY' | 'ADMIN', maxRows: number, confirmed = false) =>
    post<ExecuteResp>('/api/sql/execute', { sql, mode, maxRows, confirmed }),
  sessions: () => request<SessionInfo[]>('/api/sql/sessions'),
  createSession: (name: string) =>
    post<{ id: string; name: string }>(`/api/sql/sessions?name=${encodeURIComponent(name)}`, {}),
  deleteSession: (id: string) => request<boolean>(`/api/sql/sessions/${id}`, { method: 'DELETE' }),
  reset: () => post<{ sessionId: string; elapsedMs: number }>('/api/sql/dataset/reset', {}),
  seedPlan: (instruction: string, rowCount: number) =>
    post<SeedPlan>('/api/sql/ai/seed-plan', { instruction, rowCount }),
  applySeed: (plan: SeedPlan) =>
    post<{ table: string; ddl: string; inserted: number; elapsedMs: number }>('/api/sql/seed/apply', plan),
  exercises: () => request<Exercise[]>('/api/sql/exercises'),
  grade: (exerciseId: string, sql: string) => post<GradeResp>('/api/sql/exercises/grade', { exerciseId, sql }),
}

export interface StreamHandlers {
  onDelta: (text: string) => void
  onDone: (payload: { text: string; sql?: string; explanation?: string }) => void
  onError: (message: string) => void
}

/** 读取后端 SSE 流，返回一个取消函数 */
export function streamAi(path: string, body: unknown, handlers: StreamHandlers): () => void {
  const controller = new AbortController()
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Workbench-Session': getSessionId() },
    body: JSON.stringify(body ?? {}),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.body) {
        handlers.onError('后端没有返回数据流')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''
        for (const chunk of chunks) {
          const line = chunk.split('\n').find((l) => l.startsWith('data:'))
          if (!line) continue
          try {
            const payload = JSON.parse(line.slice(5).trim())
            if (payload.type === 'delta') handlers.onDelta(payload.text)
            else if (payload.type === 'done') handlers.onDone(payload)
            else if (payload.type === 'error') handlers.onError(payload.message)
          } catch {
            // 忽略半包
          }
        }
      }
    })
    .catch((e: unknown) => {
      if (controller.signal.aborted) return
      handlers.onError(e instanceof Error ? e.message : String(e))
    })
  return () => controller.abort()
}
