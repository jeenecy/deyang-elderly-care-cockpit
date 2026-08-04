// 通用 CSV 导出：自动加 BOM 以保证 Excel 正确识别中文
export function exportCsv(filename, columns, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const lines = [header]
  rows.forEach((r) => {
    lines.push(columns.map((c) => escape(r[c.key])).join(','))
  })
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
