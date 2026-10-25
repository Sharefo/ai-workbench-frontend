export type ApiResp<T> = {
  ok: boolean
  data: T | null
  error?: { code: string; message: string }
}

export type Cell = string | number | boolean | null

export interface ColumnMeta {
  name: string
  label: string
  type: string
}

export interface StmtResult {
  index: number
  sql: string
  kind: string
  columns: ColumnMeta[]
  rows: Cell[][]
  rowCount: number
  affectedRows: number | null
  elapsedMs: number
  truncated: boolean
  note?: string
}

export interface ExecuteResp {
  elapsedMs: number
  truncated: boolean
  needConfirm: boolean
  confirmMessage?: string
  message?: string
  statements: StmtResult[]
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  comment: string
}

export interface TableMeta {
  name: string
  comment: string
  rowCount: number
  columns: ColumnInfo[]
}

export interface SchemaResp {
  dialect: string
  sessionId: string
  tables: TableMeta[]
}

export interface SessionInfo {
  id: string
  name: string
  scale: string
  createdAt: string
  lastActiveAt: string
  ready: boolean
  tableCount: number
}

export interface Exercise {
  id: string
  level: number
  title: string
  description: string
  hint: string
  referenceSql: string
  orderMatters: boolean
  tags: string[]
  difficulty: string
}

export interface GradeResp {
  passed: boolean
  status: string
  message: string
  expectedRowCount: number
  actualRowCount: number
  hints: string[]
}

export interface SeedColumn {
  name: string
  type: string
  comment?: string
  primaryKey?: boolean
  rule?: Record<string, unknown>
}

export interface SeedPlan {
  table: string
  comment?: string
  rowCount: number
  dropIfExists?: boolean
  columns: SeedColumn[]
}

export interface LabConfig {
  llmEnabled: boolean
  model: string
  maxRows: number
  hardMaxRows: number
  adminEnabled: boolean
  scale: string
}

export interface LogLine {
  id: number
  at: string
  level: 'info' | 'error' | 'success'
  text: string
}
