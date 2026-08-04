<template>
  <div class="wrap-col">
    <div class="stat-row">
      <div class="a-card stat-card"><div class="a-stat"><div class="num">{{ stats.total }}</div><div class="lbl">数据源总数</div></div></div>
      <div class="a-card stat-card"><div class="a-stat"><div class="num" style="color:#00ffcc">{{ stats.ok }}</div><div class="lbl">正常</div></div></div>
      <div class="a-card stat-card"><div class="a-stat"><div class="num" style="color:#ffaa00">{{ stats.warn }}</div><div class="lbl">警告</div></div></div>
    </div>

    <div class="a-card">
      <div class="a-card-title">数据接入与治理<span class="sub">多源接入 / 同步监控</span>
        <div class="spacer"></div>
        <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
        <button class="a-btn primary" @click="openAdd"><IconSvg name="plus" /> 新增数据源</button>
      </div>

      <div class="batch-bar" v-if="selected.size > 0">
        <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
        <div class="spacer"></div>
        <button class="a-btn sm" @click="batchSync">批量同步</button>
        <button class="a-btn sm danger" @click="batchRemove">批量删除</button>
        <button class="a-btn sm ghost" @click="clear">取消选择</button>
      </div>

      <div class="table-wrap">
        <table class="a-table">
          <thead><tr>
            <th style="width:40px"><input type="checkbox" :checked="allSelected(store.sources)" @change="toggleAll(store.sources)" /></th>
            <th>数据源名称</th><th>类型</th><th>状态</th><th>同步周期</th><th>最后同步</th><th style="width:230px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="s in store.sources" :key="s.id" class="clickable" @click="openDetailRow(s)">
              <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(s)" @change="toggle(s)" /></td>
              <td>{{ s.name }}</td><td>{{ s.type }}</td>
              <td><span class="a-tag" :class="s.status === '正常' ? 'green' : 'orange'">{{ s.status }}</span></td>
              <td>{{ s.interval }}</td><td class="muted">{{ s.lastSync }}</td>
              <td class="ops" @click.stop>
                <button class="op" @click="sync(s)">立即同步</button>
                <button class="op" @click="toggleStatus(s)">{{ s.status === '正常' ? '标记异常' : '恢复正常' }}</button>
                <button class="op danger" @click="remove(s)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Modal :show="showForm" title="新增数据源" width="500px" @update:show="showForm = $event">
        <div class="form">
          <label>数据源名称</label>
          <input class="a-input" v-model="form.name" style="width:100%" placeholder="如：XX业务系统" :class="{ invalid: errors.name }" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
          <label>类型</label>
          <select class="a-select" v-model="form.type" style="width:100%">
            <option v-for="x in SOURCE_TYPES" :key="x" :value="x">{{ x }}</option>
          </select>
          <label>同步周期</label>
          <select class="a-select" v-model="form.interval" style="width:100%">
            <option v-for="x in SYNC_INTERVAL" :key="x" :value="x">{{ x }}</option>
          </select>
        </div>
        <template #footer>
          <button class="a-btn" @click="showForm = false">取消</button>
          <button class="a-btn primary" @click="save">保存</button>
        </template>
      </Modal>

      <DetailDrawer :show="showDetail" :title="detailTitle" :category="detailCategory" :color="detailColor"
        :fields="detailFields" @update:show="showDetail = $event" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import DetailDrawer from './DetailDrawer.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { SOURCE_TYPES, SYNC_INTERVAL } from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const stats = computed(() => ({
  total: store.sources.length,
  ok: store.sources.filter((s) => s.status === '正常').length,
  warn: store.sources.filter((s) => s.status === '警告').length
}))

