import { useEffect, useState } from 'react'
import { Button, Card, Tag } from 'antd'

type BackendInfo = { name: string; version: string }

export function HomePage({ onGoSql }: { onGoSql: () => void }) {
  const [info, setInfo] = useState<BackendInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/info')
      .then((res) => (res.ok ? (res.json() as Promise<BackendInfo>) : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <div className="home">
      <h1>AI 工作台</h1>
      <p className="subtitle">给运营同学的一站式数据工作台</p>

      <Card title="SQL 实验室" className="home-card">
        <p>
          一个可以放心乱来的在线 SQL 练习场：内置电商数据集，随时用一句话造新表新数据，
          写不出 SQL 就让 AI 先起个草稿，写完还能一键判分。
        </p>
        <ul className="home-list">
          <li>内置 10 张电商业务表（用户 / 商品 / 订单 / 明细 / 支付 / 渠道 / 活动 / 行为 / 日期维表）</li>
          <li>一句话造数：「建一张优惠券表，造 5000 行」——AI 出方案，后端秒级生成</li>
          <li>AI 生成 SQL、报错自动修复、SQL 中文讲解</li>
          <li>15 道由浅入深的闯关题，提交后自动比对结果判分</li>
        </ul>
        <Button type="primary" onClick={onGoSql}>进入 SQL 实验室</Button>
      </Card>

      <Card title="后端连接状态" className="home-card">
        {info ? (
          <Tag color="green" bordered={false}>
            已连接 {info.name} v{info.version}
          </Tag>
        ) : error ? (
          <Tag color="red" bordered={false}>
            未连接（{error}）—— 需要先 ./gradlew bootRun 启动后端
          </Tag>
        ) : (
          <span className="dim">检查中…</span>
        )}
      </Card>
    </div>
  )
}
