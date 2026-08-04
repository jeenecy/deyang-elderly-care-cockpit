<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo">养</div>
        <div class="brand-txt">
          <div class="bn">德阳智慧养老驾驶舱</div>
          <div class="bs">后台管理系统 · 统一身份认证</div>
        </div>
      </div>

      <div class="err" v-if="error">{{ error }}</div>

      <div class="field">
        <label>账号</label>
        <input v-model="form.acc" class="inp" placeholder="请输入账号" :disabled="locked" autocomplete="username" @keyup.enter="onSubmit" />
      </div>

      <div class="field">
        <label>密码</label>
        <div class="pw">
          <input :type="showPwd ? 'text' : 'password'" v-model="form.pwd" class="inp" placeholder="请输入密码" :disabled="locked" autocomplete="current-password" @keyup.enter="onSubmit" />
          <button type="button" class="toggle" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</button>
        </div>
      </div>

      <div class="field" v-if="showCaptcha">
        <label>验证码</label>
        <div class="cap">
          <input v-model="form.captcha" class="inp" placeholder="请输入右侧验证码" :disabled="locked" @keyup.enter="onSubmit" />
          <canvas ref="canvasRef" width="96" height="40" class="cap-img" @click="genCaptcha" title="点击刷新验证码"></canvas>
        </div>
      </div>

      <div class="row">
        <label class="rm"><input type="checkbox" v-model="form.remember" :disabled="locked" /> 记住我</label>
        <a class="fp" @click="onForget">忘记密码</a>
      </div>

      <button class="submit" :disabled="locked || loading" @click="onSubmit">
        {{ locked ? '已锁定 ' + remain + 's' : loading ? '登录中…' : '登 录' }}
      </button>

      <div class="divider"><span>或使用</span></div>
      <div class="sso">
        <button class="sso-btn" :disabled="locked" @click="ssoLogin('wecom')">政务微信登录</button>
        <button class="sso-btn" :disabled="locked" @click="ssoLogin('dingtalk')">钉钉登录</button>
      </div>

      <div class="tip">演示环境 · 默认密码 {{ DEMO_PASS }}（账号 admin01 / mgr_jy / mgr_zj）</div>
    </div>
    <div class="copy">© 德阳市民政局 · 数据仅限内部使用</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useToast } from '../composables/useToast.js'
import { useDataStore } from '../stores/data.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuth()
const dataStore = useDataStore()

const form = reactive({ acc: '', pwd: '', captcha: '', remember: true })
const showPwd = ref(false)
const loading = ref(false)
const error = ref('')
const failAttempts = ref(0)
const locked = ref(false)
const remain = ref(0)
const captcha = ref('')
const canvasRef = ref(null)
let timer = null

// 验证码出现时机遵循 G10 安全策略（默认失败≥2次或已锁定时出现；关闭验证码开关则不显示）
const showCaptcha = computed(() => {
  const cfg = dataStore.authConfig
  const enabled = cfg ? cfg.captchaEnabled !== false : true
  const thr = (cfg && cfg.captchaThreshold) || 2
  if (!enabled) return false
  return failAttempts.value >= thr || locked.value
})

function genCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  captcha.value = s
  drawCaptcha()
}

