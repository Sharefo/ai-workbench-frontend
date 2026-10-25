import { Tabs, Tag, Button, Empty, Alert } from 'antd'
import type { StmtResult, LogLine } from '../types'
import { downloadCsv } from '../utils/csv'

interface Props {
  results: StmtResult[]
  logs: LogLine[]
  elapsedMs: number
  errorMessage: string
  onFixWithAi: () => void
  activeKey: string
  onActiveKeyChange: (key: string) => void
}

export function ResultPanel({
  results,
  logs,
  elapsedMs,
  errorMessage,
  onFixWithAi,
  activeKey,
  onActiveKeyChange,
}: Props) {
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
              message="执行失败"
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
