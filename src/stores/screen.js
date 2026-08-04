import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { api } from '../api/client.js'

// 大屏可视化配置 + 自定义点位 + 区县统计 —— 由后台管理，大屏实时读取
// 全部数据接入 SQLite 后端（server/index.js）；API 不可达时回退到本地默认值。
export const useScreenStore = defineStore('screen', () => {
  // ===== 默认值（API 不可用时的兜底）=====
  const DEFAULT_TITLE = '德阳市智慧养老数字驾驶舱'
  const DEFAULT_MODULES = { gov: true, institution: true, community: true, home: true }
  const DEFAULT_POINTS = [
    { id: 'P1', name: '旌阳区智慧养老服务中心', type: '养老机构', area: '旌阳区', lng: 104.4085, lat: 31.1734 },
    { id: 'P2', name: '中江县第二敬老院', type: '养老机构', area: '中江县', lng: 104.7985, lat: 30.8812 },
    { id: 'P3', name: '沱江社区长者食堂', type: '社区中心', area: '旌阳区', lng: 104.3896, lat: 31.1304 },
    { id: 'P4', name: '雒城街道助老服务站', type: '社区中心', area: '广汉市', lng: 104.2925, lat: 31.0008 },
    { id: 'P5', name: '绵竹市紫岩街道康养点', type: '养老机构', area: '绵竹市', lng: 104.1231, lat: 31.4314 }
  ]

  const title = ref(DEFAULT_TITLE)
  const modules = ref({ ...DEFAULT_MODULES })
  const mapMode = ref('3d')
  const ticker = ref(true)
  const theme = ref('dark')

  // 自定义地图点位（后台可视化配置管理，实时联动大屏）
  const points = reactive(DEFAULT_POINTS.map((p) => ({ ...p })))

  // 区县统计（elderly 万 / beds 万张）
  const districts = reactive([])

  let pseq = 5
  let ready = false // 初始加载完成前不回写配置，避免用默认值覆盖数据库

  // ===== 配置回写（监听任意变更，自动持久化到后端）=====
  function persistConfig() {
    if (!ready) return
    api.config.put({
      title: title.value,
      modules: modules.value,
      mapMode: mapMode.value,
      ticker: ticker.value,
      theme: theme.value
    }).catch((e) => console.warn('[screen] 配置保存失败（已保留本地）', e))
  }
  watch([title, modules, mapMode, ticker, theme], persistConfig, { deep: true })

  // ===== 初始化：从后端拉取配置 / 点位 / 区县 =====
  async function init() {
    try {
      const cfg = await api.config.get()
      title.value = cfg.title
      modules.value = cfg.modules
      mapMode.value = cfg.mapMode
      ticker.value = !!cfg.ticker
      theme.value = cfg.theme
    } catch (e) {
      console.warn('[screen] 读取配置失败，使用本地默认', e)
    }
    try {
      const ps = await api.points.list()
      points.splice(0, points.length, ...ps)
    } catch (e) {
      console.warn('[screen] 读取点位失败，使用本地默认', e)
    }
    try {
      const ds = await api.districts.list()
      districts.splice(0, districts.length, ...ds)
    } catch (e) {
      console.warn('[screen] 读取区县失败，使用本地默认', e)
    }
    ready = true
  }

  function setModule(key, val) { modules.value[key] = val }
  function setMapMode(m) { mapMode.value = m }

  function addPoint(row) {
    const id = 'P' + Date.now()
    const item = { id, ...row }
    points.push(item)
    api.points.create(item).catch((e) => console.warn('[screen] 点位保存失败（已保留本地）', e))
    return id
  }
  function removePoint(id) {
    const i = points.findIndex((p) => p.id === id)
    if (i > -1) points.splice(i, 1)
    api.points.remove(id).catch((e) => console.warn('[screen] 点位删除失败', e))
  }

  function setTheme(t) { theme.value = t }
  function reset() {
    title.value = DEFAULT_TITLE
    modules.value = { ...DEFAULT_MODULES }
    mapMode.value = '3d'; ticker.value = true; theme.value = 'dark'
  }

  return {
    title, modules, mapMode, ticker, theme, points, districts,
    init, addPoint, removePoint, setModule, setMapMode, setTheme, reset
  }
})