function drawCaptcha() {
  const cv = canvasRef.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.fillStyle = '#0f1b30'
  ctx.fillRect(0, 0, cv.width, cv.height)
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(0,240,255,${0.12 + Math.random() * 0.18})`
    ctx.beginPath()
    ctx.moveTo(Math.random() * cv.width, Math.random() * cv.height)
    ctx.lineTo(Math.random() * cv.width, Math.random() * cv.height)
    ctx.stroke()
  }
  const colors = ['#00f0ff', '#ffaa00', '#10b981', '#ff4d4d']
  for (let i = 0; i < captcha.value.length; i++) {
    ctx.save()
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = colors[i % 4]
    ctx.translate(16 + i * 20, 27)
    ctx.rotate((Math.random() - 0.5) * 0.45)
    ctx.fillText(captcha.value[i], -8, 0)
    ctx.restore()
  }
}

function startLock() {
  locked.value = true
  remain.value = auth.lockRemainSeconds(form.acc)
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    remain.value = auth.lockRemainSeconds(form.acc)
    if (remain.value <= 0) {
      locked.value = false
      failAttempts.value = 0
      error.value = ''
      clearInterval(timer)
      timer = null
      genCaptcha()
    }
  }, 1000)
}

function onSubmit() {
  if (loading.value || locked.value) return
  if (!form.acc || !form.pwd) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  const res = auth.login({
    acc: form.acc,
    pwd: form.pwd,
    remember: form.remember,
    expectedCaptcha: showCaptcha.value ? captcha.value : '',
    inputCaptcha: form.captcha
  })
  loading.value = false
  if (res.ok) {
    toast.success('登录成功')
    router.replace(route.query.redirect || '/admin')
  } else {
    error.value = res.msg
    if (res.code === 'locked') {
      startLock()
    } else {
      failAttempts.value++
      if (showCaptcha.value) genCaptcha()
    }
  }
}

// SSO 演示：直接以超级管理员身份登录（跳过验证码），真实环境应走 OAuth 回调
function ssoLogin() {
  if (locked.value) return
  const res = auth.login({ acc: 'admin01', pwd: auth.DEMO_PASS, remember: true })
  if (res.ok) {
    toast.success('单点登录成功')
    router.replace(route.query.redirect || '/admin')
  } else {
    error.value = res.msg
  }
}

function onForget() {
  toast.info('请联系系统管理员重置密码')
}

onMounted(() => {
  nextTick(() => genCaptcha())
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(1200px 600px at 50% -10%, rgba(0,102,255,.18), transparent), var(--c-bg, #0a1220); }
.login-card { width: 360px; max-width: 92vw; background: var(--c-panel, #0f1b30); border: 1px solid var(--c-line, rgba(255,255,255,.08));
  border-radius: 16px; padding: 30px 28px 24px; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
.logo { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700; color: #021; background: linear-gradient(180deg, #00f0ff, #0066ff); box-shadow: 0 0 18px rgba(0,240,255,.4); }
.bn { font-size: 17px; font-weight: 700; color: #fff; }
.bs { font-size: 12px; color: var(--c-muted, #8aa); margin-top: 2px; }
.err { background: rgba(255,77,77,.12); border: 1px solid rgba(255,77,77,.4); color: #ff8a8a;
  font-size: 13px; padding: 9px 12px; border-radius: 8px; margin-bottom: 14px; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 12px; color: var(--c-muted, #8aa); margin-bottom: 6px; }
.inp { width: 100%; height: 40px; padding: 0 12px; background: rgba(255,255,255,.04); border: 1px solid var(--c-line, rgba(255,255,255,.12));
  border-radius: 8px; color: var(--c-text, #e6f0ff); font-size: 14px; outline: none; transition: border-color .2s; box-sizing: border-box; }
.inp:focus { border-color: var(--c-primary, #00f0ff); box-shadow: 0 0 0 3px rgba(0,240,255,.12); }
.inp:disabled { opacity: .5; }
.pw { position: relative; }
.toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none;
  color: var(--c-muted, #8aa); font-size: 12px; cursor: pointer; }
.cap { display: flex; gap: 10px; }
.cap .inp { flex: 1; }
.cap-img { width: 96px; height: 40px; border-radius: 8px; border: 1px solid var(--c-line, rgba(255,255,255,.12)); cursor: pointer; flex-shrink: 0; }
.row { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 18px; }
.rm { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--c-text, #e6f0ff); cursor: pointer; }
.rm input { accent-color: var(--c-primary, #00f0ff); }
.fp { font-size: 13px; color: var(--c-primary, #00f0ff); cursor: pointer; }
.submit { width: 100%; height: 44px; border: none; border-radius: 9px; cursor: pointer; font-size: 15px; font-weight: 600;
  color: #021; background: linear-gradient(180deg, #00f0ff, #0066ff); box-shadow: 0 8px 24px rgba(0,102,255,.35); transition: transform .15s, filter .15s; }
.submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
.submit:disabled { opacity: .55; cursor: not-allowed; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--c-muted, #8aa); font-size: 12px; margin: 18px 0 12px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--c-line, rgba(255,255,255,.1)); }
.sso { display: flex; gap: 10px; }
.sso-btn { flex: 1; height: 38px; border: 1px solid var(--c-line, rgba(255,255,255,.14)); border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,.03); color: var(--c-text, #e6f0ff); font-size: 13px; transition: background .2s; }
.sso-btn:hover:not(:disabled) { background: rgba(0,240,255,.08); }
.sso-btn:disabled { opacity: .5; cursor: not-allowed; }
.tip { margin-top: 16px; font-size: 11px; color: var(--c-muted, #8aa); text-align: center; line-height: 1.6; }
.copy { margin-top: 22px; font-size: 11px; color: var(--c-muted, #8aa); }
</style>
