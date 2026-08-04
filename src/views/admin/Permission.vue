<template>
  <div class="grid-2">
    <div class="a-card">
      <div class="a-card-title">组织机构树<span class="sub">市 → 区县 → 机构</span></div>
      <ul class="tree">
        <li>
          <div class="node"><span class="dot city"></span>德阳市民政局</div>
          <ul>
            <li v-for="d in orgs" :key="d.name">
              <div class="node"><span class="dot district"></span>{{ d.name }}<span class="cnt">{{ d.children.length }} 家</span></div>
              <ul><li v-for="c in d.children" :key="c"><div class="node leaf"><span class="dot org"></span>{{ c }}</div></li></ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="col">
      <!-- 角色与权限（RBAC） -->
      <div class="a-card">
        <div class="a-card-title">角色与权限（RBAC）
          <div class="spacer"></div>
          <button class="a-btn sm" @click="openAddRole"><IconSvg name="plus" /> 新增角色</button>
        </div>
        <table class="a-table">
          <thead><tr><th>角色</th><th>数据范围</th><th>授权模块</th><th style="width:170px">操作</th></tr></thead>
          <tbody>
            <tr v-for="r in store.roles" :key="r.id">
              <td>{{ r.name }}</td>
              <td>{{ r.scope }}</td>
              <td><span class="a-tag blue">{{ permCount(r) }}/{{ store.moduleList.length }}</span></td>
              <td class="ops">
                <button class="op" @click="openEditRole(r)">权限</button>
                <button class="op danger" @click="removeRole(r)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 用户管理 -->
      <div class="a-card">
        <div class="a-card-title">用户管理
          <div class="spacer"></div>
          <button class="a-btn sm" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
          <button class="a-btn sm primary" @click="openAdd"><IconSvg name="plus" /> 新增</button>
        </div>

        <div class="batch-bar" v-if="selected.size > 0">
          <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
          <div class="spacer"></div>
          <button class="a-btn sm" @click="batchSet(true)">批量启用</button>
          <button class="a-btn sm" @click="batchSet(false)">批量停用</button>
          <button class="a-btn sm danger" @click="batchRemove">批量删除</button>
          <button class="a-btn sm ghost" @click="clear">取消选择</button>
        </div>

        <table class="a-table">
          <thead><tr>
            <th style="width:40px"><input type="checkbox" :checked="allSelected(store.users)" @change="toggleAll(store.users)" /></th>
            <th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th style="width:190px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="u in store.users" :key="u.id" class="clickable" @click="openDetailRow(u)">
              <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(u)" @change="toggle(u)" /></td>
              <td>{{ u.acc }}</td><td>{{ u.name }}</td><td>{{ u.role }}</td>
              <td><span class="a-tag" :class="u.on ? 'green' : 'gray'">{{ u.on ? '启用' : '停用' }}</span></td>
              <td class="ops" @click.stop>
                <span class="switch sm" :class="{ on: u.on }" @click="toggleUser(u)"><i></i></span>
                <button class="op danger" @click="remove(u)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- 新增用户 -->
  <Modal :show="showForm" title="新增用户" width="460px" @update:show="showForm = $event">
    <div class="form">
      <label>账号</label>
      <input class="a-input" v-model="form.acc" style="width:100%" placeholder="如：mgr_sn" :class="{ invalid: errors.acc }" />
      <div class="err" v-if="errors.acc">{{ errors.acc }}</div>
      <label>姓名</label>
      <input class="a-input" v-model="form.name" style="width:100%" :class="{ invalid: errors.name }" />
      <div class="err" v-if="errors.name">{{ errors.name }}</div>
      <label>角色</label>
      <select class="a-select" v-model="form.role" style="width:100%">
        <option v-for="r in store.roles" :key="r.id" :value="r.name">{{ r.name }}</option>
      </select>
    </div>
    <template #footer>
      <button class="a-btn" @click="showForm = false">取消</button>
      <button class="a-btn primary" @click="save">保存</button>
    </template>
  </Modal>

  <!-- 角色权限编辑 -->
  <Modal :show="showRole" :title="roleForm.id ? '编辑角色权限' : '新增角色'" width="520px" @update:show="showRole = $event">
    <div class="form">
      <template v-if="!roleForm.id">
        <label>角色名称</label>
        <input class="a-input" v-model="roleForm.name" style="width:100%" placeholder="如：街道操作员" :class="{ invalid: errors.roleName }" />
        <div class="err" v-if="errors.roleName">{{ errors.roleName }}</div>
        <label>数据范围</label>
        <select class="a-select" v-model="roleForm.scope" style="width:100%">
          <option v-for="x in DATA_SCOPE" :key="x" :value="x">{{ x }}</option>
        </select>
      </template>
      <label>授权模块（点击切换）</label>
      <div class="perm-grid">
        <button v-for="m in store.moduleList" :key="m" class="perm-chip" :class="{ on: roleForm.perms[m] }" @click="roleForm.perms[m] = !roleForm.perms[m]">
          {{ m }}
        </button>
      </div>
    </div>
    <template #footer>
      <button class="a-btn" @click="showRole = false">取消</button>
      <button class="a-btn primary" @click="saveRole">保存</button>
    </template>
  </Modal>

  <DetailDrawer :show="showDetail" :title="detailTitle" :category="detailCategory" :color="detailColor"
    :fields="detailFields" @update:show="showDetail = $event" />
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import DetailDrawer from './DetailDrawer.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { DATA_SCOPE } from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const orgs = [
  { name: '旌阳区', children: ['旌阳区智慧养老服务中心', '孝感街道养老站', '沱江社区长者食堂'] },
  { name: '罗江区', children: ['罗江区社会福利院'] },
  { name: '中江县', children: ['中江县第二敬老院', '文昌社区日间照料中心'] },
  { name: '广汉市', children: ['广汉市颐养院', '雒城街道助老服务站'] },
  { name: '什邡市', children: ['什邡市康养中心', '方亭街道康复点'] },
  { name: '绵竹市', children: ['绵竹市第三敬老院', '紫岩社区文娱活动室'] }
]

