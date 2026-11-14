import { useMemo, useState } from 'react'
import { App, Tabs, Tag, Button, Empty, Alert, Space, Tooltip, Input, Select, DatePicker } from 'antd'
import type { StmtResult, LogLine, HistoryItem } from '../types'
import { downloadCsv } from '../utils/csv'
import { copyText, resultToTsv } from '../utils/clipboard'

interface Props {
  results: StmtResult[]
  logs: LogLine[]
  history: HistoryItem[]
  elapsedMs: number
  errorMessage: string
  onFixWithAi: () => void
  onRestore: (item: HistoryItem) => void
  onReuseSql: (sql: string) => void
  activeKey: string
  onActiveKeyChange: (key: string) => void
}

export function ResultPanel({
  results,
  logs,
  history,
  elapsedMs,
  errorMessage,
  onFixWithAi,
  onRestore,
  onReuseSql,
  activeKey,
  onActiveKeyChange,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [range, setRange] = useState<'all' | '10m' | '1h' | 'today'>('all')
  const [pickedDate, setPickedDate] = useState('')

  const { message } = App.useApp()
  const doCopy = async (text: string, what: string) => {
    const ok = await copyText(text)
    if (ok) {
      message.success(`${what}已复制`)
    } else {
      message.warning('浏览器拒绝了复制权限，请手动选中复制')
    }
  }

  /* 执行记录：SQL 关键词 + 时间维度（快捷范围 / 指定日期）筛选 */
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const now = Date.now()
    const dayKey = (ts: number) => {
      const d = new Date(ts)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    return history.filter((h) => {
      if (kw && !`${h.sql} ${h.message ?? ''}`.toLowerCase().includes(kw)) return false
      if (pickedDate) return h.ts ? dayKey(h.ts) === pickedDate : false
      if (range === 'all') return true
      if (!h.ts) return false
      if (range === '10m') return now - h.ts <= 10 * 60 * 1000
      if (range === '1h') return now - h.ts <= 60 * 60 * 1000
      return dayKey(h.ts) === dayKey(now)
    })
  }, [history, keyword, range, pickedDate])

  const filteredActive = keyword.trim() !== '' || range !== 'all' || pickedDate !== ''
  const clearFilters = () => {
    setKeyword('')
    setRange('all')
    setPickedDate('')
  }

  const items = [
    {
      key: 'result',
      label: '结果',
      children: (
        <div className="result-area">
          {errorMessage ? (
            <Alert
              type="error"
              showIcon
              title="执行失败"
              description={
                <div>
                  <div className="error-text">{errorMessage}</div>
                  <Button size="small" type="primary" onClick={onFixWithAi} style={{ marginTop: 10 }}>
                    让 AI 帮我修复
                  </Button>
                </div>
              }
            />
          ) : null}
          {results.length === 0 && !errorMessage ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="写一条 SQL，按 Ctrl / Cmd + Enter 执行" />
          ) : null}
          {results.map((r) => (
            <div key={r.index} className="result-block">
              <div className="result-head">
                <Tag color={r.kind === 'SELECT' ? 'blue' : 'orange'}>{r.kind}</Tag>
                {r.kind === 'SELECT' ? (
                  <span>{r.rowCount} 行</span>
                ) : (
                  <span>影响 {r.affectedRows ?? 0} 行</span>
                )}
                <span className="dim">{r.elapsedMs} ms</span>
                {r.truncated ? <Tag color="red">结果已截断</Tag> : null}
                <span className="spacer" />
                {r.columns.length > 0 ? (
                  <Button
                    size="small"
                    onClick={() =>
                      downloadCsv(
                        r.columns.map((c) => c.label),
                        r.rows,
                        `result-${r.index}.csv`,
                      )
                    }
                  >
                    导出 CSV
                  </Button>
                ) : null}
              </div>
              {r.columns.length > 0 ? (
                <div className="grid-wrap">
                  <table className="grid">
                    <thead>
                      <tr>
                        <th className="row-no">#</th>
                        {r.columns.map((c) => (
                          <th key={c.name + c.label} title={c.type}>
                            {c.label}
                            <span className="col-type">{c.type}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row, ri) => (
                        <tr key={ri}>
                          <td className="row-no">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className={typeof cell === 'number' ? 'num' : undefined}>
                              {cell === null ? <em className="null">NULL</em> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'history',
      label: `执行记录 (${history.length})`,
      children: (
        <div className="log-area">
          <div className="history-filters">
            <Input.Search
              allowClear
              size="small"
              placeholder="搜 SQL 关键词 / 报错内容"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              size="small"
              value={range}
              onChange={setRange}
              style={{ width: 132 }}
              options={[
                { label: '全部时间', value: 'all' },
                { label: '最近 10 分钟', value: '10m' },
                { label: '最近 1 小时', value: '1h' },
                { label: '今天', value: 'today' },
              ]}
            />
            <DatePicker
              size="small"
              allowClear
              placeholder="按日期筛选"
              onChange={(d) => setPickedDate(d ? d.format('YYYY-MM-DD') : '')}
            />
            <span className="dim">{filtered.length} / {history.length} 条</span>
            {filteredActive ? (
              <Button size="small" type="link" onClick={clearFilters}>清除筛选</Button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有执行记录，跑一条 SQL 就会出现在这里" />
          ) : filtered.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有符合条件的执行记录，换个关键词或时间范围试试" />
          ) : (
            filtered.map((h) => (
              <div key={h.id} className="history-item">
                <div className="history-head">
                  <span className="history-at">{h.at}</span>
                  <Tag color={h.ok ? 'success' : 'error'} variant="filled">
                    {h.ok ? '成功' : '失败'}
                  </Tag>
                  <Tag variant="filled">{h.mode === 'ADMIN' ? '管理模式' : '查询模式'}</Tag>
                  <span className="dim">{h.elapsedMs} ms</span>
                  <span className="dim">{h.rowCount} 行</span>
                  <span className="spacer" />
                  <Space size={4}>
                    <Button size="small" onClick={() => onRestore(h)}>
                      看结果
                    </Button>
                    <Button size="small" onClick={() => onReuseSql(h.sql)}>
                      填回编辑器
                    </Button>
                    <Tooltip title="复制这条 SQL">
                      <Button size="small" onClick={() => void doCopy(h.sql, 'SQL')}>
                        复制 SQL
                      </Button>
                    </Tooltip>
                    <Tooltip title="把结果复制成可直接粘进 Excel / 飞书表格的文本">
                      <Button
                        size="small"
                        onClick={() =>
                          void doCopy(
                            resultToTsv(
                              h.statements[0]?.columns.map((c) => c.label) ?? [],
                              h.statements[0]?.rows ?? [],
                            ),
                            '结果',
                          )
                        }
                      >
                        复制结果
                      </Button>
                    </Tooltip>
                  </Space>
                </div>
                <pre className="history-sql">{h.sql}</pre>
                {h.ok ? null : <div className="history-err">{h.message}</div>}
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'log',
      label: `日志 (${logs.length})`,
      children: (
        <div className="log-area">
          {logs.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有执行记录" />
          ) : (
            logs.map((l) => (
              <div key={l.id} className={`log-line log-${l.level}`}>
                <span className="log-at">{l.at}</span>
                <span>{l.text}</span>
              </div>
            ))
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="result-panel">
      <div className="result-panel-head">
        <Tabs size="small" activeKey={activeKey} items={items} onChange={onActiveKeyChange} />
        <span className="dim total-time">共 {elapsedMs} ms</span>
      </div>
    </div>
  )
}
