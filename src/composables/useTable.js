import { ref } from 'vue'

// 行多选：基于 Set 的响应式选择，支持单选切换、全选、按当前页判定
export function useRowSelection(rowKey = 'id') {
  const selected = ref(new Set())
  const keyOf = (r) => r[rowKey]
  const isSelected = (r) => selected.value.has(keyOf(r))
  function toggle(r) {
    const s = new Set(selected.value)
    const k = keyOf(r)
    if (s.has(k)) s.delete(k)
    else s.add(k)
    selected.value = s
  }
  function toggleAll(rows) {
    const all = rows.length > 0 && rows.every((r) => selected.value.has(keyOf(r)))
    selected.value = all ? new Set() : new Set(rows.map(keyOf))
  }
  const allSelected = (rows) => rows.length > 0 && rows.every((r) => selected.value.has(keyOf(r)))
  const selectedRows = (rows) => rows.filter((r) => selected.value.has(keyOf(r)))
  function clear() {
    selected.value = new Set()
  }
  return { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear }
}

// 详情抽屉状态：openDetail 接收 { title, category, color, desc, fields }
export function useDetail() {
  const showDetail = ref(false)
  const detailFields = ref([])
  const detailTitle = ref('')
  const detailCategory = ref('')
  const detailColor = ref('')
  const detailDesc = ref('')
  function openDetail({ title, category, color, desc, fields }) {
    detailTitle.value = title || ''
    detailCategory.value = category || ''
    detailColor.value = color || ''
    detailDesc.value = desc || ''
    detailFields.value = fields || []
    showDetail.value = true
  }
  function closeDetail() {
    showDetail.value = false
  }
  return { showDetail, detailFields, detailTitle, detailCategory, detailColor, detailDesc, openDetail, closeDetail }
}
