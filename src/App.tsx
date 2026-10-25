import { useEffect, useState } from 'react'
import './App.css'

type BackendInfo = {
  name: string
  version: string
}

export default function App() {
  const [info, setInfo] = useState<BackendInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/info')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<BackendInfo>
      })
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <main className="app">
      <h1>AI 工作台</h1>
      <p className="subtitle">React 19 · Vite 8 · TypeScript</p>

      <section className="card">
        <h2>后端连接状态</h2>
        {info ? (
          <p className="ok">
            已连接 {info.name} v{info.version}
          </p>
        ) : error ? (
          <p className="err">未连接（{error}）—— 后端未启动时属正常</p>
        ) : (
          <p>检查中…</p>
        )}
      </section>

      <section className="card">
        <h2>开发入口</h2>
        <ul>
          <li>
            <code>pnpm/npm run dev</code> 启动前端（5173）
          </li>
          <li>
            <code>./gradlew bootRun</code> 启动后端（8080）
          </li>
        </ul>
      </section>
    </main>
  )
}