function permCount(r) { return Object.values(r.perms).filter(Boolean).length }

// ===== 用户 =====
function openDetailRow(u) {
  openDetail({
    title: u.name, category: '账号', color: '#00f0ff',
    fields: [
      { label: '登录账号', value: u.acc },
      { label: '姓名', value: u.name },
      { label: '角色', value: u.role },
      { label: '状态', value: u.on ? '启用' : '停用', hot: u.on }
    ]
  })
}
function toggleUser(u) {
  store.setUserOn(u.id, !u.on)
  toast.success(`${u.name} → ${!u.on ? '启用' : '停用'}`)
}
function remove(u) {
  if (!confirm(`确认删除用户「${u.name}」？`)) return
  store.removeUser(u.id)
  toast.success('用户已删除')
}
function batchSet(on) {
  const rows = selectedRows(store.users)
  rows.forEach((u) => store.setUserOn(u.id, on))
  toast.success(`已批量${on ? '启用' : '停用'} ${rows.length} 个用户`)
  clear()
}
function batchRemove() {
  const rows = selectedRows(store.users)
  if (!confirm(`确认批量删除选中的 ${rows.length} 个用户？`)) { clear(); return }
  rows.forEach((u) => store.removeUser(u.id))
  toast.success(`已删除 ${rows.length} 个用户`)
  clear()
}
function exportCurrent() {
  if (!store.users.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv('用户账号列表', [
    { key: 'acc', label: '账号' }, { key: 'name', label: '姓名' },
    { key: 'role', label: '角色' }, { key: 'on', label: '状态' }
  ], store.users.map(u => ({ ...u, on: u.on ? '启用' : '停用' })))
  toast.success(`已导出 ${store.users.length} 个用户`)
}

const showForm = ref(false)
const form = ref({ acc: '', name: '', role: '区县账号' })
const errors = ref({})
function openAdd() {
  form.value = { acc: '', name: '', role: store.roles[0]?.name || '区县账号' }
  errors.value = {}; showForm.value = true
}
function save() {
  const e = {}
  if (!form.value.acc || !form.value.acc.trim()) e.acc = '请填写账号'
  if (!form.value.name || !form.value.name.trim()) e.name = '请填写姓名'
  errors.value = e
  if (Object.keys(e).length) { toast.warn('请修正表单中的错误'); return }
  store.addUser({ acc: form.value.acc, name: form.value.name, role: form.value.role, on: true })
  toast.success('用户已创建')
  showForm.value = false
}

// ===== 角色（RBAC 矩阵）=====
const showRole = ref(false)
const roleForm = reactive({ id: '', name: '', scope: '本机构', perms: {} })
const errors2 = ref({})
function freshPerms() {
  const o = {}
  store.moduleList.forEach((m) => { o[m] = m === '总览' })
  return o
}
function openAddRole() {
  Object.assign(roleForm, { id: '', name: '', scope: '本机构', perms: freshPerms() })
  errors2.value = {}; showRole.value = true
}
function openEditRole(r) {
  Object.assign(roleForm, { id: r.id, name: r.name, scope: r.scope, perms: { ...r.perms } })
  errors2.value = {}; showRole.value = true
}
function saveRole() {
  if (!roleForm.id) {
    const e = {}
    if (!roleForm.name || !roleForm.name.trim()) e.roleName = '请填写角色名称'
    errors2.value = e
    if (Object.keys(e).length) { toast.warn('请修正表单中的错误'); return }
    store.addRole({ name: roleForm.name, scope: roleForm.scope, perms: { ...roleForm.perms } })
    toast.success('角色已创建')
  } else {
    store.updateRole(roleForm.id, { perms: { ...roleForm.perms }, scope: roleForm.scope })
    toast.success('角色权限已更新')
  }
  showRole.value = false
}
function removeRole(r) {
  if (!confirm(`确认删除角色「${r.name}」？`)) return
  store.removeRole(r.id)
  toast.success('角色已删除')
}
</script>

<style scoped>
.grid-2 { display: grid; grid-template-columns: 340px 1fr; gap: 18px; align-items: start; }
.col { display: flex; flex-direction: column; gap: 18px; }
.tree { font-size: 14px; }
.tree ul { padding-left: 20px; border-left: 1px dashed var(--c-line); margin-left: 8px; }
.tree .node { display: flex; align-items: center; gap: 9px; padding: 7px 0; color: var(--c-text); }
.tree .leaf { color: var(--c-muted); font-size: 13px; }
.dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.dot.city { background: var(--c-primary); box-shadow: 0 0 8px var(--c-primary); }
.dot.district { background: var(--c-accent); }
.dot.org { background: var(--c-muted); }
.cnt { font-size: 12px; color: var(--c-muted); margin-left: 4px; }
.form { display: flex; flex-direction: column; gap: 6px; }
.form label { font-size: 13px; color: var(--c-muted); margin-top: 10px; }
.form label:first-child { margin-top: 0; }
.switch.sm { width: 40px; height: 22px; border-radius: 11px; background: rgba(138, 166, 200, .3); display: inline-block;
  position: relative; cursor: pointer; transition: all .2s; vertical-align: middle; }
.switch.sm i { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: all .2s; }
.switch.sm.on { background: linear-gradient(90deg, #0066ff, #00f0ff); }
.switch.sm.on i { left: 21px; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0, 240, 255, .12); }
.op.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.op.danger:hover { background: rgba(255, 77, 77, .12); }
.a-btn svg { width: 15px; height: 15px; }
.err { color: #ff6b6b; font-size: 12px; margin-top: 4px; }
.a-input.invalid, .a-select.invalid { border-color: rgba(255, 77, 77, .6); }
.clickable { cursor: pointer; }
.clickable:hover { background: rgba(0, 240, 255, .05); }
.cb { width: 40px; text-align: center; }
input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--c-primary); cursor: pointer; }
.perm-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.perm-chip { padding: 7px 13px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all .2s;
  border: 1px solid var(--c-line); background: transparent; color: var(--c-muted); }
.perm-chip:hover { color: var(--c-text); }
.perm-chip.on { color: #fff; background: rgba(0, 102, 255, .22); border-color: var(--c-line2); }
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px;
  background: rgba(0, 102, 255, .1); border: 1px solid var(--c-line2); border-radius: 10px; }
.batch-info { font-size: 13px; color: var(--c-text); }
.batch-info b { color: var(--c-primary); }
.spacer { flex: 1; }
.a-btn.sm { padding: 6px 12px; font-size: 12px; }
.a-btn.sm.primary { color: #fff; background: rgba(0, 102, 255, .25); border-color: var(--c-line2); }
.a-btn.sm.danger { color: var(--c-danger); border-color: rgba(255, 77, 77, .3); }
.a-btn.sm.danger:hover { background: rgba(255, 77, 77, .12); }
.a-btn.sm.ghost { color: var(--c-muted); }
.a-btn.sm.ghost:hover { color: #fff; }
</style>
