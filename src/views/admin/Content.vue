<template>
  <div class="a-card">
    <div class="a-card-title">内容运营管理<span class="sub">文章 / 公告 / 视频发布</span>
      <div class="spacer"></div>
      <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
      <button class="a-btn primary" @click="openAdd"><IconSvg name="plus" /> 新增内容</button>
    </div>
    <div class="toolbar row wrap">
      <input class="a-input" v-model="kw" placeholder="搜索标题" style="width:200px" @keyup.enter="page = 1" />
      <select class="a-select" v-model="category" @change="page = 1">
        <option value="">全部分类</option>
        <option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
      </select>
      <select class="a-select" v-model="state" @change="page = 1">
        <option value="">全部状态</option>
        <option v-for="s in CONTENT_STATUS" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <div class="batch-bar" v-if="selected.size > 0">
      <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
      <div class="spacer"></div>
      <button class="a-btn sm" @click="batchPublish">批量发布</button>
      <button class="a-btn sm" @click="batchOffline">批量下线</button>
      <button class="a-btn sm danger" @click="batchRemove">批量删除</button>
      <button class="a-btn sm ghost" @click="clear">取消选择</button>
    </div>

    <div class="table-wrap">
      <table class="a-table">
        <thead><tr>
          <th style="width:40px"><input type="checkbox" :checked="allSelected(paged)" @change="toggleAll(paged)" /></th>
          <th>标题</th><th>分类</th><th>状态</th><th>发布时间</th><th style="width:230px">操作</th>
        </tr></thead>
        <tbody>
          <tr v-for="c in paged" :key="c.id" class="clickable" @click="openDetailRow(c)">
            <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(c)" @change="toggle(c)" /></td>
            <td>{{ c.title }}</td><td>{{ c.category }}</td>
            <td><span class="a-tag" :class="c.status === '已发布' ? 'green' : c.status === '已下线' ? 'gray' : 'blue'">{{ c.status }}</span></td>
            <td class="muted">{{ c.publishAt || '—' }}</td>
            <td class="ops" @click.stop>
              <button class="op" v-if="c.status !== '已发布'" @click="publish(c)">发布</button>
              <button class="op" v-else @click="offline(c)">下线</button>
              <button class="op danger" @click="remove(c)">删除</button>
            </td>
          </tr>
          <tr v-if="paged.length === 0"><td colspan="6" class="empty">暂无内容，点击「新增内容」创建</td></tr>
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

    <Modal :show="showForm" title="新增内容" width="500px" @update:show="showForm = $event">
      <div class="form">
        <label>标题</label>
        <input class="a-input" v-model="form.title" style="width:100%" placeholder="如：夏季防暑指南" :class="{ invalid: errors.title }" />
        <div class="err" v-if="errors.title">{{ errors.title }}</div>
        <label>分类</label>
        <select class="a-select" v-model="form.category" style="width:100%">
          <option v-for="c in CONTENT_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
        <label>状态</label>
        <select class="a-select" v-model="form.status" style="width:100%">
          <option v-for="s in CONTENT_STATUS" :key="s" :value="s">{{ s }}</option>
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
import { CONTENT_CATEGORIES, CONTENT_STATUS } from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail, closeDetail } = useDetail()

const kw = ref('')
const category = ref('')
const state = ref('')
const page = ref(1)
const pageSize = 7
const cats = CONTENT_CATEGORIES

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return store.contents.filter((c) => {
    const m = !k || c.title.toLowerCase().includes(k)
    const mc = !category.value || c.category === category.value
    const ms = !state.value || c.status === state.value
    return m && mc && ms
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => {
  const start = (Math.min(page.value, pages.value) - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

function openDetailRow(c) {
  openDetail({
    title: c.title, category: '内容运营', color: '#00f0ff',
    fields: [
      { label: '内容标题', value: c.title },
      { label: '内容分类', value: c.category },
      { label: '发布状态', value: c.status, hot: c.status === '已发布' },
      { label: '发布时间', value: c.publishAt || '未发布' }
    ]
  })
}

function publish(c) { store.setContentStatus(c.id, '已发布'); toast.success('已发布：' + c.title) }
function offline(c) { store.setContentStatus(c.id, '已下线'); toast.success('已下线：' + c.title) }
function remove(c) {
  if (!confirm('确认删除内容「' + c.title + '」？')) return
  store.removeContent(c.id)
  toast.success('已删除')
}

function batchPublish() {
  const rows = selectedRows(store.contents).filter((c) => c.status !== '已发布')
  rows.forEach((c) => store.setContentStatus(c.id, '已发布'))
  toast.success(`已批量发布 ${rows.length} 条内容`)
  clear()
}
function batchOffline() {
  const rows = selectedRows(store.contents).filter((c) => c.status === '已发布')
  rows.forEach((c) => store.setContentStatus(c.id, '已下线'))
  toast.success(`已批量下线 ${rows.length} 条内容`)
  clear()
}
function batchRemove() {
  const rows = selectedRows(store.contents)
  if (!confirm(`确认批量删除选中的 ${rows.length} 条内容？`)) { clear(); return }
  rows.forEach((c) => store.removeContent(c.id))
  toast.success(`已删除 ${rows.length} 条内容`)
  clear()
}
function exportCurrent() {
  if (!filtered.value.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv('内容运营列表', [
    { key: 'title', label: '标题' }, { key: 'category', label: '分类' },
    { key: 'status', label: '状态' }, { key: 'publishAt', label: '发布时间' }
  ], filtered.value)
  toast.success(`已导出 ${filtered.value.length} 条内容`)
}

const showForm = ref(false)
const form = ref({ title: '', category: '科普文章', status: '草稿' })
const errors = ref({})
function openAdd() { form.value = { title: '', category: '科普文章', status: '草稿' }; errors.value = {}; showForm.value = true }
function save() {
  const e = {}
  if (!form.value.title || !form.value.title.trim()) e.title = '请填写标题'
  errors.value = e
  if (Object.keys(e).length) { toast.warn('请修正表单中的错误'); return }
  store.addContent({
    title: form.value.title,
    category: form.value.category,
    status: form.value.status,
    publishAt: form.value.status === '已发布' ? new Date().toISOString().slice(0, 10) : ''
  })
  toast.success('内容已创建')
  showForm.value = false
}
</script>

<style scoped>
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
