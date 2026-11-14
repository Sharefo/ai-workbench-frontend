import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, InputNumber, Segmented, Space, Tabs, Tooltip } from 'antd'
import { api } from '../features/sqllab/api'
import { getSessionId, setSessionId } from '../features/sqllab/session'
import type { HistoryItem, LabConfig, LogLine, SchemaResp, SessionInfo, StmtResult } from '../features/sqllab/types'
import { SqlEditor, type SqlEditorHandle } from '../features/sqllab/components/SqlEditor'
import { SchemaTree } from '../features/sqllab/components/SchemaTree'
import { ResultPanel } from '../features/sqllab/components/ResultPanel'
import { AiPanel, type AiMode } from '../features/sqllab/components/AiPanel'
import { SeedPanel } from '../features/sqllab/components/SeedPanel'
import { ExercisePanel } from '../features/sqllab/components/ExercisePanel'
import { SessionBar } from '../features/sqllab/components/SessionBar'
import { copyText } from '../features/sqllab/utils/clipboard'

const WELCOME_SQL = `-- 欢迎来到 SQL 实验室
-- 按 Ctrl / Cmd + Enter 执行，也可以点右上角「执行」
-- 左边看表结构（双击表名或字段名可以直接插到这里）

SELECT
  status,
  COUNT(*) AS cnt,
  ROUND(SUM(amount), 2) AS amount
FROM orders
GROUP BY status
ORDER BY amount DESC;
`

