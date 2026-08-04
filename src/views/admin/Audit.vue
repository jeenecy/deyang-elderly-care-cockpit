<template>
  <div class="a-card">
    <div class="a-card-title">操作日志与审计<span class="sub">全程留痕 · 可按动作检索</span>
      <div class="spacer"></div>
      <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
      <button class="a-btn" @click="refresh"><IconSvg name="refresh" /> 刷新</button>
    </div>
    <div class="toolbar row wrap">
      <input class="a-input" v-model="kw" placeholder="搜索对象 / 操作人" style="width:220px" @keyup.enter="page = 1" />
      <select class="a-select" v-model="action" @change="page = 1">
        <option value="">全部动作</option>
        <option v-for="a in actions" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <div class="batch-bar" v-if="selected.size > 0">
      <span class="batch-info">已选 <b>{{ selected.size }}</b> 条</span>
      <div class="spacer"></div>
      <button class="a-btn sm" @click="exportSelected">导出所选</button>
      <button class="a-btn sm ghost" @click="clear">取消选择</button>
    </div>

    <div class="table-wrap">
      <table class="a-table">
        <thead><tr>
          <th style="width:40px"><input type="checkbox" :checked="allSelected(paged)" @change="toggleAll(paged)" /></th>
          <th>时间</th><th>动作</th><th>对象</th><th>操作人</th>
        </tr></thead>
        <tbody>
          <tr v-for="l in paged" :key="l.id" class="clickable" @click="openDetailRow(l)">
            <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(l)" @change="toggle(l)" /></td>
            <td class="muted">{{ l.time }}</td>
            <td><span class="a-tag blue">{{ l.action }}</span></td>
            <td>{{ l.target }}</td>
            <td>{{ l.user }}</td>
          </tr>
          <tr v-if="paged.length === 0"><td colspan="5" class="empty">暂无日志记录</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pager row">
      <span class="muted">共 {{ filtered.length }} 条</span>
      <div class="spacer"></div>
      <button class="a-btn sm" :disabled="page <= 1" @click="page--">上一页</button>
      <span class="muted">第 {{ page }} / {{ pages }} 页</span>
      <button class="a-btn sm" :disabled="page >= pages" @click="page++">下一页</button>
    </div>

    <DetailDrawer :show="showDetail" :title="detailTitle" :category="detailCategory" :color="detailColor"
      :fields="detailFields" :desc="detailDesc" @update:show="showDetail = $event" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import DetailDrawer from './DetailDrawer.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, detailDesc, openDetail, closeDetail } = useDetail()

const kw = ref('')
const action = ref('')
const page = ref(1)
const pageSize = 9
const actions = ['新增', '更新', '删除', '告警处置', '用户状态', '设备状态', '数据源', '刷新监控', '用户登录', '同步数据源']

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return store.logs.filter((l) => {
    const m = !k || l.target.toLowerCase().includes(k) || l.user.toLowerCase().includes(k)
    const ma = !action.value || l.action.includes(action.value)
    return m && ma
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (Math.min(page.value, pages.value) - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

const actionColor = { '删除': '#ff4d4d', '告警处置': '#ffaa00', '新增': '#00ffcc', '更新': '#00f0ff' }
function openDetailRow(l) {
  openDetail({
    title: l.action + ' · ' + l.target,
    category: '操作审计', color: actionColor[l.action] || '#00f0ff',
    desc: `由「${l.user}」于 ${l.time} 执行「${l.action}」操作，对象为 ${l.target}。`,
    fields: [
      { label: '操作时间', value: l.time },
      { label: '操作动作', value: l.action, hot: l.action === '删除' },
      { label: '操作对象', value: l.target },
      { label: '操作人', value: l.user }
    ]
  })
}

function exportCurrent() {
  if (!filtered.value.length) { toast.warn('当前没有可导出的数据'); return }
  doExport(filtered.value, '操作日志')
}
function exportSelected() {
  const rows = selectedRows(store.logs)
  if (!rows.length) { toast.warn('请先勾选要导出的日志'); return }
  doExport(rows, '操作日志_所选')
}
function doExport(rows, name) {
  exportCsv(name, [
    { key: 'time', label: '时间' }, { key: 'action', label: '动作' },
    { key: 'target', label: '对象' }, { key: 'user', label: '操作人' }
  ], rows)
  toast.success(`已导出 ${rows.length} 条日志`)
}
function refresh() { page.value = 1; toast.info('日志已刷新') }
</script>

<style scoped>
.toolbar { gap: 10px; margin-bottom: 16px; }
.table-wrap { min-height: 320px; }
.empty { text-align: center; color: var(--c-muted); padding: 30px 0; }
.pager { margin-top: 16px; }
.a-btn svg { width: 15px; height: 15px; }
.clickable { cursor: pointer; }
.clickable:hover { background: rgba(0, 240, 255, .05); }
.cb { width: 40px; text-align: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--c-primary); cursor: pointer; }
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px;
  background: rgba(0, 102, 255, .1); border: 1px solid var(--c-line2); border-radius: 10px; }
.batch-info { font-size: 13px; color: var(--c-text); }
.batch-info b { color: var(--c-primary); }
.spacer { flex: 1; }
.a-btn.sm { padding: 6px 12px; font-size: 12px; }
.a-btn.sm.ghost { color: var(--c-muted); }
.a-btn.sm.ghost:hover { color: #fff; }
</style>
