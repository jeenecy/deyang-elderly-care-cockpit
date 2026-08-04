<template>
  <div class="login-logs">
    <div class="pg-head">
      <div class="pg-title">登录安全审计</div>
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'logs' }" @click="tab = 'logs'">登录日志</button>
        <button class="tab" :class="{ active: tab === 'policy' }" @click="tab = 'policy'">安全策略</button>
      </div>
    </div>

    <!-- 登录日志列表 -->
    <div v-if="tab === 'logs'">
      <div class="a-card tool-card">
        <div class="toolbar">
          <input class="a-input search" v-model="kw" placeholder="搜索账号 / IP / 用户" />
          <select class="a-select" v-model="resultFilter">
          <option value="">全部结果</option>
          <option v-for="o in LOGIN_RESULTS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <select class="a-select" v-model="userFilter">
            <option value="">全部用户</option>
            <option v-for="u in userOptions" :key="u.acc" :value="u.acc">{{ u.name }}（{{ u.acc }}）</option>
          </select>
          <button class="a-btn ghost" @click="resetFilters">重置</button>
          <button class="a-btn" @click="doExport">导出 CSV</button>
        </div>
      </div>

      <div class="a-card">
        <table class="log-tbl">
          <thead>
            <tr>
              <th class="sortable" @click="toggleSort('time')">时间 <span class="arrow" :class="{ on: sortKey==='time' }">{{ sortKey==='time' ? (sortAsc?'▲':'▼') : '⇅' }}</span></th>
              <th>用户</th>
              <th>账号</th>
              <th>IP 地址</th>
              <th>设备</th>
              <th>地理位置</th>
              <th>结果</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pagedRows" :key="r.id">
              <td>{{ r.time }}</td>
              <td>{{ userName(r) }}</td>
              <td>{{ r.username }}</td>
              <td>{{ r.ip }}</td>
              <td class="dev">{{ r.device }}</td>
              <td>{{ r.location }}</td>
              <td><span class="badge" :class="r.result">{{ resultLabel(r.result) }}</span></td>
              <td><button class="a-btn sm" @click="openDetail(r)">详情</button></td>
            </tr>
            <tr v-if="!pagedRows.length"><td colspan="8" class="empty">暂无匹配记录</td></tr>
          </tbody>
        </table>

        <div class="pager">
          <span class="total">共 {{ filtered.length }} 条</span>
          <div class="pg">
            <button class="a-btn sm" :disabled="page <= 1" @click="page--">上一页</button>
            <span class="pg-num">{{ page }} / {{ totalPages }}</span>
            <button class="a-btn sm" :disabled="page >= totalPages" @click="page++">下一页</button>
            <select class="a-select sm" v-model.number="pageSize">
              <option :value="10">10 / 页</option>
              <option :value="20">20 / 页</option>
              <option :value="50">50 / 页</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全策略 -->
    <div v-if="tab === 'policy'">
      <div class="a-card policy-card">
        <div class="a-card-title">登录安全策略 <span class="sub">调整后即时生效（下次登录起）</span></div>
        <div class="form">
          <div class="fld">
            <label>锁定阈值</label>
            <div class="inline">
              <input class="a-input num" type="number" min="1" max="20" v-model.number="policy.maxFail" />
              <span class="unit">次连续失败后锁定账号</span>
            </div>
          </div>
          <div class="fld">
            <label>锁定时长</label>
            <div class="inline">
              <input class="a-input num" type="number" min="1" max="120" v-model.number="policy.lockMinutes" />
              <span class="unit">分钟</span>
            </div>
          </div>
          <div class="fld">
            <label>图形验证码</label>
            <label class="switch">
              <input type="checkbox" v-model="policy.captchaEnabled" />
              <span class="track"></span>
            </label>
            <span class="hint-inline">关闭后登录不再要求验证码</span>
          </div>
          <div class="fld" v-if="policy.captchaEnabled">
            <label>验证码阈值</label>
            <div class="inline">
              <input class="a-input num" type="number" min="1" max="10" v-model.number="policy.captchaThreshold" />
              <span class="unit">次失败后出现验证码</span>
            </div>
          </div>
          <div class="fld">
            <label>异地登录提醒</label>
            <label class="switch">
              <input type="checkbox" v-model="policy.异地提醒" />
              <span class="track"></span>
            </label>
            <span class="hint-inline">异常地理位置登录时标记提醒</span>
          </div>
        </div>
        <div class="form-actions">
          <button class="a-btn ghost" @click="resetPolicy">恢复默认</button>
          <button class="a-btn primary" :disabled="saving" @click="savePolicy">{{ saving ? '保存中…' : '保存策略' }}</button>
        </div>
      </div>
    </div>

    <DetailDrawer
      :show="detailShow"
      :title="detail.title"
      :category="detail.category"
      :color="detail.color"
      :desc="detail.desc"
      :fields="detail.fields"
      @update:show="detailShow = $event"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useDataStore } from '../../stores/data.js'
