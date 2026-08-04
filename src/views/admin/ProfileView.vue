<template>
  <div class="profile">
    <div class="pg-head">
      <div class="pg-title">个人中心</div>
      <div class="tabs">
        <button v-for="t in tabs" :key="t.key" class="tab" :class="{ active: tab === t.key }" @click="tab = t.key">
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- 资料 -->
    <div v-if="tab === 'info'" class="pg-body">
      <div class="a-card info-card">
        <div class="a-card-title">基本信息</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="k">头像</span>
            <span class="v">
              <img v-if="me.avatar" :src="me.avatar" class="ava-img" alt="头像" />
              <span v-else class="ava">{{ cuInitial }}</span>
            </span>
          </div>
          <div class="info-row"><span class="k">账号</span><span class="v">{{ cu.acc }}</span></div>
          <div class="info-row"><span class="k">姓名</span><span class="v">{{ cu.name }}</span></div>
          <div class="info-row"><span class="k">角色</span><span class="v"><span class="tag role">{{ cu.role }}</span></span></div>
          <div class="info-row"><span class="k">所属组织</span><span class="v">{{ me.org || '—' }}</span></div>
          <div class="info-row"><span class="k">手机号</span><span class="v">{{ me.phone || '—' }}</span></div>
          <div class="info-row">
            <span class="k">状态</span>
            <span class="v"><span class="tag" :class="me.on ? 'on' : 'off'">{{ me.on ? '启用' : '禁用' }}</span></span>
          </div>
        </div>
        <button class="a-btn" @click="startEdit">编辑资料</button>
      </div>

      <div class="a-card edit-card" v-if="editMode">
        <div class="a-card-title">编辑资料</div>
        <div class="form">
          <div class="fld">
            <label>姓名</label>
            <input class="a-input" v-model="editForm.name" placeholder="请输入姓名" />
          </div>
          <div class="fld">
            <label>手机号</label>
            <input class="a-input" v-model="editForm.phone" placeholder="请输入手机号" />
          </div>
          <div class="fld">
            <label>头像链接</label>
            <input class="a-input" v-model="editForm.avatar" placeholder="可选，填写图片 URL" />
          </div>
        </div>
        <div class="form-actions">
          <button class="a-btn ghost" @click="editMode = false">取消</button>
          <button class="a-btn primary" :disabled="saving" @click="saveProfile">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 安全 -->
    <div v-if="tab === 'security'" class="pg-body">
      <div class="a-card sec-card">
        <div class="a-card-title">修改密码</div>
        <div class="form sec-form">
          <div class="fld">
            <label>当前密码</label>
            <input class="a-input" type="password" v-model="pwdForm.oldP" autocomplete="current-password" />
          </div>
          <div class="fld">
            <label>新密码</label>
            <input class="a-input" type="password" v-model="pwdForm.newP" @input="checkStrength" autocomplete="new-password" />
          </div>
          <div class="strength" v-if="pwdForm.newP">
            <div class="bar"><i :class="'lv' + strengthLv" :style="{ width: strengthPct + '%' }"></i></div>
            <span class="lv-txt" :class="'lv' + strengthLv">{{ strengthLabel }}</span>
          </div>
          <div class="fld">
            <label>确认新密码</label>
            <input class="a-input" type="password" v-model="pwdForm.confP" autocomplete="new-password" />
          </div>
          <div class="err" v-if="pwdErr">{{ pwdErr }}</div>
        </div>
        <div class="form-actions">
          <button class="a-btn primary" :disabled="pwdSaving" @click="changePwd">{{ pwdSaving ? '提交中…' : '确认修改' }}</button>
        </div>
        <div class="hint">密码修改成功后将自动退出，请重新登录。建议长度 ≥ 8 位，且同时包含大小写字母与数字。</div>
      </div>
    </div>

    <!-- 登录记录 -->
    <div v-if="tab === 'logs'" class="pg-body">
      <div class="a-card log-card">
        <div class="a-card-title">最近登录记录 <span class="sub">共 {{ myLogs.length }} 条</span></div>
        <table class="log-tbl" v-if="myLogs.length">
          <thead>
            <tr><th>时间</th><th>IP 地址</th><th>设备</th><th>地理位置</th><th>结果</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in myLogs" :key="l.id">
              <td>{{ l.time }}</td>
              <td>{{ l.ip }}</td>
              <td class="dev">{{ l.device }}</td>
              <td>{{ l.location }}</td>
              <td><span class="badge" :class="l.result">{{ resultLabel(l.result) }}</span></td>
            </tr>
          </tbody>
        </table>
        <div class="empty" v-else>暂无登录记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '../../stores/data.js'
