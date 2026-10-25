import { useCallback, useEffect, useRef, useState } from 'react'
import { App, Button, InputNumber, Segmented, Space, Tabs, Tooltip } from 'antd'
import { api } from '../features/sqllab/api'
import { getSessionId, setSessionId } from '../features/sqllab/session'
import type { LabConfig, LogLine, SchemaResp, SessionInfo, StmtResult } from '../features/sqllab/types'
import { SqlEditor, type SqlEditorHandle } from '../features/sqllab/components/SqlEditor'
import { SchemaTree } from '../features/sqllab/components/SchemaTree'
import { ResultPanel } from '../features/sqllab/components/ResultPanel'
import { AiPanel, type AiMode } from '../features/sqllab/components/AiPanel'
import { SeedPanel } from '../features/sqllab/components/SeedPanel'
import { ExercisePanel } from '../features/sqllab/components/ExercisePanel'
import { SessionBar } from '../features/sqllab/components/SessionBar'

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
  const { modal } = App.useApp()
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
  const [resultTab, setResultTab] = useState('result')
  const [rightTab, setRightTab] = useState('ai')
  const [aiMode, setAiMode] = useState<AiMode>('generate')

  const logId = useRef(0)
  const pushLog = useCallback((level: LogLine['level'], text: string) => {
    logId.current += 1
    const at = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs((prev) => [{ id: logId.current, at, level, text }, ...prev].slice(0, 200))
  }, [])

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
        pushLog('error', message)
      } finally {
        setRunning(false)
      }
    },
    [sql, mode, maxRows, modal, pushLog, refreshSchema],
  )

  const insert = useCallback((text: string) => editor.current?.insert(text), [])

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
    void refreshSchema()
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
                onChange={(v) => setMode(v as 'QUERY' | 'ADMIN')}
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
              <Button size="small" onClick={() => applySql('')}>清空</Button>
            </Space>
          </div>

          <div className="editor-wrap">
            <SqlEditor ref={editor} value={sql} onChange={setSql} onRun={() => void run(false)} schema={schema} />
          </div>

          <ResultPanel
            results={results}
            logs={logs}
            elapsedMs={elapsed}
            errorMessage={errorMessage}
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
                children: <ExercisePanel getSql={() => editor.current?.getValue() ?? sql} setSql={applySql} />,
              },
              {
                key: 'seed',
                label: '造数',
                children: <SeedPanel config={config} onApplied={() => void refreshSchema()} />,
              },
            ]}
          />
        </aside>
      </div>
    </div>
  )
}