import { useToast } from '../../composables/useToast.js'
import DetailDrawer from './DetailDrawer.vue'
import { exportCsv } from '../../utils/exportCsv.js'
import { LOGIN_RESULTS, labelOf } from '../../constants/dict.js'

const dataStore = useDataStore()
const toast = useToast()

const tab = ref('logs')

/* ---------- 列表筛选 / 排序 / 分页 ---------- */
const kw = ref('')
const resultFilter = ref('')
const userFilter = ref('')
const page = ref(1)
const pageSize = ref(10)
const sortKey = ref('time')
const sortAsc = ref(false)

const allLogs = computed(() => dataStore.loginLogs)
const userOptions = computed(() => dataStore.users)

function userName(r) {
  const u = dataStore.users.find((x) => x.id === r.userId)
  return u ? u.name : (r.username || '—')
}
function resultLabel(r) {
  return labelOf(LOGIN_RESULTS, r)
}

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  let list = allLogs.value.filter((r) => {
    if (resultFilter.value && r.result !== resultFilter.value) return false
    if (userFilter.value && r.username !== userFilter.value) return false
    if (k) {
      const hay = (r.username + ' ' + r.ip + ' ' + userName(r)).toLowerCase()
      if (!hay.includes(k)) return false
    }
    return true
  })
  list = [...list].sort((a, b) => {
    let av = a[sortKey.value] || ''
    let bv = b[sortKey.value] || ''
    if (av < bv) return sortAsc.value ? -1 : 1
    if (av > bv) return sortAsc.value ? 1 : -1
    return 0
  })
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function toggleSort(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = false }
}
function resetFilters() {
  kw.value = ''
  resultFilter.value = ''
  userFilter.value = ''
  page.value = 1
}
function doExport() {
  const cols = [
    { label: '时间', key: 'time' },
    { label: '用户', key: 'userName' },
    { label: '账号', key: 'username' },
    { label: 'IP地址', key: 'ip' },
    { label: '设备', key: 'device' },
    { label: '地理位置', key: 'location' },
    { label: '结果', key: 'resultText' },
    { label: '失败原因', key: 'failReason' }
  ]
  const rows = filtered.value.map((r) => ({
    ...r,
    userName: userName(r),
    resultText: resultLabel(r.result),
    failReason: r.failReason || ''
  }))
  exportCsv('登录安全审计_' + new Date().toISOString().slice(0, 10), cols, rows)
  toast.success('已导出 CSV')
}

/* ---------- 详情抽屉 ---------- */
const detailShow = ref(false)
const detail = reactive({ title: '', category: '', color: '', desc: '', fields: [] })
function openDetail(r) {
  const colorMap = { success: '#10b981', fail: '#ff4d4d', locked: '#ffaa00' }
  detail.title = '登录记录详情'
  detail.category = resultLabel(r.result)
  detail.color = colorMap[r.result] || '#00f0ff'
  detail.desc = r.result === 'success' ? '本次登录成功，已建立会话。' : (r.failReason || '本次登录未通过校验。')
  detail.fields = [
    { label: '时间', value: r.time },
    { label: '用户', value: userName(r) },
    { label: '账号', value: r.username },
    { label: '用户ID', value: r.userId || '—' },
    { label: 'IP 地址', value: r.ip },
    { label: '设备', value: r.device },
    { label: '地理位置', value: r.location },
    { label: '结果', value: resultLabel(r.result) },
    { label: '失败原因', value: r.failReason || '—', hot: r.result !== 'success' }
  ]
  detailShow.value = true
}

