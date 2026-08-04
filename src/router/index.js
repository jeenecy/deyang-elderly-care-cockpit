import { createRouter, createWebHashHistory } from 'vue-router'
import BigScreen from '../views/BigScreen.vue'
import LoginView from '../views/LoginView.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
import ProfileView from '../views/admin/ProfileView.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import { useAuth } from '../composables/useAuth.js'
import DataManage from '../views/admin/DataManage.vue'
import DataAccess from '../views/admin/DataAccess.vue'
import VisConfig from '../views/admin/VisConfig.vue'
import AlertCenter from '../views/admin/AlertCenter.vue'
import IotDevices from '../views/admin/IotDevices.vue'
import Permission from '../views/admin/Permission.vue'
import Content from '../views/admin/Content.vue'
import Audit from '../views/admin/Audit.vue'
import Monitor from '../views/admin/Monitor.vue'
import ScreenData from '../views/admin/ScreenData.vue'
import LoginLogs from '../views/admin/LoginLogs.vue'
import ElderManage from '../views/admin/ElderManage.vue'

const routes = [
  { path: '/', name: 'bigscreen', component: BigScreen, meta: { title: '驾驶舱大屏' } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录认证', public: true } },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    meta: { title: '后台管理', requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'admin-dashboard', component: Dashboard, meta: { title: '总览', icon: 'grid' } },
      { path: 'data-manage', name: 'admin-data-manage', component: DataManage, meta: { title: '业务数据管理', icon: 'database' } },
      { path: 'elder', name: 'admin-elder', component: ElderManage, meta: { title: '老人档案管理', icon: 'user' } },
      { path: 'data-access', name: 'admin-data-access', component: DataAccess, meta: { title: '数据接入与治理', icon: 'plug' } },
      { path: 'vis-config', name: 'admin-vis-config', component: VisConfig, meta: { title: '可视化配置', icon: 'sliders' } },
      { path: 'alert', name: 'admin-alert', component: AlertCenter, meta: { title: '告警预警中心', icon: 'bell' } },
      { path: 'iot', name: 'admin-iot', component: IotDevices, meta: { title: '物联设备管理', icon: 'cpu' } },
      { path: 'permission', name: 'admin-permission', component: Permission, meta: { title: '权限与组织', icon: 'shield' } },
      { path: 'content', name: 'admin-content', component: Content, meta: { title: '内容运营', icon: 'doc' } },
      { path: 'audit', name: 'admin-audit', component: Audit, meta: { title: '日志与审计', icon: 'list' } },
      { path: 'monitor', name: 'admin-monitor', component: Monitor, meta: { title: '监控与运维', icon: 'activity' } },
      { path: 'screen-data', name: 'admin-screen-data', component: ScreenData, meta: { title: '大屏板块数据', icon: 'layers' } },
      { path: 'login-logs', name: 'admin-login-logs', component: LoginLogs, meta: { title: '登录安全审计', icon: 'lock' } },
      { path: 'profile', name: 'admin-profile', component: ProfileView, meta: { title: '个人中心', icon: 'user' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  linkActiveClass: 'is-active'
})

// G01 路由守卫：保护 /admin 后台，未登录跳转登录页（带 redirect 回填）
router.beforeEach((to, from, next) => {
  const auth = useAuth()
  auth.initAuth() // 刷新后凭 token 恢复会话态
  if (to.meta.requiresAuth && !auth.isAuthed()) {
    next({ path: '/login', query: to.fullPath !== '/admin' ? { redirect: to.fullPath } : {} })
  } else if (to.path === '/login' && auth.isAuthed()) {
    next('/admin')
  } else {
    next()
  }
})

export default router
