<template>
  <div class="wrap-col">
    <div class="stat-row">
      <div class="a-card stat-card"><div class="a-stat"><div class="num">{{ stats.total }}</div><div class="lbl">设备总数</div></div></div>
      <div class="a-card stat-card"><div class="a-stat"><div class="num" style="color:#00ffcc">{{ stats.online }}</div><div class="lbl">在线</div></div></div>
      <div class="a-card stat-card"><div class="a-stat"><div class="num" style="color:#8aa6c8">{{ stats.offline }}</div><div class="lbl">离线</div></div></div>
      <div class="a-card stat-card"><div class="a-stat"><div class="num" style="color:#ff4d4d">{{ stats.fault }}</div><div class="lbl">故障</div></div></div>
    </div>

    <div class="a-card">
      <div class="a-card-title">物联设备列表<span class="sub">注册 / 监控 / 启停</span></div>
      <div class="toolbar row wrap">
        <input class="a-input" v-model="kw" placeholder="搜索名称 / 编号" style="width:200px" @keyup.enter="page = 1" />
        <select class="a-select" v-model="type" @change="page = 1">
          <option value="">全部类型</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
        <div class="spacer"></div>
        <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
        <button class="a-btn primary" @click="openAdd"><IconSvg name="plus" /> 新增设备</button>
      </div>

      <div class="batch-bar" v-if="selected.size > 0">
        <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
        <div class="spacer"></div>
        <button class="a-btn sm" @click="batchSet('在线')">批量启用</button>
        <button class="a-btn sm" @click="batchSet('离线')">批量停用</button>
        <button class="a-btn sm danger" @click="batchRemove">批量删除</button>
        <button class="a-btn sm ghost" @click="clear">取消选择</button>
      </div>

      <div class="table-wrap">
        <table class="a-table">
          <thead><tr>
            <th style="width:40px"><input type="checkbox" :checked="allSelected(paged)" @change="toggleAll(paged)" /></th>
            <th>设备编号</th><th>名称</th><th>类型</th><th>区域</th><th>状态</th><th>最后上报</th><th style="width:180px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="d in paged" :key="d.id" class="clickable" @click="openDetailRow(d)">
              <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(d)" @change="toggle(d)" /></td>
              <td>{{ d.code }}</td><td>{{ d.name }}</td><td>{{ d.type }}</td><td>{{ d.area }}</td>
              <td><span class="a-tag" :class="devClass(d.status)">{{ d.status }}</span></td>
              <td class="muted">{{ d.last }}</td>
              <td class="ops" @click.stop>
                <button class="op" @click="toggleDev(d)">{{ d.status === '在线' ? '停用' : (d.status === '故障' ? '修复' : '启用') }}</button>
                <button class="op danger" @click="remove(d)">删除</button>
              </td>
            </tr>
            <tr v-if="paged.length === 0"><td colspan="8" class="empty">暂无设备，点击「新增设备」创建</td></tr>
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

      <Modal :show="showForm" title="新增设备" width="500px" @update:show="showForm = $event">
        <div class="form">
          <label>设备名称</label>
          <input class="a-input" v-model="form.name" style="width:100%" placeholder="如：智能烟感-xx镇01" :class="{ invalid: errors.name }" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
          <label>类型</label>
          <select class="a-select" v-model="form.type" style="width:100%">
            <option v-for="x in DEVICE_TYPES" :key="x" :value="x">{{ x }}</option>
          </select>
          <label>区域</label>
          <input class="a-input" v-model="form.area" style="width:100%" placeholder="如：中江县仓山镇" />
          <label>初始状态</label>
          <select class="a-select" v-model="form.status" style="width:100%">
            <option v-for="x in DEVICE_STATUS" :key="x" :value="x">{{ x }}</option>
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
import { DEVICE_TYPES, DEVICE_STATUS } from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const kw = ref('')
const type = ref('')
const page = ref(1)
const pageSize = 7
const types = DEVICE_TYPES

