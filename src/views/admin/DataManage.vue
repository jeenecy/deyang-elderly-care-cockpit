<template>
  <div class="a-card">
    <div class="a-card-title">业务数据管理<span class="sub">四大模块台账 · 查询 / 新增 / 编辑 / 删除</span></div>

    <div class="toolbar wrap">
      <div class="tabs">
        <button v-for="t in tabs" :key="t.key" class="tab" :class="{ on: active === t.key }"
          @click="active = t.key; page = 1">{{ t.label }}</button>
      </div>
      <div class="spacer"></div>
      <input class="a-input" v-model="kw" placeholder="搜索名称 / 编号" style="width:190px" @keyup.enter="applyFilter" />
      <select class="a-select" v-model="status" @change="applyFilter">
        <option value="">全部状态</option>
        <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
      </select>
      <button class="a-btn" @click="applyFilter"><IconSvg name="search" /> 查询</button>
      <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
      <button class="a-btn primary" @click="openAdd"><IconSvg name="plus" /> 新增</button>
    </div>

    <!-- 批量操作条 -->
    <div class="batch-bar" v-if="selected.size > 0">
      <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
      <div class="spacer"></div>
      <select class="a-select sm" v-model="batchStatus" style="width:140px">
        <option value="">批量改状态…</option>
        <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
      </select>
      <button class="a-btn sm" @click="applyBatchStatus">应用</button>
      <button class="a-btn sm danger" @click="batchRemove"><IconSvg name="trash" /> 批量删除</button>
      <button class="a-btn sm ghost" @click="clear">取消选择</button>
    </div>

    <div class="table-wrap">
      <table class="a-table">
        <thead>
          <tr>
            <th style="width:40px"><input type="checkbox" :checked="allSelected(paged)" @change="toggleAll(paged)" /></th>
            <th v-for="c in columns" :key="c.key">{{ c.label }}</th>
            <th style="width:120px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in paged" :key="row.id" class="clickable" @click="openDetailRow(row)">
            <td class="cb" @click.stop>
              <input type="checkbox" :checked="isSelected(row)" @change="toggle(row)" />
            </td>
            <td v-for="c in columns" :key="c.key">
              <span v-if="c.key === 'status'"><span class="a-tag" :class="tagClass(row.status)">{{ row.status }}</span></span>
              <span v-else>{{ row[c.key] }}</span>
            </td>
            <td class="ops" @click.stop>
              <button class="op" @click="openEdit(row)">编辑</button>
              <button class="op danger" @click="remove(row)">删除</button>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td :colspan="columns.length + 2" class="empty">暂无数据，点击右上角「新增」创建一条记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager row">
      <span class="muted">共 {{ filtered.length }} 条 · 本页 {{ paged.length }} 条</span>
      <div class="spacer"></div>
      <button class="a-btn sm" :disabled="page <= 1" @click="page--">上一页</button>
      <span class="muted">第 {{ page }} / {{ pages }} 页</span>
      <button class="a-btn sm" :disabled="page >= pages" @click="page++">下一页</button>
    </div>

    <!-- 新增 / 编辑 弹窗 -->
    <Modal :show="showForm" :title="formTitle" width="540px" @update:show="showForm = $event">
      <div class="form">
        <template v-if="active === 'gov'">
          <label>机构名称</label>
          <input class="a-input" v-model="form.name" style="width:100%" placeholder="请输入机构名称" :class="{ invalid: errors.name }" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
          <label>所属区县</label>
          <input class="a-input" v-model="form.district" style="width:100%" placeholder="如：旌阳区" />
          <label>机构类型</label>
          <select class="a-select" v-model="form.type" style="width:100%">
            <option v-for="x in INSTITUTION_TYPES" :key="x" :value="x">{{ x }}</option>
          </select>
          <label>床位数</label>
          <input class="a-input" v-model="form.beds" style="width:100%" placeholder="如：320" :class="{ invalid: errors.beds }" />
          <div class="err" v-if="errors.beds">{{ errors.beds }}</div>
          <label>状态</label>
          <select class="a-select" v-model="form.status" style="width:100%">
            <option v-for="x in OPERATION_STATUS" :key="x" :value="x">{{ x }}</option>
          </select>
        </template>

        <template v-else-if="active === 'institution'">
          <label>机构名称</label>
          <input class="a-input" v-model="form.name" style="width:100%" :class="{ invalid: errors.name }" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
          <label>在院老人（人）</label>
          <input class="a-input" v-model="form.elders" style="width:100%" placeholder="如：298" :class="{ invalid: errors.elders }" />
          <div class="err" v-if="errors.elders">{{ errors.elders }}</div>
          <label>入住率</label>
          <input class="a-input" v-model="form.occupancy" style="width:100%" placeholder="如：93%" :class="{ invalid: errors.occupancy }" />
          <div class="err" v-if="errors.occupancy">{{ errors.occupancy }}</div>
          <label>能力评估</label>
          <select class="a-select" v-model="form.assess" style="width:100%">
            <option v-for="x in CARE_LEVEL" :key="x" :value="x">{{ x }}</option>
          </select>
          <label>状态</label>
          <select class="a-select" v-model="form.status" style="width:100%">
            <option v-for="x in OPERATION_STATUS" :key="x" :value="x">{{ x }}</option>
          </select>
        </template>

        <template v-else-if="active === 'community'">
          <label>设施名称</label>
          <input class="a-input" v-model="form.name" style="width:100%" :class="{ invalid: errors.name }" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
          <label>所属社区</label>
          <input class="a-input" v-model="form.community" style="width:100%" placeholder="如：旌阳区沱江" />
          <label>类型</label>
            <select class="a-select" v-model="form.type" style="width:100%">
              <option v-for="x in FACILITY_TYPES" :key="x" :value="x">{{ x }}</option>
            </select>
          <label>月服务人次</label>
          <input class="a-input" v-model="form.monthly" style="width:100%" placeholder="如：3200" :class="{ invalid: errors.monthly }" />
          <div class="err" v-if="errors.monthly">{{ errors.monthly }}</div>
          <label>状态</label>
            <select class="a-select" v-model="form.status" style="width:100%">
              <option v-for="x in FACILITY_STATUS" :key="x" :value="x">{{ x }}</option>
            </select>
        </template>

        <template v-else>
          <label>服务对象</label>
          <input class="a-input" v-model="form.elder" style="width:100%" placeholder="如：张某某（独居）" :class="{ invalid: errors.elder }" />
          <div class="err" v-if="errors.elder">{{ errors.elder }}</div>
          <label>所属区县</label>
          <input class="a-input" v-model="form.district" style="width:100%" placeholder="如：中江县仓山镇" />
          <label>服务类型</label>
            <select class="a-select" v-model="form.service" style="width:100%">
              <option v-for="x in SERVICE_TYPES" :key="x" :value="x">{{ x }}</option>
            </select>
          <label>响应时长</label>
          <input class="a-input" v-model="form.response" style="width:100%" placeholder="如：7.2 分钟" />
          <label>状态</label>
            <select class="a-select" v-model="form.status" style="width:100%">
              <option v-for="x in ORDER_STATUS" :key="x" :value="x">{{ x }}</option>
            </select>
        </template>
      </div>
      <template #footer>
        <button class="a-btn" @click="showForm = false">取消</button>
        <button class="a-btn primary" @click="save">保存</button>
      </template>
    </Modal>

    <!-- 详情抽屉 -->
    <DetailDrawer :show="showDetail" :title="detailTitle" :category="detailCategory" :color="detailColor"
      :fields="detailFields" @update:show="showDetail = $event" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import DetailDrawer from './DetailDrawer.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'
