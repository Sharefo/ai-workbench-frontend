import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { EditorState, Compartment, Prec } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentOnInput } from '@codemirror/language'
import { sql, MySQL } from '@codemirror/lang-sql'
import { tags as t } from '@lezer/highlight'
import type { SchemaResp } from '../types'

export interface SqlEditorHandle {
  getValue: () => string
  setValue: (text: string) => void
  insert: (text: string) => void
  focus: () => void
}

interface Props {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  schema: SchemaResp | null
}

const highlight = HighlightStyle.define([
  { tag: t.keyword, color: '#0958d9', fontWeight: '500' },
  { tag: t.string, color: '#0f6e56' },
  { tag: t.number, color: '#a8480d' },
  { tag: t.comment, color: '#8c8c8c', fontStyle: 'italic' },
  { tag: t.typeName, color: '#531dab' },
  { tag: t.operator, color: '#595959' },
  { tag: t.variableName, color: '#26215c' },
  { tag: t.function(t.variableName), color: '#531dab' },
])

const theme = EditorView.theme(
  {
    '&': { fontSize: '13px', backgroundColor: '#ffffff', height: '100%' },
    '.cm-content': { fontFamily: "'SF Mono', Menlo, Consolas, monospace", padding: '10px 0', caretColor: '#1677ff' },
    '.cm-scroller': { lineHeight: '1.7' },
    '.cm-gutters': { backgroundColor: '#fafafa', color: '#bfbfbf', border: 'none', borderRight: '1px solid #f0f0f0' },
    '.cm-activeLine': { backgroundColor: '#f5f9ff' },
    '.cm-activeLineGutter': { backgroundColor: '#eef4ff' },
    '&.cm-focused': { outline: 'none' },
    '.cm-tooltip': { border: '1px solid #e5e5e5', borderRadius: '6px', backgroundColor: '#ffffff' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#e6f0ff', color: '#0958d9' },
  },
  { dark: false },
)

export const SqlEditor = forwardRef<SqlEditorHandle, Props>(function SqlEditor(
  { value, onChange, onRun, schema },
  ref,
) {
  const host = useRef<HTMLDivElement | null>(null)
  const view = useRef<EditorView | null>(null)
  const languageConf = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  onChangeRef.current = onChange
  onRunRef.current = onRun

  const buildLanguage = useCallback((s: SchemaResp | null) => {
    const completionSchema: Record<string, string[]> = {}
    for (const table of s?.tables ?? []) {
      completionSchema[table.name] = table.columns.map((c) => c.name)
    }
    return sql({ dialect: MySQL, schema: completionSchema, upperCaseKeywords: true })
  }, [])

  useEffect(() => {
    if (!host.current) return
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        autocompletion({ activateOnTyping: true }),
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        Prec.highest(
          keymap.of([
            { key: 'Mod-Enter', preventDefault: true, run: () => (onRunRef.current(), true) },
            { key: 'Shift-Enter', preventDefault: true, run: () => (onRunRef.current(), true) },
          ]),
        ),
        keymap.of([...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
        languageConf.current.of(buildLanguage(schema)),
        theme,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString())
        }),
      ],
    })
    const instance = new EditorView({ state, parent: host.current })
    view.current = instance
    return () => {
      instance.destroy()
      view.current = null
    }
    // 只在挂载时创建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const instance = view.current
    if (!instance) return
    instance.dispatch({ effects: languageConf.current.reconfigure(buildLanguage(schema)) })
  }, [schema, buildLanguage])

  useEffect(() => {
    const instance = view.current
    if (!instance) return
    const current = instance.state.doc.toString()
    if (current !== value) {
      instance.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  useImperativeHandle(ref, () => ({
    getValue: () => view.current?.state.doc.toString() ?? '',
    setValue: (text: string) => {
      const instance = view.current
      if (!instance) return
      instance.dispatch({ changes: { from: 0, to: instance.state.doc.length, insert: text } })
    },
    insert: (text: string) => {
      const instance = view.current
      if (!instance) return
      const { from, to } = instance.state.selection.main
      instance.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      })
      instance.focus()
    },
    focus: () => view.current?.focus(),
  }))

  return <div className="sql-editor" ref={host} />
})
