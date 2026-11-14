export async function copyText(text: string): Promise<boolean> {
  if (!text) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 把结果集拼成可直接粘进 Excel / 飞书表格的 Tab 分隔文本 */
export function resultToTsv(columns: string[], rows: unknown[][]): string {
  const line = [columns.join('\t')]
  for (const row of rows) {
    line.push(row.map((c) => (c === null || c === undefined ? '' : String(c))).join('\t'))
  }
  return line.join('\n')
}