import {
  OPERATION_STATUS, FACILITY_STATUS, ORDER_STATUS,
  INSTITUTION_TYPES, CARE_LEVEL, FACILITY_TYPES, SERVICE_TYPES
} from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const tabs = [
  { key: 'gov', label: '政府监管' },
  { key: 'institution', label: '机构养老' },
  { key: 'community', label: '社区养老' },
  { key: 'home', label: '居家养老' }
]
const active = ref('gov')
const kw = ref('')
const status = ref('')
const pageSize = 7
const page = ref(1)

const colDefs = {
  gov: [
    { key: 'code', label: '机构编号' }, { key: 'name', label: '机构名称' },
    { key: 'district', label: '所属区县' }, { key: 'type', label: '机构类型' },
    { key: 'beds', label: '床位数' }, { key: 'status', label: '状态' }
  ],
  institution: [
    { key: 'code', label: '机构编号' }, { key: 'name', label: '机构名称' },
    { key: 'elders', label: '在院老人' }, { key: 'occupancy', label: '入住率' },
    { key: 'assess', label: '能力评估' }, { key: 'status', label: '状态' }
  ],
  community: [
    { key: 'code', label: '设施编号' }, { key: 'name', label: '设施名称' },
    { key: 'community', label: '所属社区' }, { key: 'type', label: '类型' },
    { key: 'monthly', label: '月服务人次' }, { key: 'status', label: '状态' }
  ],
  home: [
    { key: 'code', label: '工单编号' }, { key: 'elder', label: '服务对象' },
    { key: 'district', label: '所属区县' }, { key: 'service', label: '服务类型' },
    { key: 'response', label: '响应时长' }, { key: 'status', label: '状态' }
  ]
}
const columns = computed(() => colDefs[active.value])
const statusOptions = computed(() => {
  if (active.value === 'home') return ORDER_STATUS
  if (active.value === 'community') return FACILITY_STATUS
  return OPERATION_STATUS
})