const typeColor = { '省级接口': '#00f0ff', '市级接口': '#00ffcc', '本地数据库': '#0066ff', '设备接入': '#ffaa00', '呼叫中心': '#ff7ad9' }
function openDetailRow(s) {
  openDetail({
    title: s.name, category: '数据接入', color: typeColor[s.type] || '#00f0ff',
    fields: [
      { label: '数据源名称', value: s.name },
      { label: '接入类型', value: s.type },
      { label: '运行状态', value: s.status, hot: s.status === '正常' },
      { label: '同步周期', value: s.interval },
      { label: '最后同步', value: s.lastSync }
    ]
  })
}

function sync(s) { store.syncSource(s.id); toast.success('已触发同步：' + s.name) }
function toggleStatus(s) {
  const t = s.status === '正常' ? '警告' : '正常'
  store.setSourceStatus(s.id, t)
  toast.success(`${s.name} → ${t}`)
}
function remove(s) {
  if (!confirm('确认删除数据源「' + s.name + '」？')) return
  store.removeSource(s.id)
  toast.success('已删除')
}

function batchSync() {
  const rows = selectedRows(store.sources)
  rows.forEach((s) => store.syncSource(s.id))
  toast.success(`已批量同步 ${rows.length} 个数据源`)
  clear()
}
function batchRemove() {
  const rows = selectedRows(store.sources)
  if (!confirm(`确认批量删除选中的 ${rows.length} 个数据源？`)) { clear(); return }
  rows.forEach((s) => store.removeSource(s.id))
  toast.success(`已删除 ${rows.length} 个数据源`)
  clear()
}
function exportCurrent() {
  if (!store.sources.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv('数据接入列表', [
    { key: 'name', label: '名称' }, { key: 'type', label: '类型' }, { key: 'status', label: '状态' },
    { key: 'interval', label: '同步周期' }, { key: 'lastSync', label: '最后同步' }
  ], store.sources)
  toast.success(`已导出 ${store.sources.length} 个数据源`)
}

const showForm = ref(false)
const form = ref({ name: '', type: '省级接口', interval: '每30分钟' })
const errors = ref({})
function openAdd() { form.value = { name: '', type: '省级接口', interval: '每30分钟' }; errors.value = {}; showForm.value = true }
function save() {
  const e = {}
  if (!form.value.name || !form.value.name.trim()) e.name = '请填写数据源名称'
  errors.value = e
  if (Object.keys(e).length) { toast.warn('请修正表单中的错误'); return }
  store.addSource({ name: form.value.name, type: form.value.type, interval: form.value.interval, status: '正常', lastSync: '—' })
  toast.success('数据源已添加')
  showForm.value = false
}
</script>

<style scoped>
.wrap-col { display: flex; flex-direction: column; gap: 18px; }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.stat-card { display: flex; align-items: center; }
.table-wrap { min-height: 200px; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0, 240, 255, .12); }
.op.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.op.danger:hover { background: rgba(255, 77, 77, .12); }
.form { display: flex; flex-direction: column; gap: 6px; }
.form label { font-size: 13px; color: var(--c-muted); margin-top: 10px; }
.form label:first-child { margin-top: 0; }
.a-btn svg { width: 15px; height: 15px; }
.clickable { cursor: pointer; }
.clickable:hover { background: rgba(0, 240, 255, .05); }
.cb { width: 40px; text-align: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--c-primary); cursor: pointer; }
.err { color: #ff6b6b; font-size: 12px; margin-top: 4px; }
.a-input.invalid { border-color: rgba(255, 77, 77, .6); }
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px;
  background: rgba(0, 102, 255, .1); border: 1px solid var(--c-line2); border-radius: 10px; }
.batch-info { font-size: 13px; color: var(--c-text); }
.batch-info b { color: var(--c-primary); }
.spacer { flex: 1; }
.a-btn.sm { padding: 6px 12px; font-size: 12px; }
.a-btn.sm.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.a-btn.sm.danger:hover { background: rgba(255, 77, 77, .12); }
.a-btn.sm.ghost { color: var(--c-muted); }
.a-btn.sm.ghost:hover { color: #fff; }
</style>