import { useAuth } from '../../composables/useAuth.js'
import { useToast } from '../../composables/useToast.js'

const router = useRouter()
const dataStore = useDataStore()
const auth = useAuth()
const toast = useToast()

const cu = computed(() => dataStore.currentUser)
const cuInitial = computed(() => (cu.value?.name || '?').slice(0, 1))
const me = computed(() => dataStore.users.find((u) => u.id === cu.value?.id) || {})

const tabs = [
  { key: 'info', label: '资料' },
  { key: 'security', label: '安全' },
  { key: 'logs', label: '登录记录' }
]
const tab = ref('info')

/* ---------- 资料编辑 ---------- */
const editMode = ref(false)
const saving = ref(false)
const editForm = reactive({ name: '', phone: '', avatar: '' })

function startEdit() {
  editForm.name = cu.value?.name || ''
  editForm.phone = me.value.phone || ''
  editForm.avatar = me.value.avatar || ''
  editMode.value = true
}

async function saveProfile() {
  if (!editForm.name.trim()) {
    toast.error('姓名不能为空')
    return
  }
  saving.value = true
  const u = me.value
  const ok = await dataStore.updateUser(u.id, {
    name: editForm.name.trim(),
    phone: editForm.phone,
    avatar: editForm.avatar
  })
  if (ok) {
    if (cu.value) cu.value.name = editForm.name.trim() // 同步顶栏展示
    toast.success('资料已保存')
    editMode.value = false
  }
  saving.value = false
}

/* ---------- 修改密码 ---------- */
const pwdForm = reactive({ oldP: '', newP: '', confP: '' })
const pwdErr = ref('')
const pwdSaving = ref(false)
const strengthLv = ref(0)
const strengthPct = computed(() => [0, 33, 66, 100][strengthLv.value])
const strengthLabel = computed(() => ['', '弱', '中', '强'][strengthLv.value])

function checkStrength() {
  const p = pwdForm.newP
  if (!p) { strengthLv.value = 0; return }
  let score = 0
  if (p.length >= 8) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (p.length >= 12 && /[^A-Za-z0-9]/.test(p)) score = 3
  strengthLv.value = Math.max(1, Math.min(3, score))
}

async function changePwd() {
  pwdErr.value = ''
  const { oldP, newP, confP } = pwdForm
  if (!oldP) { pwdErr.value = '请输入当前密码'; return }
  if (newP.length < 8 || !(/[a-z]/.test(newP) && /[A-Z]/.test(newP)) || !/\d/.test(newP)) {
    pwdErr.value = '新密码需 ≥ 8 位，且包含大小写字母与数字'; return
  }
  if (newP !== confP) { pwdErr.value = '两次输入的新密码不一致'; return }
  const u = me.value
  const okOld = u.password ? u.password === oldP : oldP === auth.DEMO_PASS
  if (!okOld) { pwdErr.value = '当前密码错误'; return }

  pwdSaving.value = true
  const ok = await dataStore.updateUser(u.id, { password: newP })
  pwdSaving.value = false
  if (!ok) { pwdErr.value = '密码修改失败，请重试'; return }

  toast.success('密码修改成功，请重新登录')
  auth.logout()
  router.replace('/login')
}

