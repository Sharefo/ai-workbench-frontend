import { useState } from 'react'
import { Input, InputNumber, Button, Table, Checkbox, Alert, Empty, Collapse, Space, Tag } from 'antd'
import type { LabConfig, SeedColumn, SeedPlan } from '../types'
import { api } from '../api'

interface Props {
  config: LabConfig | null
  onApplied: () => void
}

const EXAMPLES = [
  '建一张优惠券表：券id、用户id（关联已有用户）、面额、使用门槛、领取时间、使用时间、状态（未使用/已使用/已过期），造 5000 行',
  '建一张直播场次表：场次id、主播名、开播时间、时长分钟数、观看人数、下单数、GMV，造 300 行',
  '建一张客服工单表：工单号、用户id、问题类型、处理时长、是否解决、创建时间、处理人，造 2000 行',
]

export function SeedPanel({ config, onApplied }: Props) {
  const [instruction, setInstruction] = useState('')
  const [rowCount, setRowCount] = useState(1000)
  const [plan, setPlan] = useState<SeedPlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string>('')
  const [jsonDraft, setJsonDraft] = useState('')

  const disabled = !config?.llmEnabled

  const genPlan = async () => {
    setPlanning(true)
    setError('')
    setResult('')
    try {
      const p = await api.seedPlan(instruction, rowCount)
      setPlan(p)
      setJsonDraft(JSON.stringify(p, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPlanning(false)
    }
  }

  const apply = async () => {
    if (!plan) return
    setApplying(true)
    setError('')
    try {
      const r = await api.applySeed(plan)
      setResult(`表 ${r.table} 已创建，插入 ${r.inserted} 行，耗时 ${r.elapsedMs} ms`)
      onApplied()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setApplying(false)
    }
  }

  const updateColumn = (index: number, patch: Partial<SeedColumn>) => {
    setPlan((prev) => {
      if (!prev) return prev
      const columns = prev.columns.map((c, i) => (i === index ? { ...c, ...patch } : c))
      return { ...prev, columns }
    })
  }

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as SeedPlan
      setPlan(parsed)
      setError('')
    } catch (e) {
      setError('JSON 解析失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="seed-panel">
      {disabled ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="造数需要配置大模型"
          description="AI 负责把你的中文描述翻译成「表结构 + 字段生成规则」，再由后端批量生成数据。请先在后端配好密钥。"
        />
      ) : null}

      <div className="seed-examples">
        <span className="dim">试试这些：</span>
        {EXAMPLES.map((ex, i) => (
          <Tag
            key={i}
            className="example-tag"
            bordered={false}
            onClick={() => setInstruction(ex)}
            style={{ cursor: 'pointer' }}
          >
            {ex.slice(0, 22)}…
          </Tag>
        ))}
      </div>

      <Input.TextArea
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="用中文描述你要什么表、大概多少行，例如：建一张优惠券表，包含券id、用户id、面额、状态，造 5000 行"
      />
      <div className="seed-form">
        <span className="dim">默认行数</span>
        <InputNumber
          min={1}
          max={2000000}
          value={rowCount}
          onChange={(v) => setRowCount(v ?? 1000)}
          style={{ width: 120 }}
        />
        <Button type="primary" loading={planning} disabled={disabled || !instruction.trim()} onClick={genPlan}>
          生成造数方案
        </Button>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {result ? <Alert type="success" showIcon message={result} /> : null}

      {!plan ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先描述需求，生成方案后可以在这里微调再执行" />
      ) : (
        <div className="seed-plan">
          <div className="seed-plan-head">
            <Space size={4}>
              <span className="dim">表名</span>
              <Input
                value={plan.table}
                onChange={(e) => setPlan({ ...plan, table: e.target.value })}
                style={{ width: 170 }}
              />
            </Space>
            <Input
              value={plan.comment ?? ''}
              onChange={(e) => setPlan({ ...plan, comment: e.target.value })}
              placeholder="表说明"
              style={{ flex: 1 }}
            />
            <Space size={4}>
              <span className="dim">行数</span>
              <InputNumber
                min={1}
                max={2000000}
                value={plan.rowCount}
                onChange={(v) => setPlan({ ...plan, rowCount: v ?? 1000 })}
                style={{ width: 120 }}
              />
            </Space>
          </div>
          <div className="seed-plan-head">
            <Checkbox
              checked={!!plan.dropIfExists}
              onChange={(e) => setPlan({ ...plan, dropIfExists: e.target.checked })}
            >
              同名表先删除
            </Checkbox>
          </div>

          <Table<SeedColumn>
            size="small"
            pagination={false}
            rowKey={(r, i) => `${r.name}-${i}`}
            dataSource={plan.columns}
            columns={[
              {
                title: '字段',
                dataIndex: 'name',
                width: 130,
                render: (v: string, _r, i) => (
                  <Input size="small" value={v} onChange={(e) => updateColumn(i, { name: e.target.value })} />
                ),
              },
              {
                title: '类型',
                dataIndex: 'type',
                width: 130,
                render: (v: string, _r, i) => (
                  <Input size="small" value={v} onChange={(e) => updateColumn(i, { type: e.target.value })} />
                ),
              },
              {
                title: '说明',
                dataIndex: 'comment',
                render: (v: string | undefined, _r, i) => (
                  <Input size="small" value={v ?? ''} onChange={(e) => updateColumn(i, { comment: e.target.value })} />
                ),
              },
              {
                title: '生成规则',
                dataIndex: 'rule',
                width: 150,
                render: (v: Record<string, unknown> | undefined) => (
                  <span className="dim">{v?.kind ? String(v.kind) : '—'}</span>
                ),
              },
            ]}
          />

          <Collapse
            size="small"
            items={[
              {
                key: 'json',
                label: '高级：直接编辑完整 JSON 方案',
                children: (
                  <div>
                    <Input.TextArea rows={10} value={jsonDraft} onChange={(e) => setJsonDraft(e.target.value)} />
                    <Space style={{ marginTop: 8 }}>
                      <Button size="small" onClick={applyJson}>应用这份 JSON</Button>
                      <Button size="small" onClick={() => setJsonDraft(JSON.stringify(plan, null, 2))}>重置</Button>
                    </Space>
                  </div>
                ),
              },
            ]}
          />

          <Button type="primary" block loading={applying} onClick={apply} style={{ marginTop: 12 }}>
            建表并生成 {plan.rowCount.toLocaleString()} 行数据
          </Button>
        </div>
      )}
    </div>
  )
}
