import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Empty, Space, Tag, Tooltip } from 'antd'
import type { Exercise, GradeResp } from '../types'
import { api } from '../api'
import { getSolved, markSolved } from '../session'

interface Props {
  sessionId: string
  getSql: () => string
  setSql: (sql: string) => void
}

const LEVEL_NAME: Record<number, string> = {
  1: '第一关 · 认识数据',
  2: '第二关 · 聚合统计',
  3: '第三关 · 多表关联',
  4: '第四关 · 进阶玩法',
}

export function ExercisePanel({ sessionId, getSql, setSql }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<string>('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResp | null>(null)
  const [solved, setSolved] = useState<Record<string, boolean>>(() => getSolved(sessionId))
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')

  const regenerate = async () => {
    setRegenerating(true)
    setRegenError('')
    try {
      const list = await api.regenerateExercises()
      setExercises(list)
      setCurrent(list[0]?.id ?? '')
      setResult(null)
      setSolved(getSolved(sessionId))
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : String(e))
    } finally {
      setRegenerating(false)
    }
  }

  const load = useCallback(() => {
    setLoading(true)
    setLoadError('')
    api
      .exercises()
      .then((list) => {
        setExercises(list)
        setCurrent((prev) => (prev && list.some((e) => e.id === prev) ? prev : (list[0]?.id ?? '')))
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    setSolved(getSolved(sessionId))
    setCurrent('')
    setResult(null)
  }, [load, sessionId])

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
      markSolved(exercise.id, r.passed, sessionId)
      setSolved(getSolved(sessionId))
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

  if (loading) {
    return (
      <div className="exercise-panel">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="题目加载中…" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="exercise-panel">
        <Alert type="error" showIcon title="题目加载失败" description={loadError} />
        <Button size="small" onClick={load}>
          重试
        </Button>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="exercise-panel">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="后端没有返回题目" />
      </div>
    )
  }

  return (
    <div className="exercise-panel">
      <div className="exercise-space-bar">
        <span className="dim">题目按当前空间的表结构由 AI 生成</span>
        <Button size="small" loading={regenerating} onClick={() => void regenerate()}>
          换一批题
        </Button>
      </div>
      {regenError ? <Alert type="error" showIcon title={regenError} /> : null}
      <div className="exercise-head">
        <span className="dim">闯关进度</span>
        <strong>
          {doneCount} / {exercises.length}
        </strong>
        <div className="exercise-bar">
          <div
            className="exercise-bar-fill"
            style={{ width: `${Math.round((doneCount / exercises.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="exercise-list-wrap">
        {grouped.map(([level, list]) => (
          <div key={level} className="exercise-group">
            <div className="exercise-group-title">{LEVEL_NAME[level] ?? `第 ${level} 关`}</div>
            <div className="exercise-list">
              {list.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`exercise-item${e.id === current ? ' active' : ''}${solved[e.id] ? ' done' : ''}`}
                  onClick={() => {
                    setCurrent(e.id)
                    setResult(null)
                  }}
                >
                  <span className="exercise-item-title">{e.title}</span>
                  {solved[e.id] ? (
                    <Tag color="success" variant="filled">
                      已通过
                    </Tag>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="exercise-detail">
        {exercise ? (
          <>
            <div className="exercise-detail-head">
              <strong>{exercise.title}</strong>
              <Tag variant="filled">{exercise.difficulty}</Tag>
              {exercise.orderMatters ? (
                <Tooltip title="这题要求结果顺序也与参考答案一致">
                  <Tag variant="filled" color="blue">
                    要求排序
                  </Tag>
                </Tooltip>
              ) : null}
            </div>
            <p className="exercise-desc">{exercise.description}</p>
            <div className="exercise-tags">
              {exercise.tags.map((t) => (
                <Tag key={t} variant="filled">
                  {t}
                </Tag>
              ))}
            </div>
            <details className="exercise-hint">
              <summary>卡住了？看提示</summary>
              <div>{exercise.hint}</div>
            </details>

            <Space style={{ marginTop: 10 }}>
              <Button size="small" onClick={loadIntoEditor}>
                把题目写进编辑器
              </Button>
              <Button size="small" type="primary" loading={grading} onClick={() => void submit()}>
                提交判分
              </Button>
            </Space>

            {result ? (
              <Alert
                style={{ marginTop: 12 }}
                type={result.passed ? 'success' : result.status === 'ERROR' ? 'error' : 'warning'}
                showIcon
                title={result.passed ? '通过！结果和参考答案一致' : result.message}
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
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选一道题开始" />
        )}
      </div>
    </div>
  )
}
