// 登录认证逻辑（G01）——前端实现：token 签发/校验、失败计数、账号锁定、session 恢复
// 说明：当前后端为 records JSON 存储，无独立鉴权服务；登录在校验 users 实体（账号/密码/启用态）后
// 由前端签发模拟 JWT（base64 载荷），后续接入真实后端时仅需替换 login 内部校验与 token 来源。
import { useDataStore } from '../stores/data.js'

const TOKEN_KEY = 'dy_auth_token'
const FAIL_KEY = 'dy_auth_fail_' // 按账号累计失败次数
const LOCK_KEY = 'dy_auth_lock_' // 按账号锁定到期时间戳
const DEMO_PASS = '123456' // 演示默认密码（登录页明示）
const MAX_FAIL = 5 // 连续失败阈值
const LOCK_MIN = 30 // 锁定分钟数
const TOKEN_TTL = 2 * 60 * 60 * 1000 // token 有效期 2h

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)))
}
function b64decode(str) {
  return decodeURIComponent(escape(atob(str)))
}

function genToken(u) {
  const payload = {
    uid: u.id,
    acc: u.acc,
    name: u.name,
    role: u.role,
    exp: Date.now() + TOKEN_TTL
  }
  return b64encode(JSON.stringify(payload))
}

function readRaw() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
}

function decodeToken(token) {
  try {
    const obj = JSON.parse(b64decode(token))
    if (!obj || !obj.exp) return null
    return obj
  } catch (e) {
    return null
  }
}

// 是否已登录且 token 未过期
export function isAuthed() {
  const t = readRaw()
  if (!t) return false
  const d = decodeToken(t)
  return !!d && d.exp > Date.now()
}

function saveToken(token, remember) {
  // 双存储清理，避免记住我切换后残留
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  if (remember) localStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

function getLock(acc) {
  try {
    const raw = localStorage.getItem(LOCK_KEY + acc)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function bumpFail(acc, maxFail, lockMin) {
  const n = (parseInt(localStorage.getItem(FAIL_KEY + acc) || '0', 10)) + 1
  localStorage.setItem(FAIL_KEY + acc, String(n))
  if (n >= maxFail) {
    localStorage.setItem(LOCK_KEY + acc, JSON.stringify({ until: Date.now() + lockMin * 60000 }))
    return { locked: true }
  }
  return { locked: false, count: n }
}

function resetFail(acc) {
  localStorage.removeItem(FAIL_KEY + acc)
  localStorage.removeItem(LOCK_KEY + acc)
}

export function useAuth() {
  const dataStore = useDataStore()

  // 应用启动恢复会话：刷新页面后凭 token 重建 currentUser，无需等待 users 异步加载
  function initAuth() {
    const t = readRaw()
    if (!t) return false
    const d = decodeToken(t)
    if (!d || d.exp < Date.now()) {
      clearToken()
      dataStore.currentUser = null
      return false
    }
    dataStore.currentUser = { id: d.uid, acc: d.acc, name: d.name, role: d.role }
    return true
  }

  // 记录登录事件（成功/失败/锁定），供 G02 个人中心与 G10 安全审计使用
  function recordLogin(result, account, userId, failReason) {
    dataStore.logLogin({
      userId: userId || '',
      username: account || '',
      ip: '192.168.1.' + (10 + Math.floor(Math.random() * 200)),
      device: (navigator.userAgent || 'unknown').slice(0, 42),
      location: '德阳市',
      result,
      failReason: failReason || ''
    })
  }

  // 主登录流程
  function login({ acc, pwd, remember, expectedCaptcha, inputCaptcha }) {
    acc = (acc || '').trim()
    pwd = pwd || ''

    // 安全策略（G10 可配置，缺失时回退常量）
    const cfg = dataStore.authConfig || {}
    const maxFail = cfg.maxFail || MAX_FAIL
    const lockMin = cfg.lockMinutes || LOCK_MIN

    // 1) 锁定检查（优先于一切）
    const lock = getLock(acc)
    if (lock && lock.until > Date.now()) {
      const mins = Math.max(1, Math.ceil((lock.until - Date.now()) / 60000))
      recordLogin('locked', acc, '', '账号已锁定')
      return { ok: false, code: 'locked', msg: `账号已锁定，请 ${mins} 分钟后再试` }
    }

    // 2) 验证码校验（启用时）
    if (expectedCaptcha && inputCaptcha && expectedCaptcha.toUpperCase() !== inputCaptcha.toUpperCase()) {
      recordLogin('fail', acc, '', '验证码错误')
      return { ok: false, code: 'captcha', msg: '验证码错误' }
    }

    // 3) 账号查找与状态
    const u = dataStore.users.find((x) => x.acc === acc)
    if (!u) {
      bumpFail(acc, maxFail, lockMin)
      recordLogin('fail', acc, '', '账号不存在')
      return { ok: false, code: 'acc', msg: '账号不存在' }
    }
    if (u.on === false) {
      recordLogin('fail', u.acc, u.id, '账号已禁用')
      return { ok: false, code: 'disabled', msg: '该账号已被禁用，请联系管理员' }
    }

    // 4) 密码校验（后端有 password 则严格比对，否则回退演示密码）
    const passOk = u.password ? u.password === pwd : pwd === DEMO_PASS
    if (!passOk) {
      const r = bumpFail(acc, maxFail, lockMin)
      if (r.locked) {
        recordLogin('locked', u.acc, u.id, '密码错误次数过多')
        return { ok: false, code: 'locked', msg: `密码错误次数过多，已锁定 ${lockMin} 分钟` }
      }
      const left = maxFail - r.count
      recordLogin('fail', u.acc, u.id, '密码错误')
      return { ok: false, code: 'pwd', msg: `密码错误，还可尝试 ${left} 次` }
    }

    // 5) 成功：重置失败计数、签发 token、写入当前用户
    resetFail(acc)
    const token = genToken(u)
    saveToken(token, remember)
    dataStore.currentUser = { id: u.id, acc: u.acc, name: u.name, role: u.role }
    recordLogin('success', u.acc, u.id)
    return { ok: true }
  }

  // 登出
  function logout() {
    clearToken()
    dataStore.currentUser = null
  }

  // 当前剩余锁定秒数（供登录页倒计时）
  function lockRemainSeconds(acc) {
    const lock = getLock(acc)
    if (!lock) return 0
    const s = Math.ceil((lock.until - Date.now()) / 1000)
    return s > 0 ? s : 0
  }

  return { login, logout, initAuth, isAuthed, lockRemainSeconds, DEMO_PASS, MAX_FAIL }
}