const listOf = computed(() => {
  if (active.value === 'community') return store.facilities
  if (active.value === 'home') return store.orders
  return store.institutions
})

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return listOf.value.filter((r) => {
    const matchK = !k ||
      (r.name && r.name.toLowerCase().includes(k)) ||
      (r.code && r.code.toLowerCase().includes(k)) ||
      (r.elder && r.elder.toLowerCase().includes(k))
    const matchS = !status.value || r.status === status.value
    return matchK && matchS
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (Math.min(page.value, pages.value) - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

// 切换 tab 时清空选择 / 错误 / 翻页
watch(active, () => { clear(); errors.value = {}; page.value = 1 })

function applyFilter() {
  page.value = 1
  toast.info(`已筛选：${filtered.value.length} 条结果`)
}
function tagClass(v) {
  if (['运营中', '已完成'].includes(v)) return 'green'
  if (['整改中', '进行中'].includes(v)) return 'orange'
  if (v === '筹建中') return 'blue'
  return 'gray'
}

// ===== 详情抽屉 =====
const catMap = { gov: '政府监管机构', institution: '养老机构', community: '社区养老设施', home: '居家养老服务' }
function toFields(row) {
  const a = active.value
  if (a === 'gov') return [
    { label: '机构编号', value: row.code }, { label: '机构名称', value: row.name },
    { label: '所属区县', value: row.district }, { label: '机构类型', value: row.type },
    { label: '床位数', value: row.beds, hot: true }, { label: '状态', value: row.status }
  ]
  if (a === 'institution') return [
    { label: '机构编号', value: row.code }, { label: '机构名称', value: row.name },
    { label: '在院老人', value: row.elders, hot: true },
    { label: '入住率', value: row.occupancy, hot: row.occupancy && parseInt(row.occupancy) > 90 },
    { label: '能力评估', value: row.assess }, { label: '状态', value: row.status }
  ]
  if (a === 'community') return [
    { label: '设施编号', value: row.code }, { label: '设施名称', value: row.name },
    { label: '所属社区', value: row.community }, { label: '类型', value: row.type },
    { label: '月服务人次', value: row.monthly, hot: true }, { label: '状态', value: row.status }
  ]
  return [
    { label: '工单编号', value: row.code }, { label: '服务对象', value: row.elder },
    { label: '所属区县', value: row.district }, { label: '服务类型', value: row.service },
    { label: '响应时长', value: row.response, hot: true }, { label: '状态', value: row.status }
  ]
}
function openDetailRow(row) {
  openDetail({ title: row.name || row.elder || row.code, category: catMap[active.value], color: '#00f0ff', fields: toFields(row) })
}

// ===== 批量操作 =====
const batchStatus = ref('')
function batchRemove() {
  const rows = selectedRows(listOf.value)
  if (!rows.length) return
  if (!confirm(`确认删除选中的 ${rows.length} 条记录？此操作不可撤销。`)) return
  rows.forEach((r) => {
    if (active.value === 'community') store.removeFacility(r.id)
    else if (active.value === 'home') store.removeOrder(r.id)
    else store.removeInstitution(r.id)
  })
  toast.success(`已删除 ${rows.length} 条记录`)
  clear(); batchStatus.value = ''
}
function applyBatchStatus() {
  if (!batchStatus.value) { toast.warn('请选择目标状态'); return }
  const rows = selectedRows(listOf.value)
  rows.forEach((r) => {
    if (active.value === 'gov' || active.value === 'institution') store.updateInstitution(r.id, { status: batchStatus.value })
    else if (active.value === 'community') store.updateFacility(r.id, { status: batchStatus.value })
    else store.updateOrder(r.id, { status: batchStatus.value })
  })
  toast.success(`已更新 ${rows.length} 条状态为「${batchStatus.value}」`)
  clear(); batchStatus.value = ''
}

// ===== 导出 =====
function exportCurrent() {
  if (!filtered.value.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv(`业务数据_${tabs.find(t => t.key === active.value).label}`, columns.value, filtered.value)
  toast.success(`已导出 ${filtered.value.length} 条记录`)
}

// ===== 表单（含行内校验）=====
const showForm = ref(false)
const editingId = ref(null)
const form = ref({})
const errors = ref({})
const formTitle = computed(() => (editingId.value ? '编辑 · ' : '新增 · ') + tabs.find((t) => t.key === active.value).label)

function blankForm() {
  if (active.value === 'gov') return { name: '', district: '旌阳区', type: '公办养老', beds: '', status: '运营中' }
  if (active.value === 'institution') return { name: '', elders: '', occupancy: '', assess: '混合', status: '运营中' }
  if (active.value === 'community') return { name: '', community: '', type: '长者食堂', monthly: '', status: '运营中' }
  return { elder: '', district: '旌阳区', service: '助餐', response: '', status: '已完成' }
}
function openAdd() {
  form.value = blankForm()
  errors.value = {}
  editingId.value = null
  showForm.value = true
}
function openEdit(row) {
  const f = {}
  if (active.value === 'gov') {
    f.name = row.name; f.district = row.district; f.type = row.type; f.beds = row.beds; f.status = row.status
  } else if (active.value === 'institution') {
    f.name = row.name; f.elders = row.elders; f.occupancy = row.occupancy; f.assess = row.assess; f.status = row.status
  } else if (active.value === 'community') {
    f.name = row.name; f.community = row.community; f.type = row.type; f.monthly = row.monthly; f.status = row.status
  } else {
    f.elder = row.elder; f.district = row.district; f.service = row.service; f.response = row.response; f.status = row.status
  }
  form.value = f
  errors.value = {}
  editingId.value = row.id
  showForm.value = true
}
function validate() {
  const e = {}
  const f = form.value
  const a = active.value
  if (a === 'gov' || a === 'institution' || a === 'community') { if (!f.name || !f.name.trim()) e.name = '请填写名称' }
  if (a === 'home') { if (!f.elder || !f.elder.trim()) e.elder = '请填写服务对象' }
  if (a === 'gov' && f.beds !== '' && f.beds != null && isNaN(Number(f.beds))) e.beds = '床位数需为数字'
  if (a === 'institution') {
    if (f.elders !== '' && f.elders != null && isNaN(Number(f.elders))) e.elders = '在院老人需为数字'
    if (f.occupancy && !/^\d+(\.\d+)?%$/.test(f.occupancy)) e.occupancy = '格式如 93%'
  }
  if (a === 'community' && f.monthly !== '' && f.monthly != null && isNaN(Number(f.monthly))) e.monthly = '月服务人次需为数字'
  errors.value = e
  return Object.keys(e).length === 0
}
function save() {
  if (!validate()) { toast.warn('请修正表单中的错误'); return }
  const f = form.value
  const a = active.value
  if (editingId.value) {
    if (a === 'gov') store.updateInstitution(editingId.value, { name: f.name, district: f.district, type: f.type, beds: f.beds, status: f.status })
    else if (a === 'institution') store.updateInstitution(editingId.value, { name: f.name, elders: f.elders, occupancy: f.occupancy, assess: f.assess, status: f.status })
    else if (a === 'community') store.updateFacility(editingId.value, { name: f.name, community: f.community, type: f.type, monthly: f.monthly, status: f.status })
    else store.updateOrder(editingId.value, { elder: f.elder, district: f.district, service: f.service, response: f.response, status: f.status })
    toast.success('已保存修改')
  } else {
    if (a === 'gov' || a === 'institution') store.addInstitution({ name: f.name, district: f.district, type: f.type, beds: f.beds, status: f.status, elders: f.elders || 0, occupancy: f.occupancy || '0%', assess: f.assess || '混合' })
    else if (a === 'community') store.addFacility({ name: f.name, community: f.community, type: f.type, monthly: f.monthly, status: f.status })
    else store.addOrder({ elder: f.elder, district: f.district, service: f.service, response: f.response, status: f.status })
    toast.success('新增成功')
  }
  showForm.value = false
}
function remove(row) {
  if (!confirm(`确认删除「${row.name || row.elder || row.code}」？此操作不可撤销。`)) return
  if (active.value === 'community') store.removeFacility(row.id)
  else if (active.value === 'home') store.removeOrder(row.id)
  else store.removeInstitution(row.id)
  toast.success('已删除')
}
</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--c-line); background: transparent;
  color: var(--c-muted); font-size: 14px; cursor: pointer; transition: all .2s; }
.tab:hover { color: var(--c-text); }
.tab.on { color: #fff; background: rgba(0, 102, 255, .2); border-color: var(--c-line2); }
.table-wrap { min-height: 300px; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0, 240, 255, .12); }
.op.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.op.danger:hover { background: rgba(255, 77, 77, .12); }
.empty { text-align: center; color: var(--c-muted); padding: 40px 0; }
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
.a-input.invalid, .a-select.invalid { border-color: rgba(255, 77, 77, .6); }
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
.a-select.sm { padding: 6px 10px; font-size: 12px; }
</style>
