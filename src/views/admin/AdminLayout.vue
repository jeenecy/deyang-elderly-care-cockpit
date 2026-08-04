<template>
  <div class="admin">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">养</div>
        <div class="brand-text">
          <div class="brand-name">德阳养老驾驶舱</div>
          <div class="brand-sub">后台管理系统</div>
        </div>
      </div>

      <nav class="menu">
        <div class="menu-group">业务中枢</div>
        <router-link v-for="m in groupBiz" :key="m.name" :to="{ name: m.name }" class="menu-item">
          <IconSvg :name="m.icon" />
          <span>{{ m.title }}</span>
        </router-link>

        <div class="menu-group">系统管理</div>
        <router-link v-for="m in groupSys" :key="m.name" :to="{ name: m.name }" class="menu-item">
          <IconSvg :name="m.icon" />
          <span>{{ m.title }}</span>
        </router-link>
      </nav>

      <div class="side-foot">
        <div class="dot-live"></div> 系统运行正常
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="crumb">
          <IconSvg name="grid" />
          <span>后台管理</span>
          <span class="sep">/</span>
          <span class="cur">{{ currentTitle }}</span>
        </div>
        <div class="top-actions">
          <span class="env-tag">生产环境</span>
          <router-link to="/" class="a-btn">
            <IconSvg name="back" /> 返回大屏
          </router-link>
          <div class="user" v-if="cu" ref="userRef">
            <div class="user-trigger" :class="{ open: showMenu }" @click="toggleMenu">
              <div class="avatar">{{ cuInitial }}</div>
              <div class="user-meta">
                <div class="uname">{{ cu.name }}</div>
                <div class="urole">{{ cu.role }}</div>
              </div>
              <IconSvg name="down" class="caret" />
            </div>
            <div class="dd" v-if="showMenu">
              <div class="dd-head">
                <div class="avatar sm">{{ cuInitial }}</div>
                <div class="dd-id">
                  <div class="dd-name">{{ cu.name }}</div>
                  <div class="dd-role">{{ cu.role }}</div>
                </div>
              </div>
              <div class="dd-item" @click="goProfile">
                <IconSvg name="user" /> 个人中心
              </div>
              <div class="dd-item danger" @click="onLogout">
                <IconSvg name="logout" /> 退出登录
              </div>
            </div>
            <div class="dd-mask" v-if="showMenu" @click="showMenu = false"></div>
          </div>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
    <ToastHost />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconSvg from './IconSvg.vue'
import ToastHost from './ToastHost.vue'
import { useScreenStore } from '../../stores/screen.js'
import { useDataStore } from '../../stores/data.js'
import { useAuth } from '../../composables/useAuth.js'
import { useToast } from '../../composables/useToast.js'

const route = useRoute()
const router = useRouter()
const currentTitle = computed(() => route.meta.title || '总览')

// G01 顶栏绑定真实登录用户
const dataStore = useDataStore()
const auth = useAuth()
const toast = useToast()
const cu = computed(() => dataStore.currentUser)
const cuInitial = computed(() => (cu.value?.name || '?').slice(0, 1))

function onLogout() {
  auth.logout()
  toast.success('已退出登录')
  router.replace('/login')
}

// G02 顶栏头像下拉：个人中心入口 + 退出登录
const showMenu = ref(false)
function toggleMenu() { showMenu.value = !showMenu.value }
function goProfile() { showMenu.value = false; router.push('/admin/profile') }

// 后台挂载即接入数据库：拉取配置/点位/区县 与 全部业务实体
const screenStore = useScreenStore()
onMounted(() => {
  screenStore.init().catch(() => {})
  dataStore.loadAll().catch(() => {})
})

const menu = [
  { name: 'admin-dashboard', title: '总览', icon: 'grid', group: 'biz' },
  { name: 'admin-data-manage', title: '业务数据管理', icon: 'database', group: 'biz' },
  { name: 'admin-elder', title: '老人档案管理', icon: 'user', group: 'biz' },
  { name: 'admin-data-access', title: '数据接入与治理', icon: 'plug', group: 'biz' },
  { name: 'admin-alert', title: '告警预警中心', icon: 'bell', group: 'biz' },
  { name: 'admin-iot', title: '物联设备管理', icon: 'cpu', group: 'biz' },
  { name: 'admin-vis-config', title: '可视化配置', icon: 'sliders', group: 'sys' },
  { name: 'admin-permission', title: '权限与组织', icon: 'shield', group: 'sys' },
  { name: 'admin-content', title: '内容运营', icon: 'doc', group: 'sys' },
  { name: 'admin-audit', title: '日志与审计', icon: 'list', group: 'sys' },
  { name: 'admin-login-logs', title: '登录安全审计', icon: 'lock', group: 'sys' },
  { name: 'admin-monitor', title: '监控与运维', icon: 'activity', group: 'sys' },
  { name: 'admin-screen-data', title: '大屏板块数据', icon: 'layers', group: 'biz' }
]
const groupBiz = menu.filter(m => m.group === 'biz')
const groupSys = menu.filter(m => m.group === 'sys')
</script>