/* ---------- 安全策略 ---------- */
const saving = ref(false)
const policy = reactive({ maxFail: 5, lockMinutes: 30, captchaEnabled: true, captchaThreshold: 2, 异地提醒: false })
const DEFAULT_POLICY = { maxFail: 5, lockMinutes: 30, captchaEnabled: true, captchaThreshold: 2, 异地提醒: false }

onMounted(() => { Object.assign(policy, dataStore.authConfig) })

function resetPolicy() {
  Object.assign(policy, DEFAULT_POLICY)
}
async function savePolicy() {
  saving.value = true
  Object.assign(dataStore.authConfig, policy)
  await dataStore.saveAuthConfig()
  saving.value = false
}
</script>

<style scoped>
.pg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.pg-title { font-size: 20px; font-weight: 700; color: #fff; }
.tabs { display: flex; gap: 4px; background: rgba(255,255,255,.04); border: 1px solid var(--c-line); border-radius: 10px; padding: 4px; }
.tab { border: none; background: transparent; color: var(--c-muted); font-size: 13px; padding: 7px 16px; border-radius: 7px; cursor: pointer; transition: all .2s; }
.tab:hover { color: var(--c-text); }
.tab.active { background: rgba(0,102,255,.22); color: #fff; }

.toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.toolbar .search { flex: 1; min-width: 200px; }
.toolbar .a-select { min-width: 130px; }

.log-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.log-tbl th { text-align: left; color: var(--c-muted); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--c-line); white-space: nowrap; }
.log-tbl td { padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.05); color: var(--c-text); }
.log-tbl .dev { color: var(--c-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-tbl .sortable { cursor: pointer; user-select: none; }
.log-tbl .sortable:hover { color: var(--c-text); }
.arrow { font-size: 11px; color: var(--c-primary); }
.arrow.on { color: var(--c-primary); }
.empty { text-align: center; color: var(--c-muted); padding: 36px 0; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; }
.badge.success { background: rgba(16,185,129,.14); color: #10b981; }
.badge.fail { background: rgba(255,77,77,.16); color: #ff8a8a; }
.badge.locked { background: rgba(255,170,0,.16); color: #ffaa00; }

.pager { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 12px; }
.pager .total { font-size: 13px; color: var(--c-muted); }
.pg { display: flex; align-items: center; gap: 10px; }
.pg-num { font-size: 13px; color: var(--c-text); min-width: 56px; text-align: center; }
.a-select.sm { padding: 5px 8px; font-size: 12px; min-width: auto; }

.policy-card { max-width: 640px; }
.form { display: flex; flex-direction: column; gap: 18px; margin-top: 6px; }
.fld { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 12px; }
.fld > label { font-size: 13px; color: var(--c-muted); }
.inline { display: flex; align-items: center; gap: 10px; }
.a-input.num { width: 90px; }
.unit { font-size: 13px; color: var(--c-muted); }
.hint-inline { font-size: 12px; color: var(--c-muted); }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch .track { position: absolute; inset: 0; background: rgba(255,255,255,.12); border: 1px solid var(--c-line); border-radius: 24px; transition: .2s; }
.switch .track::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 2px; background: #cfd8e6; border-radius: 50%; transition: .2s; }
.switch input:checked + .track { background: rgba(0,240,255,.35); border-color: var(--c-primary); }
.switch input:checked + .track::before { transform: translateX(20px); background: var(--c-primary); }

@media (max-width: 900px) {
  .fld { grid-template-columns: 84px 1fr; }
  .log-tbl .dev { max-width: 140px; }
}
</style>