export function SqlLabPage() {
  const { modal, message } = App.useApp()
  const editor = useRef<SqlEditorHandle>(null)

  const [sessionId, setSession] = useState<string>(() => getSessionId())
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [config, setConfig] = useState<LabConfig | null>(null)
  const [schema, setSchema] = useState<SchemaResp | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)

  const [sql, setSql] = useState(WELCOME_SQL)
  const [mode, setMode] = useState<'QUERY' | 'ADMIN'>('QUERY')
  const [maxRows, setMaxRows] = useState(1000)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<StmtResult[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [logs, setLogs] = useState<LogLine[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [resultTab, setResultTab] = useState('result')
  const [rightTab, setRightTab] = useState('ai')
  const [aiMode, setAiMode] = useState<AiMode>('generate')
  const [editorHeight, setEditorHeight] = useState(260)

  /* 编辑器与结果区之间的分隔条：上下拖动调整高度 */
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = editorHeight
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev: PointerEvent) => {
      const max = Math.max(160, window.innerHeight - 320)
      setEditorHeight(Math.min(Math.max(startH + ev.clientY - startY, 120), max))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const logId = useRef(0)
  const pushLog = useCallback((level: LogLine['level'], text: string) => {
    logId.current += 1
    const at = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs((prev) => [{ id: logId.current, at, level, text }, ...prev].slice(0, 200))
  }, [])

  const pushHistory = useCallback(
    (item: Omit<HistoryItem, 'id' | 'at'>) => {
      logId.current += 1
      const at = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      setHistory((prev) => [{ id: logId.current, at, ts: Date.now(), ...item }, ...prev].slice(0, 30))
    },
    [],
  )

  const refreshSchema = useCallback(
    async (silent = false) => {
      setSchemaLoading(true)
      try {
        const data = await api.schema()
        setSchema(data)
      } catch (e) {
        if (!silent) pushLog('error', e instanceof Error ? e.message : String(e))
      } finally {
        setSchemaLoading(false)
      }
    },
    [pushLog],
  )

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await api.sessions())
    } catch {
      setSessions([])
    }
  }, [])

  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig(null))
    refreshSessions()
    refreshSchema()
  }, [refreshSessions, refreshSchema])

  const run = useCallback(
    async (confirmed = false) => {
      const text = editor.current?.getValue() ?? sql
      if (!text.trim()) {
        setErrorMessage('先写一条 SQL 吧')
        return
      }
      setRunning(true)
      setErrorMessage('')
      try {
        const res = await api.execute(text, mode, maxRows, confirmed)
        if (res.needConfirm) {
          modal.confirm({
            title: '这个操作不可逆',
            content: res.confirmMessage,
            okText: '确定执行',
            okButtonProps: { danger: true },
            cancelText: '算了',
            onOk: () => run(true),
          })
          pushLog('info', '已拦下危险操作，等待确认')
          setRunning(false)
          return
        }
        setResults(res.statements)
        setElapsed(res.elapsedMs)
        setResultTab('result')
        const wrote = res.statements.some((s) => s.kind !== 'SELECT')
        const rowCount = res.statements.reduce((n, s) => n + s.rowCount, 0)
        pushHistory({
          sql: text,
          mode,
          ok: true,
          message: '',
          elapsedMs: res.elapsedMs,
          rowCount,
          statements: res.statements,
        })
        pushLog(
          'success',
          `执行成功 · ${res.elapsedMs} ms · ${res.statements.length} 条语句${wrote ? ' · 已刷新表结构' : ''}`,
        )
        if (wrote) void refreshSchema(true)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setErrorMessage(message)
        setResults([])
        setResultTab('result')
        pushHistory({
          sql: text,
          mode,
          ok: false,
          message,
          elapsedMs: 0,
          rowCount: 0,
          statements: [],
        })
        pushLog('error', message)
      } finally {
        setRunning(false)
      }
    },
    [sql, mode, maxRows, modal, pushLog, refreshSchema],
  )

  const insert = useCallback((text: string) => editor.current?.insert(text), [])

  const doCopy = useCallback(
    async (text: string) => {
      const ok = await copyText(text)
      if (ok) {
        message.success('SQL 已复制')
      } else {
        message.warning('浏览器拒绝了复制权限，请手动选中复制')
      }
    },
    [message],
  )

  const restoreHistory = useCallback((item: HistoryItem) => {
    setResults(item.statements)
    setElapsed(item.elapsedMs)
    setErrorMessage(item.ok ? '' : item.message)
    setResultTab('result')
  }, [])

  const applySql = useCallback(
    (newSql: string) => {
      setSql(newSql)
      editor.current?.setValue(newSql)
      editor.current?.focus()
    },
    [],
  )

  const runSql = useCallback(
    (newSql: string) => {
      applySql(newSql)
      setTimeout(() => void run(false), 30)
    },
    [applySql, run],
  )

  const switchSession = (id: string) => {
    setSessionId(id)
    setSession(id)
    setResults([])
    setErrorMessage('')
    setHistory([])
    void refreshSchema()
  }

  const renameSession = async (name: string) => {
    try {
      await api.renameSession(sessionId, name)
      await refreshSessions()
    } catch (e) {
      pushLog('error', e instanceof Error ? e.message : String(e))
    }
  }

  const createSession = async (name: string) => {
    try {
      const created = await api.createSession(name || '我的空间')
      setSessionId(created.id)
      setSession(created.id)
      setResults([])
      await refreshSessions()
      await refreshSchema()
    } catch (e) {
      pushLog('error', e instanceof Error ? e.message : String(e))
    }
  }

  const deleteSession = async (id: string) => {
    await api.deleteSession(id)
    if (id === sessionId) {
      setSessionId('default')
      setSession('default')
    }
    await refreshSessions()
    void refreshSchema()
  }

  const resetDataset = async () => {
    await api.reset()
    void refreshSchema()
    pushLog('info', '已恢复内置电商数据集')
  }

  return (
    <div className="sqllab">
      <SessionBar
        sessionId={sessionId}
        sessions={sessions}
        config={config}
        onSwitch={switchSession}
        onCreate={(name) => void createSession(name)}
        onRename={(name) => void renameSession(name)}
        onDelete={(id) => void deleteSession(id)}
        onReset={() => void resetDataset()}
      />

      <div className="sqllab-body">
        <aside className="sqllab-left">
          <SchemaTree
            schema={schema}
            loading={schemaLoading}
            onRefresh={() => void refreshSchema()}
            onInsert={insert}
          />
        </aside>

        <section className="sqllab-center">
          <div className="toolbar">
            <Space size={8}>
              <Tooltip title="Ctrl / Cmd + Enter">
                <Button type="primary" loading={running} onClick={() => void run(false)}>
                  执行
                </Button>
              </Tooltip>
              <Segmented
                size="small"
                value={mode}
                onChange={(v) => {
                  setMode(v as 'QUERY' | 'ADMIN')
                  applySql('') // 切换查询/管理模式时清空编辑器，避免把查询误跑成写入
                }}
                options={[
                  { label: '查询模式', value: 'QUERY' },
                  { label: '管理模式', value: 'ADMIN' },
                ]}
              />
              <span className="dim">最多返回</span>
              <InputNumber
                size="small"
                min={1}
                max={config?.hardMaxRows ?? 5000}
                value={maxRows}
                onChange={(v) => setMaxRows(v ?? 1000)}
                style={{ width: 90 }}
              />
              <span className="dim">行</span>
            </Space>
            <Space size={8}>
              <Button size="small" onClick={() => void doCopy(editor.current?.getValue() ?? sql)}>
                复制 SQL
              </Button>
              <Button size="small" onClick={() => applySql('')}>清空</Button>
            </Space>
          </div>

          <div className="editor-wrap" style={{ height: editorHeight }}>
            <SqlEditor ref={editor} value={sql} onChange={setSql} onRun={() => void run(false)} schema={schema} />
          </div>

          <div
            className="editor-resizer"
            onPointerDown={startResize}
            title="上下拖动调整编辑器高度"
            role="separator"
            aria-orientation="horizontal"
          >
            <span />
          </div>

          <ResultPanel
            results={results}
            logs={logs}
            history={history}
            elapsedMs={elapsed}
            errorMessage={errorMessage}
            onRestore={restoreHistory}
            onReuseSql={applySql}
            activeKey={resultTab}
            onActiveKeyChange={setResultTab}
            onFixWithAi={() => {
              setRightTab('ai')
              setAiMode('fix')
            }}
          />
        </section>

        <aside className="sqllab-right">
          <Tabs
            className="right-tabs"
            activeKey={rightTab}
            onChange={setRightTab}
            items={[
              {
                key: 'ai',
                label: 'AI 助手',
                children: (
                  <AiPanel
                    config={config}
                    getSql={() => editor.current?.getValue() ?? sql}
                    lastError={errorMessage}
                    mode={aiMode}
                    onModeChange={setAiMode}
                    onApplySql={applySql}
                    onRunSql={runSql}
                  />
                ),
              },
              {
                key: 'exercise',
                label: '闯关练习',
                children: <ExercisePanel sessionId={sessionId} getSql={() => editor.current?.getValue() ?? sql} setSql={applySql} />,
              },
              {
                key: 'seed',
                label: '造数',
                children: <SeedPanel config={config} onApplied={() => void refreshSchema()} onSpaceSwitch={switchSession} />,
              },
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