<style scoped>
.admin { display: flex; height: 100%; background: var(--c-bg); }
.sidebar { width: 232px; flex-shrink: 0; background: linear-gradient(180deg, #0b1330, #0a1020);
  border-right: 1px solid var(--c-line); display: flex; flex-direction: column; padding: 18px 14px; }
.brand { display: flex; align-items: center; gap: 12px; padding: 4px 6px 18px; }
.logo { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: #021; background: linear-gradient(180deg, #00f0ff, #0066ff);
  box-shadow: 0 0 18px rgba(0,240,255,.4); }
.brand-name { font-size: 16px; font-weight: 700; color: #fff; }
.brand-sub { font-size: 12px; color: var(--c-muted); }
.menu { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.menu-group { font-size: 11px; color: var(--c-muted); letter-spacing: 1px; padding: 14px 10px 6px; }
.menu-item { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 9px;
  color: var(--c-muted); font-size: 14px; transition: all .2s; border: 1px solid transparent; }
.menu-item:hover { color: var(--c-text); background: rgba(0,240,255,.06); }
.menu-item.is-active { color: #fff; background: rgba(0,102,255,.18); border-color: var(--c-line2);
  box-shadow: inset 3px 0 0 var(--c-primary); }
.menu-item.is-active svg { color: var(--c-primary); }
.side-foot { padding: 12px 10px 4px; font-size: 12px; color: var(--c-muted); display: flex; align-items: center; gap: 8px; }
.dot-live { width: 8px; height: 8px; border-radius: 50%; background: var(--c-accent); box-shadow: 0 0 10px var(--c-accent); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar { height: 62px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; border-bottom: 1px solid var(--c-line); background: rgba(11,19,48,.6); }
.crumb { display: flex; align-items: center; gap: 9px; color: var(--c-muted); font-size: 14px; }
.crumb svg { width: 18px; height: 18px; color: var(--c-primary); }
.crumb .sep { opacity: .5; }
.crumb .cur { color: #fff; font-weight: 600; }
.top-actions { display: flex; align-items: center; gap: 14px; }
.env-tag { font-size: 12px; color: var(--c-accent); border: 1px solid rgba(0,255,204,.3); background: rgba(0,255,204,.1); padding: 4px 10px; border-radius: 6px; }
.a-btn svg { width: 16px; height: 16px; }
.user { position: relative; display: flex; align-items: center; gap: 10px; padding-left: 14px; border-left: 1px solid var(--c-line); }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(180deg, #0066ff, #00f0ff);
  display: flex; align-items: center; justify-content: center; color: #021; font-weight: 700; flex-shrink: 0; }
.avatar.sm { width: 34px; height: 34px; font-size: 14px; }
.user-meta .uname { font-size: 13px; color: #fff; }
.user-meta .urole { font-size: 11px; color: var(--c-muted); }
.user-trigger { display: flex; align-items: center; gap: 9px; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: background .2s; }
.user-trigger:hover { background: rgba(0,240,255,.06); }
.caret { width: 14px; height: 14px; color: var(--c-muted); transition: transform .2s; }
.user-trigger.open .caret { transform: rotate(180deg); }
.dd { position: absolute; top: calc(100% + 10px); right: 0; width: 208px; background: var(--c-panel, #0f1b30);
  border: 1px solid var(--c-line); border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.5); padding: 8px; z-index: 60; }
.dd-head { display: flex; align-items: center; gap: 10px; padding: 8px 8px 12px; border-bottom: 1px solid var(--c-line); margin-bottom: 6px; }
.dd-id .dd-name { font-size: 13px; color: #fff; font-weight: 600; }
.dd-id .dd-role { font-size: 11px; color: var(--c-primary); }
.dd-item { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 8px; font-size: 13px; color: var(--c-text); cursor: pointer; transition: all .15s; }
.dd-item svg { width: 16px; height: 16px; color: var(--c-muted); }
.dd-item:hover { background: rgba(0,240,255,.08); color: #fff; }
.dd-item:hover svg { color: var(--c-primary); }
.dd-item.danger:hover { background: rgba(255,77,77,.12); color: #ff8a8a; }
.dd-item.danger:hover svg { color: #ff8a8a; }
.dd-mask { position: fixed; inset: 0; z-index: 55; }
.content { flex: 1; overflow-y: auto; padding: 22px 24px; }
</style>