/* ---------- 登录记录 ---------- */
const myLogs = computed(() => {
  const id = cu.value?.id
  const acc = cu.value?.acc
  return dataStore.loginLogs.filter((l) => l.userId === id || l.username === acc)
})
function resultLabel(r) {
  return { success: '成功', fail: '失败', locked: '锁定' }[r] || r
}
</script>

<style scoped>
.profile { max-width: 860px; margin: 0 auto; }
.pg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.pg-title { font-size: 20px; font-weight: 700; color: #fff; }
.tabs { display: flex; gap: 4px; background: rgba(255,255,255,.04); border: 1px solid var(--c-line); border-radius: 10px; padding: 4px; }
.tab { border: none; background: transparent; color: var(--c-muted); font-size: 13px; padding: 7px 16px; border-radius: 7px; cursor: pointer; transition: all .2s; }
.tab:hover { color: var(--c-text); }
.tab.active { background: rgba(0,102,255,.22); color: #fff; }

.pg-body { display: flex; flex-direction: column; gap: 16px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 18px; }
.info-row { display: grid; grid-template-columns: 84px 1fr; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.info-row .k { font-size: 13px; color: var(--c-muted); }
.info-row .v { font-size: 14px; color: var(--c-text); }

.ava, .ava-img { width: 40px; height: 40px; border-radius: 50%; }
.ava { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(180deg,#0066ff,#00f0ff); color: #021; font-weight: 700; font-size: 16px; }
.ava-img { object-fit: cover; border: 1px solid var(--c-line); }

.tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; }
.tag.role { background: rgba(0,240,255,.12); color: var(--c-primary); border: 1px solid rgba(0,240,255,.3); }
.tag.on { background: rgba(16,185,129,.14); color: #10b981; border: 1px solid rgba(16,185,129,.35); }
.tag.off { background: rgba(255,77,77,.14); color: #ff8a8a; border: 1px solid rgba(255,77,77,.35); }

.form { display: flex; flex-direction: column; gap: 14px; max-width: 420px; }
.fld { display: grid; grid-template-columns: 84px 1fr; align-items: center; gap: 12px; }
.fld label { font-size: 13px; color: var(--c-muted); }
.fld .a-input { width: 100%; box-sizing: border-box; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

.strength { display: flex; align-items: center; gap: 10px; max-width: 420px; margin: -4px 0 0 96px; }
.strength .bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; }
.strength .bar i { display: block; height: 100%; border-radius: 3px; transition: width .25s, background .25s; }
.strength .bar i.lv1 { background: #ff4d4d; }
.strength .bar i.lv2 { background: #ffaa00; }
.strength .bar i.lv3 { background: #10b981; }
.lv-txt { font-size: 12px; color: var(--c-muted); width: 22px; }
.lv-txt.lv1 { color: #ff8a8a; } .lv-txt.lv2 { color: #ffaa00; } .lv-txt.lv3 { color: #10b981; }

.err { color: #ff8a8a; font-size: 13px; background: rgba(255,77,77,.1); border: 1px solid rgba(255,77,77,.3); padding: 8px 12px; border-radius: 8px; max-width: 420px; }
.hint { margin-top: 14px; font-size: 12px; color: var(--c-muted); line-height: 1.6; }

.log-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.log-tbl th { text-align: left; color: var(--c-muted); font-weight: 500; padding: 10px 12px; border-bottom: 1px solid var(--c-line); }
.log-tbl td { padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.05); color: var(--c-text); }
.log-tbl .dev { color: var(--c-muted); max-width: 220px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; }
.badge.success { background: rgba(16,185,129,.14); color: #10b981; }
.badge.fail { background: rgba(255,77,77,.16); color: #ff8a8a; }
.badge.locked { background: rgba(255,170,0,.16); color: #ffaa00; }
.empty { padding: 40px; text-align: center; color: var(--c-muted); font-size: 13px; }

@media (max-width: 900px) {
  .info-grid { grid-template-columns: 1fr; }
  .fld { grid-template-columns: 72px 1fr; }
  .strength { margin-left: 84px; }
}
</style>
