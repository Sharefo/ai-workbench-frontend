import { useMemo, useState } from 'react'
import { Input, Tree, Tag, Modal, Button, Empty, Spin, Tooltip } from 'antd'
import type { SchemaResp } from '../types'
import { api } from '../api'

interface Props {
  schema: SchemaResp | null
  loading: boolean
  onRefresh: () => void
  onInsert: (text: string) => void
}

type Cell = string | number | boolean | null

export function SchemaTree({ schema, loading, onRefresh, onInsert }: Props) {
  const [keyword, setKeyword] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [sample, setSample] = useState<{ table: string; rows: Cell[][] } | null>(null)
  const [sampleLoading, setSampleLoading] = useState(false)

  const treeData = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return (schema?.tables ?? [])
      .filter((t) =>
        !kw
          ? true
          : t.name.includes(kw) ||
            (t.comment ?? '').toLowerCase().includes(kw) ||
            t.columns.some((c) => c.name.includes(kw) || (c.comment ?? '').includes(kw)),
      )
      .map((t) => ({
        key: `t:${t.name}`,
        title: (
          <span
            className="tree-table"
            onDoubleClick={() => onInsert(t.name)}
            title="双击表名插入到编辑器；点右侧按钮看样例数据"
          >
            <span className="tree-table-name">{t.name}</span>
            {t.comment ? <span className="tree-comment">{t.comment}</span> : null}
            <Tag bordered={false} color="blue">
              {t.rowCount < 0 ? '—' : t.rowCount.toLocaleString()}
            </Tag>
            <Button
              size="small"
              type="link"
              className="sample-btn"
              onClick={(e) => {
                e.stopPropagation()
                void openSample(t.name)
              }}
            >
              样例
            </Button>
          </span>
        ),
        children: t.columns.map((c) => ({
          key: `c:${t.name}.${c.name}`,
          isLeaf: true,
          title: (
            <span className="tree-column" onDoubleClick={() => onInsert(c.name)} title="双击字段名插入到编辑器">
              <span className="tree-col-name">{c.name}</span>
              <span className="tree-col-type">{c.type}</span>
              {c.primaryKey ? <Tag bordered={false} color="gold">PK</Tag> : null}
              {c.comment ? <Tooltip title={c.comment}><span className="tree-comment">{c.comment}</span></Tooltip> : null}
            </span>
          ),
        })),
      }))
  }, [schema, keyword, onInsert])

  const openSample = async (table: string) => {
    setSampleLoading(true)
    try {
      const data = await api.sample(table, 8)
      setSample({ table, rows: data.rows as Cell[][] })
    } catch (e) {
      setSample({ table, rows: [] })
    } finally {
      setSampleLoading(false)
    }
  }

  return (
    <div className="schema-panel">
      <div className="panel-head">
        <span>库表结构</span>
        <Button size="small" type="link" onClick={onRefresh}>刷新</Button>
      </div>
      <Input.Search
        allowClear
        size="small"
        placeholder="搜表名 / 字段名"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div className="schema-body">
        {loading && !schema ? (
          <div className="schema-loading"><Spin size="small" /></div>
        ) : treeData.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有表，去「造数」建一张" />
        ) : (
          <Tree
            treeData={treeData}
            blockNode
            expandedKeys={keyword ? undefined : expanded}
            onExpand={(keys) => setExpanded(keys as string[])}
            defaultExpandAll={!!keyword}
          />
        )}
      </div>
      <div className="schema-footer">
        双击表 / 字段名可插入编辑器
      </div>

      <Modal
        open={!!sample}
        title={sample ? `样例数据 · ${sample.table}` : ''}
        onCancel={() => setSample(null)}
        footer={null}
        width={720}
      >
        {sampleLoading ? (
          <Spin />
        ) : sample && sample.rows.length > 0 ? (
          <div className="sample-table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  {(sample.rows[0] as Cell[]).map((h, i) => (
                    <th key={i}>{String(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.rows.slice(1).map((row, ri) => (
                  <tr key={ri}>
                    {(row as Cell[]).map((c, ci) => (
                      <td key={ci}>{c === null ? <em className="null">NULL</em> : String(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description="没有数据" />
        )}
      </Modal>
    </div>
  )
}
