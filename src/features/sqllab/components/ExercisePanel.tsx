import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Empty, Space, Tag, Tooltip } from 'antd'
import type { Exercise, GradeResp } from '../types'
import { api } from '../api'
import { getSolved, markSolved } from '../session'

interface Props {
  getSql: () => string
  setSql: (sql: string) => void
}

const LEVEL_NAME: Record<number, string> = {
  1: '第一关 · 认识数据',
  2: '第二关 · 聚合统计',
  3: '第三关 · 多表关联',
  4: '第四关 · 进阶玩法',
}

export function ExercisePanel({ getSql, setSql }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [current, setCurrent] = useState<string>('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResp | null>(null)
  const [solved, setSolved] = useState<Record<string, boolean>>(() => getSolved())

  useEffect(() => {
    api
      .exercises()
      .then((list) => {
        setExercises(list)
        if (list.length > 0) setCurrent(list[0].id)
      })
      .catch(() => setExercises([]))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<number, Exercise[]>()
    for (const e of exercises) {
      map.set(e.level, [...(map.get(e.level) ?? []), e])
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [exercises])

  const exercise = exercises.find((e) => e.id === current) ?? null
  const doneCount = Object.keys(solved).length

  const submit = async () => {
    if (!exercise) return
    setGrading(true)
    setResult(null)
    try {
      const r = await api.grade(exercise.id, getSql())
      setResult(r)
      markSolved(exercise.id, r.passed)
      setSolved(getSolved())
    } catch (e) {
      setResult({
        passed: false,
        status: 'ERROR',
        message: e instanceof Error ? e.message : String(e),
        expectedRowCount: 0,
        actualRowCount: 0,
        hints: [],
      })
    } finally {
      setGrading(false)
    }
  }

  const loadIntoEditor = () => {
    if (!exercise) return
    setSql(`-- 练习：${exercise.title}\n-- 要求：${exercise.description}\n\n`)
  }

  if (exercises.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="题目加载中…" />
  }

  return (
    <div className="exercise-panel">
      <div className="exercise-progress">
        <span className="dim">已通过</span>
        <strong>{doneCount}</strong>
        <span className="dim">/ {exercises.length}</span>
      </div>

      {grouped.map(([level, list]) => (
        <div key={level} className="exercise-group">
          <div className="exercise-group-title">{LEVEL_NAME[level] ?? `第 ${level} 关`}</div>
          <div className="exercise-list">
            {list.map((e) => (
              <button
                key={e.id}
                className={`exercise-item${e.id === current ? ' active' : ''}${solved[e.id] ? ' done' : ''}`}
                onClick={() => {
                  setCurrent(e.id)
                  setResult(null)
                }}
              >
                <span className="exercise-item-title">{e.title}</span>
                {solved[e.id] ? <Tag color="success" bordered={false}>已通过</Tag> : null}
              </button>
            ))}
          </div>
        </div>
      ))}

      {exercise ? (
        <div className="exercise-detail">
          <div className="exercise-detail-head">
            <strong>{exercise.title}</strong>
            <Tag bordered={false}>{exercise.difficulty}</Tag>
            {exercise.orderMatters ? <Tooltip title="这题要求结果顺序也与参考答案一致"><Tag bordered={false} color="blue">要求排序</Tag></Tooltip> : null}
          </div>
          <p className="exercise-desc">{exercise.description}</p>
          <div className="exercise-tags">
            {exercise.tags.map((t) => (
              <Tag key={t} bordered={false}>{t}</Tag>
            ))}
          </div>
          <details className="exercise-hint">
            <summary>卡住了？看提示</summary>
            <div>{exercise.hint}</div>
          </details>

          <Space style={{ marginTop: 10 }}>
            <Button size="small" onClick={loadIntoEditor}>把题目写进编辑器</Button>
            <Button size="small" type="primary" loading={grading} onClick={submit}>提交判分</Button>
          </Space>

          {result ? (
            <Alert
              style={{ marginTop: 12 }}
              type={result.passed ? 'success' : result.status === 'ERROR' ? 'error' : 'warning'}
              showIcon
              message={result.passed ? '通过！' : result.message}
              description={
                result.passed ? null : (
                  <div>
                    <div className="dim">
                      你返回 {result.actualRowCount} 行 · 参考答案 {result.expectedRowCount} 行
                    </div>
                    <ul className="hint-list">
                      {result.hints.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
