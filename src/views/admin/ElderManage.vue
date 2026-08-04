<template>
  <div class="a-card">
    <div class="a-card-title">老人档案管理<span class="sub">关怀对象主数据 · 档案 / 健康标签 / 紧急联系人</span></div>

    <div class="toolbar wrap">
      <input class="a-input" v-model="kw" placeholder="搜索姓名 / 档案号 / 电话" style="width:210px" @keyup.enter="applyFilter" />
      <select class="a-select sm" v-model="status" @change="applyFilter">
        <option value="">全部状态</option>
        <option v-for="s in ELDER_STATUS" :key="s" :value="s">{{ s }}</option>
      </select>
      <select class="a-select sm" v-model="district" @change="applyFilter">
        <option value="">全部区县</option>
        <option v-for="d in DISTRICTS" :key="d" :value="d">{{ d }}</option>
      </select>
      <button class="a-btn" @click="applyFilter"><IconSvg name="search" /> 查询</button>
      <div class="spacer"></div>
      <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
      <button class="a-btn primary" @click="openAdd"><IconSvg name="plus" /> 新增档案</button>
    </div>

    <!-- 批量操作条 -->
    <div class="batch-bar" v-if="selected.size > 0">
      <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
      <div class="spacer"></div>
      <select class="a-select sm" v-model="batchStatus" style="width:140px">
        <option value="">批量改状态…</option>
        <option v-for="s in ELDER_STATUS" :key="s" :value="s">{{ s }}</option>
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
              <span v-else-if="c.key === 'careLevel'"><span class="a-tag lvl">{{ row.careLevel }}</span></span>
              <span v-else>{{ row[c.key] }}</span>
            </td>
            <td class="ops" @click.stop>
              <button class="op" @click="openEdit(row)">编辑</button>
              <button class="op danger" @click="remove(row)">删除</button>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td :colspan="columns.length + 2" class="empty">暂无档案数据，点击右上角「新增档案」创建一条记录</td>
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
    <Modal :show="showForm" :title="formTitle" width="660px" @update:show="showForm = $event">
      <div class="form">
        <div class="form-grid">
          <div>
            <label>姓名 <i class="req">*</i></label>
            <input class="a-input" v-model="form.name" placeholder="请输入老人姓名" :class="{ invalid: errors.name }" />
            <div class="err" v-if="errors.name">{{ errors.name }}</div>
          </div>
          <div>
            <label>性别</label>
            <select class="a-select" v-model="form.gender">
              <option v-for="x in GENDER" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>

          <div>
            <label>年龄 <i class="req">*</i></label>
            <input class="a-input" v-model="form.age" placeholder="如：82" :class="{ invalid: errors.age }" />
            <div class="err" v-if="errors.age">{{ errors.age }}</div>
          </div>
          <div>
            <label>身份证号</label>
            <input class="a-input" v-model="form.idNo" placeholder="18 位身份证号" :class="{ invalid: errors.idNo }" />
            <div class="err" v-if="errors.idNo">{{ errors.idNo }}</div>
          </div>

          <div>
            <label>所属区县</label>
            <select class="a-select" v-model="form.district">
              <option v-for="d in DISTRICTS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label>街道 / 乡镇</label>
            <input class="a-input" v-model="form.town" placeholder="如：孝感街道" />
          </div>

          <div class="full">
            <label>详细住址</label>
            <input class="a-input" v-model="form.address" placeholder="如：孝感街道怡康小区3栋2单元501" />
          </div>

          <div>
            <label>联系电话</label>
            <input class="a-input" v-model="form.phone" placeholder="11 位手机号（可掩码）" :class="{ invalid: errors.phone }" />
            <div class="err" v-if="errors.phone">{{ errors.phone }}</div>
          </div>
          <div>
            <label>居住类型</label>
            <select class="a-select" v-model="form.livingType">
              <option v-for="x in LIVING_TYPES" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>

          <div>
            <label>照护等级</label>
            <select class="a-select" v-model="form.careLevel">
              <option v-for="x in ELDER_CARE_LEVEL" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>
          <div>
            <label>档案状态</label>
            <select class="a-select" v-model="form.status">
              <option v-for="x in ELDER_STATUS" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>

          <div class="full">
            <label>所属机构 / 服务商</label>
            <select class="a-select" v-model="form.belongOrg">
              <option value="">未指定</option>
              <option v-for="o in orgNames" :key="o" :value="o">{{ o }}</option>
            </select>
          </div>

          <div>
            <label>紧急联系人</label>
            <input class="a-input" v-model="form.emergencyName" placeholder="如：张伟" />
          </div>
          <div>
            <label>与本人关系</label>
            <select class="a-select" v-model="form.emergencyRelation">
              <option v-for="x in EMERGENCY_RELATIONS" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>

          <div class="full">
            <label>紧急联系人电话</label>
            <input class="a-input" v-model="form.emergencyPhone" placeholder="11 位手机号（可掩码）" :class="{ invalid: errors.emergencyPhone }" />
            <div class="err" v-if="errors.emergencyPhone">{{ errors.emergencyPhone }}</div>
          </div>

          <div class="full">
            <label>健康标签</label>
            <div class="chips">
              <button v-for="t in HEALTH_TAGS" :key="t" type="button" class="chip" :class="{ on: form.healthTags.includes(t) }" @click="toggleTag(t)">{{ t }}</button>
            </div>
          </div>

          <div class="full">
            <label>建档日期</label>
            <input class="a-input" v-model="form.registerDate" type="date" />
          </div>
        </div>
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
import { ref, computed } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import DetailDrawer from './DetailDrawer.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'
import {
  GENDER, DISTRICTS, LIVING_TYPES, ELDER_CARE_LEVEL, ELDER_STATUS, EMERGENCY_RELATIONS, HEALTH_TAGS
} from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const kw = ref('')
const status = ref('')
const district = ref('')
const pageSize = 7
const page = ref(1)