const stats = computed(() => ({
  total: store.devices.length,
  online: store.devices.filter((d) => d.status === '在线').length,
  offline: store.devices.filter((d) => d.status === '离线').length,
  fault: store.devices.filter((d) => d.status === '故障').length
}))
const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return store.devices.filter((d) => {
    const m = !k || d.name.toLowerCase().includes(k) || d.code.toLowerCase().includes(k)
    const mt = !type.value || d.type === type.value
    return m && mt
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (Math.min(page.value, pages.value) - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})
function devClass(s) { return s === '在线' ? 'green' : s === '故障' ? 'red' : 'gray' }

const typeColor = { '烟感探测器': '#00f0ff', 'SOS呼叫': '#ff4d4d', '红外感应': '#ffaa00', '健康检测': '#00ffcc', '燃气报警': '#ff7ad9', '睡眠监测': '#4ad8ff' }
function openDetailRow(d) {
  openDetail({
    title: d.name, category: '物联设备', color: typeColor[d.type] || '#00f0ff',
    fields: [
      { label: '设备编号', value: d.code },
      { label: '设备名称', value: d.name },
      { label: '设备类型', value: d.type },
      { label: '所属区域', value: d.area },
      { label: '运行状态', value: d.status, hot: d.status === '在线' },
      { label: '最后上报', value: d.last }
    ]
  })
}

function toggleDev(d) {
  const target = d.status === '在线' ? '离线' : '在线'
  store.setDeviceStatus(d.id, target)
  toast.success(`${d.name} → ${target}`)
}
function remove(d) {
  if (!confirm(`确认删除设备「${d.name}」？`)) return
  store.removeDevice(d.id)
  toast.success('设备已删除')
}

function batchSet(status) {
  const rows = selectedRows(store.devices)
  rows.forEach((d) => store.setDeviceStatus(d.id, status))
  toast.success(`已批量${status === '在线' ? '启用' : '停用'} ${rows.length} 台设备`)
  clear()
}
function batchRemove() {
  const rows = selectedRows(store.devices)
  if (!confirm(`确认批量删除选中的 ${rows.length} 台设备？`)) { clear(); return }
  rows.forEach((d) => store.removeDevice(d.id))
  toast.success(`已删除 ${rows.length} 台设备`)
  clear()
}
function exportCurrent() {
  if (!filtered.value.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv('物联设备列表', [
    { key: 'code', label: '设备编号' }, { key: 'name', label: '名称' }, { key: 'type', label: '类型' },
    { key: 'area', label: '区域' }, { key: 'status', label: '状态' }, { key: 'last', label: '最后上报' }
  ], filtered.value)
  toast.success(`已导出 ${filtered.value.length} 台设备`)
}

const showForm = ref(false)
const form = ref({ name: '', type: '烟感探测器', area: '', status: '在线' })
const errors = ref({})
function openAdd() { form.value = { name: '', type: '烟感探测器', area: '', status: '在线' }; errors.value = {}; showForm.value = true }
function save() {
  const e = {}
  if (!form.value.name || !form.value.name.trim()) e.name = '请填写设备名称'
  errors.value = e
  if (Object.keys(e).length) { toast.warn('请修正表单中的错误'); return }
  store.addDevice({ name: form.value.name, type: form.value.type, area: form.value.area, status: form.value.status, last: '—' })
  toast.success('设备已添加')
  showForm.value = false
}
</script>

<style scoped>
.wrap-col { display: flex; flex-direction: column; gap: 18px; }
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.stat-card { display: flex; align-items: center; }
.toolbar { gap: 10px; margin-bottom: 16px; }
.table-wrap { min-height: 280px; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0, 240, 255, .12); }
.op.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.op.danger:hover { background: rgba(255, 77, 77, .12); }
.empty { text-align: center; color: var(--c-muted); padding: 30px 0; }
.pager { margin-top: 16px; }
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
