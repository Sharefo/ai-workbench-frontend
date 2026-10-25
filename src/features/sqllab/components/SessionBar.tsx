import { useState } from 'react'
import { Button, Input, Modal, Popconfirm, Select, Space, Tag, Tooltip } from 'antd'
import type { LabConfig, SessionInfo } from '../types'

interface Props {
  sessionId: string
  sessions: SessionInfo[]
  config: LabConfig | null
  onSwitch: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  onReset: () => void
}

export function SessionBar({ sessionId, sessions, config, onSwitch, onCreate, onDelete, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  return (
    <div className="session-bar">
      <Space size={8}>
        <span className="dim">数据空间</span>
        <Select
          size="small"
          style={{ minWidth: 240 }}
          value={sessionId}
          onChange={onSwitch}
          options={sessions.map((s) => ({
            value: s.id,
            label: `${s.name}（${s.tableCount} 张表）`,
          }))}
        />
        <Button size="small" onClick={() => setOpen(true)}>新建</Button>
        <Tooltip title="丢弃本空间所有表，恢复成内置电商数据集">
          <Popconfirm title="确定恢复内置数据集？你自己建的表都会消失" onConfirm={onReset} okText="恢复" cancelText="取消">
            <Button size="small" danger>重置</Button>
          </Popconfirm>
        </Tooltip>
        {sessionId !== 'default' ? (
          <Popconfirm title="删除这个空间？" onConfirm={() => onDelete(sessionId)} okText="删除" cancelText="取消">
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        ) : null}
      </Space>
      <Space size={8}>
        {config ? (
          config.llmEnabled ? (
            <Tag color="green" bordered={false}>AI 已接入 · {config.model}</Tag>
          ) : (
            <Tag color="orange" bordered={false}>AI 未配置</Tag>
          )
        ) : null}
        {config ? <Tag bordered={false}>数据量 {config.scale}</Tag> : null}
      </Space>

      <Modal
        open={open}
        title="新建一个数据空间"
        onCancel={() => setOpen(false)}
        onOk={() => {
          onCreate(name.trim())
          setName('')
          setOpen(false)
        }}
        okText="创建"
        cancelText="取消"
      >
        <p className="dim">不同空间的数据完全隔离，各用各的表，互不干扰。</p>
        <Input
          placeholder="空间名称，例如：618 分析练习"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Modal>
    </div>
  )
}