const columns = [
  { key: 'code', label: '档案号' },
  { key: 'name', label: '姓名' },
  { key: 'gender', label: '性别' },
  { key: 'age', label: '年龄' },
  { key: 'district', label: '所属区县' },
  { key: 'livingType', label: '居住类型' },
  { key: 'careLevel', label: '照护等级' },
  { key: 'status', label: '状态' }
]

const orgNames = computed(() => store.institutions.map((i) => i.name))

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return store.elderly.filter((r) => {
    const matchK = !k ||
      (r.name && r.name.toLowerCase().includes(k)) ||
      (r.code && r.code.toLowerCase().includes(k)) ||
      (r.phone && r.phone.toLowerCase().includes(k))
    const matchS = !status.value || r.status === status.value
    const matchD = !district.value || r.district === district.value
    return matchK && matchS && matchD
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (Math.min(page.value, pages.value) - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function applyFilter() {
  page.value = 1
  toast.info(`已筛选：${filtered.value.length} 条结果`)
}
function tagClass(v) {
  if (v === '在档') return 'green'
  if (v === '离档') return 'gray'
  if (v === '转院') return 'blue'
  return 'gray'
}

// ===== 详情抽屉 =====
const joinTags = (arr) => Array.isArray(arr) && arr.length ? arr.join('、') : '—'
function toFields(row) {
  return [
    { label: '档案号', value: row.code },
    { label: '姓名', value: row.name, hot: true },
    { label: '性别 / 年龄', value: `${row.gender} · ${row.age} 岁` },
    { label: '身份证号', value: row.idNo || '—' },
    { label: '所属区县', value: row.district },
    { label: '街道 / 乡镇', value: row.town || '—' },
    { label: '详细住址', value: row.address || '—' },
    { label: '联系电话', value: row.phone || '—' },
    { label: '居住类型', value: row.livingType },
    { label: '照护等级', value: row.careLevel, hot: ['失能', '特护'].includes(row.careLevel) },
    { label: '档案状态', value: row.status, hot: row.status === '在档' },
    { label: '所属机构', value: row.belongOrg || '—' },
    { label: '紧急联系人', value: row.emergencyName ? `${row.emergencyName}（${row.emergencyRelation || '—'}）` : '—' },
    { label: '紧急联系电话', value: row.emergencyPhone || '—' },
    { label: '健康标签', value: joinTags(row.healthTags) },
    { label: '建档日期', value: row.registerDate || '—' }
  ]
}
function openDetailRow(row) {
  openDetail({ title: `${row.name} · ${row.code}`, category: '老人档案', color: '#ffb020', fields: toFields(row) })
}

// ===== 批量操作 =====
const batchStatus = ref('')
function batchRemove() {
  const rows = selectedRows(store.elderly)
  if (!rows.length) return
  if (!confirm(`确认删除选中的 ${rows.length} 条档案？此操作不可撤销。`)) return
  rows.forEach((r) => store.removeElder(r.id))
  toast.success(`已删除 ${rows.length} 条档案`)
  clear(); batchStatus.value = ''
}
function applyBatchStatus() {
  if (!batchStatus.value) { toast.warn('请选择目标状态'); return }
  const rows = selectedRows(store.elderly)
  rows.forEach((r) => store.updateElder(r.id, { status: batchStatus.value }))
  toast.success(`已更新 ${rows.length} 条状态为「${batchStatus.value}」`)
  clear(); batchStatus.value = ''
}

// ===== 导出 =====
const exportColumns = [...columns, { key: 'healthTags', label: '健康标签' }]
function exportCurrent() {
  if (!filtered.value.length) { toast.warn('当前没有可导出的数据'); return }
  const rows = filtered.value.map((r) => ({ ...r, healthTags: joinTags(r.healthTags) }))
  exportCsv('老人档案', exportColumns, rows)
  toast.success(`已导出 ${filtered.value.length} 条档案`)
}

// ===== 表单（含行内校验）=====
const showForm = ref(false)
const editingId = ref(null)
const form = ref({})
const errors = ref({})
const formTitle = computed(() => (editingId.value ? '编辑档案' : '新增档案'))

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function blankForm() {
  return {
    name: '', gender: '男', age: '', idNo: '', district: '旌阳区', town: '', address: '',
    phone: '', livingType: '独居', careLevel: '自理', status: '在档', belongOrg: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: '子女', healthTags: [], registerDate: today()
  }
}
function toggleTag(t) {
  const arr = form.value.healthTags || []
  form.value.healthTags = arr.includes(t) ? arr.filter((x) => x !== t) : [...arr, t]
}
function openAdd() {
  form.value = blankForm()
  errors.value = {}
  editingId.value = null
  showForm.value = true
}
function openEdit(row) {
  form.value = {
    name: row.name, gender: row.gender, age: row.age, idNo: row.idNo || '', district: row.district,
    town: row.town || '', address: row.address || '', phone: row.phone || '', livingType: row.livingType,
    careLevel: row.careLevel, status: row.status, belongOrg: row.belongOrg || '',
    emergencyName: row.emergencyName || '', emergencyPhone: row.emergencyPhone || '',
    emergencyRelation: row.emergencyRelation || '子女',
    healthTags: Array.isArray(row.healthTags) ? [...row.healthTags] : [],
    registerDate: row.registerDate || today()
  }
  errors.value = {}
  editingId.value = row.id
  showForm.value = true
}
function validate() {
  const e = {}
  const f = form.value
  if (!f.name || !f.name.trim()) e.name = '请填写姓名'
  if (f.age === '' || f.age == null) e.age = '请填写年龄'
  else if (isNaN(Number(f.age)) || Number(f.age) <= 0 || Number(f.age) > 120) e.age = '年龄需在 1-120 之间'
  if (f.idNo && !/^\d{17}[\dXx]$/.test(f.idNo)) e.idNo = '身份证号应为 18 位'
  const phoneRe = /^1\d{2}\*{0,4}\d{4}$|^1\d{10}$/
  if (f.phone && !phoneRe.test(f.phone)) e.phone = '手机号格式不正确'
  if (f.emergencyPhone && !phoneRe.test(f.emergencyPhone)) e.emergencyPhone = '紧急联系人电话格式不正确'
  errors.value = e
  return Object.keys(e).length === 0
}
function save() {
  if (!validate()) { toast.warn('请修正表单中的错误'); return }
  const f = form.value
  const payload = {
    name: f.name.trim(), gender: f.gender, age: Number(f.age), idNo: f.idNo.trim(),
    district: f.district, town: f.town.trim(), address: f.address.trim(), phone: f.phone.trim(),
    livingType: f.livingType, careLevel: f.careLevel, status: f.status, belongOrg: f.belongOrg,
    emergencyName: f.emergencyName.trim(), emergencyPhone: f.emergencyPhone.trim(),
    emergencyRelation: f.emergencyRelation, healthTags: [...f.healthTags], registerDate: f.registerDate
  }
  if (editingId.value) {
    store.updateElder(editingId.value, payload)
    toast.success('已保存修改')
  } else {
    store.addElder(payload)
    toast.success('新增档案成功')
  }
  showForm.value = false
}
function remove(row) {
  if (!confirm(`确认删除「${row.name}（${row.code}）」的档案？此操作不可撤销。`)) return
  store.removeElder(row.id)
  toast.success('已删除档案')
}
</script>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.a-btn svg { width: 15px; height: 15px; }
.a-select.sm { padding: 7px 10px; font-size: 13px; }
.table-wrap { min-height: 300px; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0, 240, 255, .12); }
.op.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.op.danger:hover { background: rgba(255, 77, 77, .12); }
.empty { text-align: center; color: var(--c-muted); padding: 40px 0; }
.pager { margin-top: 16px; }
.clickable { cursor: pointer; }
.clickable:hover { background: rgba(0, 240, 255, .05); }
.cb { width: 40px; text-align: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--c-primary); cursor: pointer; }
.err { color: #ff6b6b; font-size: 12px; margin-top: 4px; }
.a-input.invalid, .a-select.invalid { border-color: rgba(255, 77, 77, .6); }
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px;
  background: rgba(255, 176, 32, .1); border: 1px solid rgba(255, 176, 32, .3); border-radius: 10px; }
.batch-info { font-size: 13px; color: var(--c-text); }
.batch-info b { color: #ffb020; }
.spacer { flex: 1; }
.a-btn.sm { padding: 6px 12px; font-size: 12px; }
.a-btn.sm.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.a-btn.sm.danger:hover { background: rgba(255, 77, 77, .12); }
.a-btn.sm.ghost { color: var(--c-muted); }
.a-btn.sm.ghost:hover { color: #fff; }

/* 表单 */
.form { display: flex; flex-direction: column; gap: 4px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
.form-grid .full { grid-column: 1 / -1; }
.form label { font-size: 13px; color: var(--c-muted); margin-top: 8px; }
.form label:first-child { margin-top: 0; }
.req { color: #ff6b6b; font-style: normal; }
.a-tag.lvl { background: rgba(0, 102, 255, .12); color: var(--c-primary); border: 1px solid var(--c-line2); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
.chip { padding: 6px 14px; border-radius: 18px; font-size: 13px; cursor: pointer;
  background: rgba(0, 102, 255, .06); border: 1px solid var(--c-line); color: var(--c-muted); transition: all .18s; }
.chip:hover { color: var(--c-text); border-color: var(--c-line2); }
.chip.on { color: #041018; font-weight: 600; background: linear-gradient(90deg, #00f0ff, #00ffcc); border-color: transparent;
  box-shadow: 0 0 12px rgba(0, 240, 255, .3); }
</style>
