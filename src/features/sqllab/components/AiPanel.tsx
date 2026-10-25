import { useRef, useState } from 'react'
import { Input, Button, Alert, Tag, Empty, Space, Tooltip, Segmented } from 'antd'
import type { LabConfig } from '../types'
import { streamAi } from '../api'

export type AiMode = 'generate' | 'fix' | 'explain'

interface Props {
  config: LabConfig | null
  getSql: () => string
  lastError: string
  mode: AiMode
  onModeChange: (mode: AiMode) => void
  onApplySql: (sql: string) => void
  onRunSql: (sql: string) => void
}

type Mode = AiMode

export function AiPanel({ config, getSql, lastError, mode, onModeChange, onApplySql, onRunSql }: Props) {
  const [question, setQuestion] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [text, setText] = useState('')
  const [sql, setSql] = useState('')
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState('')
  const cancel = useRef<(() => void) | null>(null)

  const disabled = !config?.llmEnabled

  const run = () => {
    if (disabled) return
    setError('')
    setText('')
    setSql('')
    setExplanation('')
    setStreaming(true)
    const payload =
      mode === 'generate'
        ? { question }
        : mode === 'fix'
          ? { sql: getSql(), errorMessage: lastError }
          : { sql: getSql() }
    const path = mode === 'generate' ? '/api/sql/ai/generate' : mode === 'fix' ? '/api/sql/ai/fix' : '/api/sql/ai/explain'
    cancel.current = streamAi(path, payload, {
      onDelta: (delta) => setText((prev) => prev + delta),
      onDone: (payload) => {
        setStreaming(false)
        setSql(payload.sql ?? '')
        setExplanation(payload.explanation ?? '')
      },
      onError: (message) => {
        setStreaming(false)
        setError(message)
      },
    })
  }

  const stop = () => {
    cancel.current?.()
    setStreaming(false)
  }

  return (
    <div className="ai-panel">
      {disabled ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="还没有配置大模型"
          description="在后端 application-local.yml 的 llm.api-key 或环境变量 LLM_API_KEY 中填好密钥并重启后端即可。不配也能正常手写 SQL 练习。"
        />
      ) : (
        <div className="ai-model">
          <Tag color="green" bordered={false}>{config?.model}</Tag>
          <span className="dim">已就绪</span>
        </div>
      )}

      <Segmented
        block
        value={mode}
        onChange={(v) => onModeChange(v as Mode)}
        options={[
          { label: '生成 SQL', value: 'generate' },
          { label: '修复报错', value: 'fix' },
          { label: '讲解', value: 'explain' },
        ]}
      />

      <div className="ai-body">
        {mode === 'generate' ? (
          <Input.TextArea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="用中文描述你想看的数据，例如：最近 7 天每个渠道的下单金额，按金额从高到低"
          />
        ) : (
          <div className="ai-context">
            {mode === 'fix' ? (
              lastError ? (
                <div className="ai-error-box">{lastError}</div>
              ) : (
                <div className="dim">当前没有报错信息，可以先执行一条 SQL</div>
              )
            ) : null}
            <div className="dim">
              将对编辑器里的这段 SQL 进行处理：
              <pre className="ai-sql-preview">{getSql() || '（编辑器为空）'}</pre>
            </div>
          </div>
        )}

        <div className="ai-actions">
          {streaming ? (
            <Button danger onClick={stop}>停止</Button>
          ) : (
            <Button type="primary" disabled={disabled || (mode === 'generate' && !question.trim())} onClick={run}>
              {mode === 'generate' ? '生成 SQL' : mode === 'fix' ? '让 AI 修复' : '讲解这段 SQL'}
            </Button>
          )}
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {streaming || text ? (
          <div className="ai-output">
            {sql ? (
              <>
                <div className="ai-output-head">
                  <span>生成的 SQL</span>
                  <Space size={4}>
                    <Tooltip title="填进编辑器，自己再改改">
                      <Button size="small" onClick={() => onApplySql(sql)}>插入到编辑器</Button>
                    </Tooltip>
                    <Button size="small" type="primary" onClick={() => onRunSql(sql)}>直接执行</Button>
                  </Space>
                </div>
                <pre className="ai-sql">{sql}</pre>
              </>
            ) : null}
            {explanation ? <div className="ai-explanation">{explanation}</div> : null}
            {streaming && !sql ? <pre className="ai-sql streaming">{text}</pre> : null}
          </div>
        ) : (
          !error && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={mode === 'generate' ? '描述你的需求，AI 会结合当前库表结构生成 SQL' : ''}
            />
          )
        )}
      </div>
    </div>
  )
}
