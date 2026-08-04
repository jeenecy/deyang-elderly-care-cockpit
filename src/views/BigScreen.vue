<template>
  <div class="screen" ref="screenRef">
    <!-- 动态背景层 -->
    <div class="bg-layer">
      <div class="bg-grid"></div>
      <div class="bg-radial"></div>
      <div class="bg-scan"></div>
      <div class="bg-light left"></div>
      <div class="bg-light right"></div>
    </div>

    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <svg class="logo-svg" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M14 28c0-6 5-11 10-11s10 5 10 11" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="24" cy="18" r="4" fill="currentColor"/>
            <path d="M18 34h12M20 30h8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="title-group">
          <h1 class="main-title">{{ store.title }}</h1>
          <div class="sub-title">DEYANG SMART ELDERLY CARE COMMAND CENTER</div>
        </div>
      </div>

      <nav class="header-nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: item.key === activeTab }"
          @click="activeTab = item.key"
        >
          <span class="nav-glow"></span>
          <span class="nav-text">{{ item.label }}</span>
        </div>
      </nav>

      <div class="header-right">
        <div class="weather-info">
          <svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12"/></svg>
          <span>多云 26°C</span>
        </div>
        <div class="clock-box">
          <span id="clock">--</span>
        </div>
        <router-link to="/admin" class="admin-entry">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-7.35 16.78 1 1 0 0 0 .74.33h13.22a1 1 0 0 0 .74-.33A10 10 0 0 0 12 2zm0 2a8 8 0 0 1 6.27 12.96H5.73A8 8 0 0 1 12 4z"/><circle cx="12" cy="10" r="3"/></svg>
          后台管理
        </router-link>
      </div>
    </header>

    <!-- 滚动播报 -->
    <div class="ticker" v-show="store.ticker">
      <div class="ticker-icon">
        <svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-7.35 16.78 1 1 0 0 0 .74.33h13.22a1 1 0 0 0 .74-.33A10 10 0 0 0 12 2zm0 2a8 8 0 0 1 6.27 12.96H5.73A8 8 0 0 1 12 4z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="ticker-label">实时播报</div>
      <div class="ticker-content"><span id="tickerText">{{ currentTicker }}</span></div>
    </div>

    <!-- 主体内容 -->
    <main class="main-layout">
      <!-- 左侧栏目：核心指标维度（KPI 卡 + 趋势/对比图表块） -->
      <aside class="left-column">
        <!-- 核心指标卡 -->
        <div class="panel panel-kpi">
          <div class="panel-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
            <div class="panel-glow"></div>
          </div>
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-icon" :style="iconStyle">
                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 13h4l2 5 4-12 2 7h6"/></svg>
              </span>
              <span class="title-text">{{ view.name }} · 核心指标</span>
            </div>
            <span class="more-link"><i class="live-dot"></i>实时</span>
          </div>
          <div class="panel-body">
            <div class="kpi-row" :class="view.kpis.length > 3 ? 'two-rows' : ''">
              <div class="kpi-mini" v-for="k in view.kpis" :key="'kpi-'+activeTab+'-'+k.label"
                   :style="{ '--kc': view.color }">
                <div class="kpi-head">
                  <span class="kpi-desc">{{ k.label }}</span>
                  <span class="kpi-trend" :class="k.trend >= 0 ? 'up' : 'down'">
                    {{ k.trend >= 0 ? '▲' : '▼' }}{{ Math.abs(k.trend) }}%
                  </span>
                </div>
                <div class="kpi-num"><span :data-target="k.value">0</span><em>{{ k.unit }}</em></div>
                <div class="kpi-spark"><i v-for="(sv, si) in (k.spark || [])" :key="si" :style="{ height: sv + '%' }"></i></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 核心指标维度图表块 -->
        <div class="panel" v-for="(b, bi) in view.left" :key="'L' + bi">
          <div class="panel-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          </div>
          <div class="panel-header slim">
            <div class="panel-title">
              <span class="bar-mark" :style="{ background: view.color }"></span>
              <span class="title-text sm">{{ b.title }}</span>
            </div>
            <span class="chip">{{ typeLabel(b.type) }}<em v-if="b.unit"> · {{ b.unit }}</em></span>
          </div>
          <div class="panel-body tight">
            <div class="chart-wrap">
              <div class="chart-box" :ref="el => setChartEl('left', bi, el)"></div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中间地图 -->
      <section class="center-column">
        <div class="map-card">
          <div class="map-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          </div>
          <div class="map-header">
            <div class="map-title">德阳市全域养老态势感知</div>
            <div class="map-subtitle">REAL-TIME ELDERLY CARE SITUATION AWARENESS</div>
          </div>

          <div class="map-toolbar">
            <transition name="fade">
              <div v-if="drillDistrict" class="tool-btn back" @click="returnToCity">← 市级</div>
            </transition>
            <div class="tool-btn" :class="{ active: store.mapMode === '2d' }" @click="store.setMapMode('2d')">2D</div>
            <div class="tool-btn" :class="{ active: store.mapMode === '3d' }" @click="store.setMapMode('3d')">3D</div>
          </div>

          <div class="map-hint"><i></i>{{ drillDistrict ? '已下钻至 ' + drillDistrict + ' · 点击点位查看详情' : (activeTab === 'overview' ? '告警红点标记风险区县 · 点击红点进入该区县' : '点击区县轮廓进入详情 · 点击点位查看详情') }}</div>

          <div id="mapChart"></div>
          <div id="mapCanvas" class="map-canvas"></div>
          <div id="mapTip" class="map-tip" v-show="tip.show" :style="tipStyle">{{ tip.text }}</div>

          <!-- 地图装饰 -->
          <div class="map-decor">
            <div class="map-glow-edge"></div>
            <div class="map-ring ring-1"></div>
            <div class="map-ring ring-2"></div>
            <div class="map-ring ring-3"></div>
            <div class="map-radar"></div>
            <div class="map-crosshair">
              <span></span><span></span><span></span><span></span>
            </div>
            <div class="map-pulse-center"></div>
            <div class="map-scan-h"></div>
          </div>

          <!-- 告警浮窗 -->
          <div class="alert-float">
            <div class="alert-pulse"></div>
            <svg class="icon-svg" viewBox="0 0 24 24"><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span>中江县仓山镇 1 户独居老人烟感告警，已 dispatch</span>
          </div>

          <!-- 图例 -->
          <div class="map-legend" v-show="!drillDistrict">
            <div class="legend-item" v-for="lg in legendItems" :key="lg.key"><i class="dot" :class="lg.cls"></i>{{ lg.label }}</div>
          </div>

          <!-- 区县下钻轮廓板块 -->
          <transition name="dp-slide">
            <div v-if="drillDistrict && districtOutline" class="district-panel">
              <div class="dp-head">
                <div class="dp-crumb"><span>德阳市</span><i>/</i><b>{{ drillDistrict }}</b></div>
                <button class="dp-back" @click="returnToCity">返回市级</button>
              </div>
              <div class="dp-outline">
                <svg viewBox="0 0 100 100" class="dp-svg" preserveAspectRatio="xMidYMid meet">
                  <path :d="districtOutline.d" class="dp-path" fill-rule="evenodd"/>
                  <circle v-for="(p,i) in districtOutline.pts" :key="i" :cx="p.x" :cy="p.y" r="2.1" :fill="p.color" class="dp-dot"/>
                </svg>
                <div class="dp-outline-tip">{{ districtPoints.length }} 个{{ catName(activeCat) }}点位</div>
              </div>
              <div class="dp-stats" v-if="drillStats">
                <div class="dp-stat"><span>老年人口</span><b>{{ drillStats.elderly }} 万</b></div>
                <div class="dp-stat"><span>养老床位</span><b>{{ drillStats.beds }} 万张</b></div>
                <div class="dp-stat"><span>千名老人床位</span><b>{{ Math.round(drillStats.beds / drillStats.elderly * 1000) }} 张</b></div>
              </div>
              <div class="dp-list-head">区内点位（点击查看详情）</div>
              <div class="dp-list">
                <div v-for="(p,i) in districtPoints" :key="i" class="dp-point" @click="selectPoint(p)">
                  <i class="dp-pdot" :style="{ background: p.color }"></i>
                  <span class="dp-pname">{{ p.name }}</span>
                  <span class="dp-pcat" :style="{ color: p.color }">{{ catName(p.cat) }}</span>
                </div>
                <div v-if="!districtPoints.length" class="dp-empty">该区县暂无点位数据</div>
              </div>
            </div>
          </transition>
        </div>
      </section>

      <!-- 右侧栏目：细分指标（构成 / 排名 / 能力评估） -->
      <aside class="right-column">
        <div class="col-caption">
          <span class="title-icon sm" :style="iconStyle">
            <svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </span>
          <span>{{ view.name }} · 细分指标</span>
          <i class="cap-line"></i>
        </div>
        <div class="panel" v-for="(b, bi) in view.right" :key="'R' + bi">
          <div class="panel-frame">
            <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
          </div>
          <div class="panel-header slim">
            <div class="panel-title">
              <span class="bar-mark" :style="{ background: view.color }"></span>
              <span class="title-text sm">{{ b.title }}</span>
            </div>
            <span class="chip">{{ typeLabel(b.type) }}<em v-if="b.unit"> · {{ b.unit }}</em></span>
          </div>
          <div class="panel-body tight">
            <div class="chart-wrap">
              <div class="chart-box" :ref="el => setChartEl('right', bi, el)"></div>
            </div>
          </div>
        </div>
      </aside>
    </main>

    <!-- 底部 KPI -->
    <footer class="bottom-bar">
      <div class="bottom-card" v-for="(k, i) in bottomKpis" :key="i">
        <div class="bottom-glow"></div>
        <div class="bottom-icon" :style="{ '--c': k.color }">
          <svg class="icon-svg" viewBox="0 0 24 24" v-html="k.icon"></svg>
        </div>
        <div class="bottom-info">
          <div class="bottom-value"><span :data-target="k.value">{{ k.value }}</span><em>{{ k.unit }}</em></div>
          <div class="bottom-label">{{ k.label }}</div>
        </div>
        <div class="bottom-trend" :class="k.trend > 0 ? 'up' : 'down'">{{ k.trend > 0 ? '↑' : '↓' }} {{ Math.abs(k.trend) }}%</div>
      </div>
    </footer>

  <!-- 点位详情弹窗 -->
  <transition name="detail-fade">
    <div v-if="showDetail" class="detail-mask" @click.self="closeDetail">
      <div class="detail-card" :style="{ '--dcolor': (selectedPoint && selectedPoint.color) || '#00f0ff' }">
        <button class="detail-close" @click="closeDetail" aria-label="关闭">×</button>
        <div class="detail-head">
          <span class="detail-cat"><i class="d-dot"></i>{{ selectedPoint && selectedPoint.categoryLabel }}</span>
          <h3 class="detail-name">{{ selectedPoint && selectedPoint.name }}</h3>
        </div>
        <div class="detail-body">
          <div class="detail-row" v-for="(r, i) in (selectedPoint && selectedPoint.rows) || []" :key="i">
            <span class="detail-k">{{ r.label }}</span>
            <span class="detail-v" :class="{ hot: r.hot }">{{ r.value }}</span>
          </div>
          <div class="detail-desc" v-if="selectedPoint && selectedPoint.desc">{{ selectedPoint.desc }}</div>
        </div>
        <div class="detail-foot">数据来源 · 德阳市智慧养老服务平台</div>
      </div>
    </div>
  </transition>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, computed, nextTick, reactive } from 'vue'
import * as echarts from 'echarts'
import deyangGeo from '../data/deyangGeo.js'
import { Map3DEngine } from '../utils/map3dThree.js'
import { Map3DEngine as CanvasMap3D } from '../utils/map3dEngine.js'
import { useScreenStore } from '../stores/screen.js'
import { useSectionsStore } from '../stores/sections.js'
import { useDataStore } from '../stores/data.js'

const store = useScreenStore()
const secStore = useSectionsStore()
const dataStore = useDataStore()
// 综合概览 / 四板块：当前展示视图（驱动左右图表与 KPI）
const view = computed(() => activeTab.value === 'overview' ? secStore.overview : secStore[activeTab.value])
const PALETTE = ['#00f0ff', '#ffaa00', '#00c8ff', '#b388ff', '#36e0a0', '#ff4d4d']
// 左右栏目图表块：DOM 宿主与 echarts 实例（按 side + 下标索引）
const chartEls = { left: [], right: [] }
const chartInsts = { left: [], right: [] }
function setChartEl(side, idx, el) { if (el) chartEls[side][idx] = el }
const TYPE_LABEL = { line: '趋势', bar: '对比', stack: '结构', hbar: '排名', ring: '占比', pie: '占比', radar: '评估', gauge: '达成' }
function typeLabel(t) { return TYPE_LABEL[t] || '图表' }
const iconStyle = computed(() => {
  const c = (view.value && view.value.color) || '#00f0ff'
  return { color: c, background: hexA(c, 0.14), borderColor: hexA(c, 0.32) }
})
const screenRef = ref(null)
let mapChart = null
let engine3d = null
const tip = ref({ show: false, text: '', x: 0, y: 0, color: '#00f0ff' })
const tipStyle = computed(() => ({ left: tip.value.x + 'px', top: tip.value.y + 'px', '--tc': tip.value.color }))
const timers = []
const activeTab = ref('overview')
const currentTicker = ref('旌阳区智慧养老服务中心收到紧急呼叫，已派单处理 | 绵竹市第三敬老院完成今日食品安全巡检 | 广汉市居家养老上门服务今日已完成 86 单')

// 点位详情弹窗
const showDetail = ref(false)
const selectedPoint = ref(null)
function closeDetail() { showDetail.value = false; selectedPoint.value = null }
function coordStr(v) {
  if (!v || !v.length) return '--'
  const [lng, lat] = v
  return `${Number(lng).toFixed(4)}, ${Number(lat).toFixed(4)}`
}
function openDistrict(nm) {
  const d = districtDetail(nm)
  if (d) { selectedPoint.value = d; showDetail.value = true }
}
// 按点位名称反查详情（兼容 2D/3D 数据形态差异，兜底点击）
function findDetail(name) {
  for (const arr of [governmentData, realInstitutionData.value, medicalData.value, communityData, homeData, alarmData.value, customPointData2D.value]) {
    const f = arr.find(d => d.name === name)
    if (f && f.detail) return f.detail
  }
  return null
}
function onMapClick(params) {
  const nm = params.name
  // 1) 点位直接携带 detail（2D 与修正后的 3D 均生效）
  if (params.componentType === 'series' && params.data && params.data.detail) {
    const detail = params.data.detail
    selectedPoint.value = { ...detail, rows: [...detail.rows, { label: '经纬度', value: coordStr(params.value) }] }
    showDetail.value = true
    return
  }
  // 2) 按名称反查点位（兜底：3D scatter3D 数据形态差异时仍可触发）
  if (nm) {
    const d = findDetail(nm)
    if (d) {
      selectedPoint.value = { ...d, rows: [...d.rows, { label: '经纬度', value: coordStr(params.value) }] }
      showDetail.value = true
      return
    }
  }
  // 3.5) 点击告警聚合红点（示意）→ 下钻到对应区县查看处置详情
  if (params.data && params.data.district && params.data.count != null) {
    onDistrict(params.data.district)
    return
  }
  // 3) 点击区县区域（2D geo 或 3D geo3D）或区县标签 → 下钻到区县轮廓板块
  if ((params.componentType === 'geo' || params.componentType === 'geo3D') && nm && regionCenter[nm]) {
    onDistrict(nm)
    return
  }
  if (nm && regionCenter[nm]) onDistrict(nm)
}
function onKey(e) { if (e.key === 'Escape') closeDetail() }

const legendItems = computed(() => {
  const tab = activeTab.value
  if (tab === 'gov') return [{ key: 'gov', label: '公立医疗机构', cls: 'gov' }]
  if (tab === 'institution') return [{ key: 'org', label: '养老机构', cls: 'org' }]
  if (tab === 'community') return [{ key: 'com', label: '社区卫生服务中心', cls: 'com' }]
  if (tab === 'home') return [{ key: 'home', label: '居家老人家庭', cls: 'home' }]
  if (tab === 'medical') return [{ key: 'med', label: '医疗机构', cls: 'med' }]
  if (tab === 'elder') return [{ key: 'elder', label: '关怀对象', cls: 'elder' }]
  return [{ key: 'alarm', label: '实时告警', cls: 'alarm' }]
})

const panelActive = (key) => activeTab.value === 'overview' || activeTab.value === key

const navItems = [
  { key: 'overview', label: '综合总览' },
  { key: 'gov', label: '政府监管' },
  { key: 'medical', label: '医疗机构' },
  { key: 'institution', label: '机构养老' },
  { key: 'community', label: '社区养老' },
  { key: 'home', label: '居家养老' },
  { key: 'elder', label: '关怀对象' }
]

const govList = [
  { name: '本月监督检查', value: '128 次', percent: 85 },
  { name: '问题整改率', value: '96.8%', percent: 96.8 },
  { name: '补贴发放总额', value: '2,860 万', percent: 72 }
]

const bottomKpis = [
  { label: '安全巡防点', value: 18, unit: '个', trend: 5.2, color: '#00f0ff', icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3m0 14v3M3 12h3m14 0h3"/>' },
  { label: '今日巡检次数', value: 58, unit: '次', trend: 12.3, color: '#00ffcc', icon: '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>' },
  { label: '消防报警', value: 3, unit: '起', trend: -8.5, color: '#ff4d4d', icon: '<path d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 3 3-1-3 0-5 0-8z"/>' },
  { label: '食品留样', value: 222, unit: '份', trend: 3.1, color: '#ffaa00', icon: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M7 7c0-2 1-3 2-3M12 6c0-2 1-3 2-3"/>' },
  { label: '紧急呼叫响应', value: 47, unit: '次', trend: 6.7, color: '#00f0ff', icon: '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2 16 16 0 0 1-16-16 2 2 0 0 1 2-2z"/>' },
  { label: '服务满意度', value: 98.6, unit: '%', trend: 1.2, color: '#00ffcc', icon: '<circle cx="12" cy="12" r="9"/><path d="M8 14a5 5 0 0 0 8 0"/><circle cx="9" cy="10" r=".6"/><circle cx="15" cy="10" r=".6"/>' }
]

const districtStats = reactive({
  '旌阳区': { elderly: 12.6, beds: 1.8 },
  '罗江区': { elderly: 4.2, beds: 0.6 },
  '中江县': { elderly: 18.3, beds: 1.2 },
  '广汉市': { elderly: 9.1, beds: 1.1 },
  '什邡市': { elderly: 5.4, beds: 0.7 },
  '绵竹市': { elderly: 6.8, beds: 0.9 }
})

// 从 GeoJSON 真实多边形取各区县质心，保证点位/标签精确落在对应板块上
const regionCenter = {}
;(deyangGeo.features || []).forEach(f => {
  const nm = f.properties && f.properties.name
  const c = f.properties && (f.properties.centroid || f.properties.center)
  if (nm && Array.isArray(c) && c.length === 2) regionCenter[nm] = c
})
// 兜底：若 GeoJSON 缺少质心则用当前手写值
const fallbackCenter = {
  '旌阳区': [104.408535, 31.173427],
  '罗江区': [104.528135, 31.314709],
  '中江县': [104.798508, 30.881207],
  '广汉市': [104.292504, 31.000835],
  '什邡市': [104.020238, 31.273093],
  '绵竹市': [104.123167, 31.431471]
}
Object.keys(fallbackCenter).forEach(n => { if (!regionCenter[n]) regionCenter[n] = fallbackCenter[n] })
// 区县标签改由 ECharts geo 坐标渲染（自动贴合，缩放/平移跟手）

const maxElderly = computed(() => {
  const v = Object.values(districtStats).map(d => d && d.elderly)
  const nums = v.filter(x => typeof x === 'number')
  return nums.length ? Math.max(...nums) : 0
})
// 地图配色：亮青科技风（参考图：亮青主体 + 白边辉光）
function lerpColor(t) {
  const low = [4, 90, 95], high = [10, 190, 175]
  const c = low.map((v, i) => Math.round(v + (high[i] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const geoRegions = computed(() => Object.entries(districtStats).map(([n, d]) => ({
  name: n,
  itemStyle: {
    areaColor: {
      type: 'radial', x: 0.5, y: 0.4, r: 0.9,
      colorStops: [
        { offset: 0, color: 'rgba(20, 220, 190, 0.55)' },
        { offset: 0.55, color: lerpColor(d.elderly / maxElderly.value) },
        { offset: 1, color: 'rgba(2, 60, 72, 0.85)' }
      ]
    },
    borderColor: 'rgba(190, 255, 245, 0.85)',
    borderWidth: 1.4,
    shadowColor: 'rgba(0, 240, 210, 0.45)',
    shadowBlur: 22,
    shadowOffsetY: 8
  },
  emphasis: {
    itemStyle: {
      areaColor: {
        type: 'radial', x: 0.5, y: 0.4, r: 0.9,
        colorStops: [
          { offset: 0, color: 'rgba(60, 255, 220, 0.72)' },
          { offset: 0.55, color: 'rgba(14, 160, 150, 0.92)' },
          { offset: 1, color: 'rgba(3, 70, 82, 0.96)' }
        ]
      },
      borderColor: '#fff',
      borderWidth: 2.2,
      shadowColor: 'rgba(0, 255, 220, 0.65)',
      shadowBlur: 32,
      shadowOffsetY: 12
    }
  },
  label: { color: '#fff', fontSize: 13, fontWeight: 600 }
})))

// 下钻聚焦时：提亮选中区县、压暗其余区县
function buildRegions(F) {
  return geoRegions.value.map(r => {
    if (F && r.name === F) {
      return { ...r, itemStyle: { areaColor: { type: 'radial', x: 0.5, y: 0.4, r: 0.9, colorStops: [{ offset: 0, color: 'rgba(70,255,225,0.18)' }, { offset: 0.55, color: 'rgba(16,180,165,0.26)' }, { offset: 1, color: 'rgba(4,76,88,0.42)' }] }, borderColor: '#fff', borderWidth: 2.6, shadowColor: 'rgba(0,255,220,0.85)', shadowBlur: 38 }, label: { color: '#fff', fontSize: 14, fontWeight: 700 } }
    }
    if (F) {
      return { ...r, itemStyle: { areaColor: 'rgba(6,26,36,0.82)', borderColor: 'rgba(120,165,185,0.22)', borderWidth: 0.8, shadowBlur: 2, shadowColor: 'transparent' }, emphasis: { itemStyle: { areaColor: 'rgba(12,44,56,0.9)', borderColor: 'rgba(150,200,220,0.4)', borderWidth: 1 } }, label: { color: 'rgba(180,210,225,0.55)', fontSize: 12 } }
    }
    return r
  })
}

// ===== 3D 地图仅展示德阳市（6 区县），不使用四川省全图 =====

// 在区县中心基础上做偏移，生成多个分散点位，避免单点堆叠、让地图更饱满
const spreadOffsets = [
  [0, 0], [0.055, 0.035], [-0.045, 0.045], [0.035, -0.05]
]
function spreadPoints(suffix) {
  const out = []
  Object.entries(regionCenter).forEach(([n, v]) => {
    spreadOffsets.forEach(([dx, dy], i) => {
      out.push({ name: `${n}${suffix}${i > 0 ? i + 1 : ''}`, value: [+(v[0] + dx).toFixed(5), +(v[1] + dy).toFixed(5)], district: n })
    })
  })
  return out
}

// 点位分类配置（弹窗主题色 + 名称）
const CAT = {
  gov: { label: '公立医疗机构', color: '#00ffae' },
  org: { label: '养老机构', color: '#9dff3c' },
  com: { label: '社区卫生服务中心', color: '#34e1c9' },
  home: { label: '居家养老家庭', color: '#c6ff7a' },
  alarm: { label: '实时告警', color: '#ff5a3c' },
  med: { label: '医疗机构', color: '#4d8bff' },
  elder: { label: '关怀对象', color: '#ffb020' },
  custom: { label: '后台标注点', color: '#ffffff' }
}
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0 } return Math.abs(h) }
function districtOf(name) { for (const k of Object.keys(regionCenter)) if (name.indexOf(k) === 0) return k; return '' }
// 按经纬度就近归属区县（给真实坐标点位，如公立医院）反查所属区县
function nearestDistrict(lng, lat) {
  let best = '', bd = Infinity
  for (const [n, v] of Object.entries(regionCenter)) {
    const d = (v[0] - lng) ** 2 + (v[1] - lat) ** 2
    if (d < bd) { bd = d; best = n }
  }
  return best
}

// 根据分类 + 基础数据生成点位详情（驱动点击弹窗）
function makeDetail(cat, base) {
  const c = CAT[cat]
  const name = base.name
  const district = base.district || districtOf(name)
  const r = hashStr(name)
  let rows = []
  let desc = ''
  if (cat === 'gov') {
    const level = base.level || ['三级甲等', '三级乙等', '二级甲等'][r % 3]
    const beds = base.beds || (400 + r % 1200)
    rows = [
      { label: '机构等级', value: level },
      { label: '所属区县', value: district },
      { label: '床位规模', value: beds + ' 张' },
      { label: '特色专科', value: base.dept || '老年医学 / 康复医学' },
      { label: '运行状态', value: '正常接诊' }
    ]
    desc = `${name}为德阳市${district}公立医疗服务核心节点，承担辖区老年人疾病诊疗与康复任务。`
  } else if (cat === 'org') {
    const type = base.type || '公办养老'
    const beds = (base.beds != null && base.beds !== '') ? base.beds : (60 + (r % 260))
    const occRaw = base.occupancy
    const occNum = parseInt(occRaw, 10)
    const occ = isNaN(occNum) ? (78 + (r % 18)) + '%' : occRaw
    const hot = !isNaN(occNum) && occNum >= 90
    const status = base.status || '运营中'
    rows = [
      { label: '机构编号', value: base.code || '--' },
      { label: '所属区县', value: district },
      { label: '机构类型', value: type },
      { label: '床位规模', value: beds + ' 张' },
      { label: '入住率', value: occ, hot },
      { label: '运行状态', value: status }
    ]
    desc = `${name}（${base.code || '—'}）位于${district}，为${type}机构，当前${status}。`
  } else if (cat === 'com') {
    const pop = (3 + (r % 9)) + '.' + (r % 10) + ' 万'
    const docs = 12 + (r % 40)
    rows = [
      { label: '所属区县', value: district },
      { label: '覆盖人口', value: pop },
      { label: '签约家医', value: docs + ' 人' },
      { label: '特色服务', value: '慢病管理 / 上门诊疗' },
      { label: '运行状态', value: '服务中' }
    ]
  } else if (cat === 'home') {
    const age = 70 + (r % 25)
    const need = ['助餐助洁', '生活照料', '康复护理', '紧急呼叫'][r % 4]
    const dev = 1 + (r % 4)
    rows = [
      { label: '所属区县', value: district },
      { label: '老人年龄', value: age + ' 岁' },
      { label: '服务需求', value: need },
      { label: '看护设备', value: dev + ' 台' }
    ]
  } else if (cat === 'alarm') {
    rows = [
      { label: '告警等级', value: base.level || '紧急', hot: true },
      { label: '发生区域', value: district },
      { label: '告警时间', value: base.time || '--' },
      { label: '处置状态', value: base.state || '待处理' },
      { label: '责任人', value: base.handler || '网格员' }
    ]
  } else if (cat === 'custom') {
    rows = [
      { label: '点位类型', value: base.type || '标注点' },
      { label: '所属区县', value: base.area || district },
      { label: '来源', value: '后台可视化配置' }
    ]
  } else if (cat === 'med') {
    const nature = base.nature || '待核实'
    const level = base.level || '待核实'
    const addr = base.address || '待核实'
    const type = base.type || '医疗机构'
    const status = base.status || '正常接诊'
    rows = [
      { label: '经营性质', value: nature, hot: nature === '私立' },
      { label: '机构等级', value: level },
      { label: '机构类型', value: type },
      { label: '所属区县', value: district },
      { label: '详细地址', value: addr },
      { label: '运行状态', value: status }
    ]
    desc = `${name}位于${district}，为${nature}${type}，当前${status}。`
  } else if (cat === 'elder') {
    const gender = base.gender || '—'
    const age = base.age != null ? base.age + ' 岁' : '—'
    const care = base.careLevel || '—'
    const living = base.livingType || '—'
    const status = base.status || '在档'
    const tags = Array.isArray(base.healthTags) && base.healthTags.length ? base.healthTags.join('、') : '无'
    const emer = (base.emergencyName ? base.emergencyName + (base.emergencyRelation ? '（' + base.emergencyRelation + '）' : '') : '—')
    rows = [
      { label: '所属区县', value: district },
      { label: '性别/年龄', value: gender + ' · ' + age },
      { label: '照护等级', value: care, hot: care === '失能' || care === '特护' },
      { label: '居住类型', value: living },
      { label: '档案状态', value: status },
      { label: '健康标签', value: tags },
      { label: '紧急联系人', value: emer },
      { label: '所属机构', value: base.belongOrg || '—' }
    ]
    desc = `${name}（${base.code || '—'}）现居${district}，照护等级为${care}，由${base.belongOrg || '辖区养老服务机构'}纳入重点关怀。`
  }
  return { category: cat, categoryLabel: c.label, color: c.color, name, rows, desc }
}
function withDetail(cat, base) { return { ...base, detail: makeDetail(cat, base) } }

// 机构养老：直接读取后台真实机构（dataStore.institutions），按 district 自动定位到区县中心
// （同区县多机构做花瓣状偏移避免重叠）；无需经纬度，新增/现有机构即时上图、点击可看详情
const DISTRICT_KEYS = Object.keys(regionCenter)
function districtOfText(t) {
  if (!t) return ''
  for (const n of DISTRICT_KEYS) if (t.indexOf(n) >= 0 || n.indexOf(t) >= 0) return n
  return ''
}
const realInstitutionData = computed(() => {
  const list = dataStore.institutions || []
  const counters = {}
  return list.map(inst => {
    const d = districtOfText(inst.district) || ''
    const idx = (counters[d] = (counters[d] || 0))
    counters[d]++
    const center = (d && regionCenter[d]) || [104.398, 31.128]
    const ring = Math.floor(idx / 6)
    const ang = (idx % 6) * (Math.PI / 3) + idx * 0.35
    const rr = 0.045 + ring * 0.05
    const lng = +(center[0] + rr * Math.cos(ang)).toFixed(4)
    const lat = +(center[1] + rr * Math.sin(ang)).toFixed(4)
    return withDetail('org', { name: inst.name, value: [lng, lat], type: inst.type, district: d, code: inst.code, beds: inst.beds, status: inst.status, elders: inst.elders, occupancy: inst.occupancy })
  })
})
// 医疗机构：直接读取后台真实机构（dataStore.medical，107 家联网核实数据），按 district 自动定位到区县中心
const medicalData = computed(() => {
  const list = dataStore.medical || []
  const counters = {}
  return list.map(m => {
    const d = districtOfText(m.district) || ''
    const idx = (counters[d] = (counters[d] || 0))
    counters[d]++
    const center = (d && regionCenter[d]) || [104.398, 31.128]
    const ring = Math.floor(idx / 6)
    const ang = (idx % 6) * (Math.PI / 3) + idx * 0.35
    const rr = 0.045 + ring * 0.05
    const lng = +(center[0] + rr * Math.cos(ang)).toFixed(4)
    const lat = +(center[1] + rr * Math.sin(ang)).toFixed(4)
    return withDetail('med', { name: m.name, value: [lng, lat], type: m.type, district: d, nature: m.nature, level: m.level, address: m.address, status: m.status })
  })
})
// 关怀对象（老人档案 G03）：直接读取后台真实档案 dataStore.elderly，按 district 自动定位到区县中心
const elderData = computed(() => {
  const list = dataStore.elderly || []
  const counters = {}
  return list.map(e => {
    const d = districtOfText(e.district) || ''
    const idx = (counters[d] = (counters[d] || 0))
    counters[d]++
    const center = (d && regionCenter[d]) || [104.398, 31.128]
    const ring = Math.floor(idx / 6)
    const ang = (idx % 6) * (Math.PI / 3) + idx * 0.35
    const rr = 0.045 + ring * 0.05
    const lng = +(center[0] + rr * Math.cos(ang)).toFixed(4)
    const lat = +(center[1] + rr * Math.sin(ang)).toFixed(4)
    return withDetail('elder', {
      name: e.name,
      value: [lng, lat],
      district: d,
      code: e.code,
      gender: e.gender,
      age: e.age,
      careLevel: e.careLevel,
      livingType: e.livingType,
      status: e.status,
      healthTags: e.healthTags || [],
      belongOrg: e.belongOrg,
      emergencyName: e.emergencyName,
      emergencyRelation: e.emergencyRelation
    })
  })
})
const communityData = spreadPoints('社区卫生服务中心').map(d => withDetail('com', d))   // 社区养老：社区卫生服务中心点位
const homeData = spreadPoints('居家老人家庭').map(d => withDetail('home', d))            // 居家养老：老人家庭住址点位
// 政府监管：公立医疗机构（德阳市各区县主要公立医院）
const governmentData = [
  { name: '德阳市人民医院', value: [104.398, 31.128], level: '三级甲等', beds: 1800, dept: '老年医学科 / 心血管' },
  { name: '旌阳区中医院', value: [104.432, 31.205], level: '三级乙等', beds: 600, dept: '中医康复' },
  { name: '罗江区人民医院', value: [104.521, 31.322], level: '二级甲等', beds: 520 },
  { name: '中江县人民医院', value: [104.808, 30.858], level: '三级乙等', beds: 900 },
  { name: '广汉市人民医院', value: [104.286, 31.008], level: '三级甲等', beds: 1200 },
  { name: '什邡市人民医院', value: [104.018, 31.281], level: '二级甲等', beds: 560 },
  { name: '绵竹市人民医院', value: [104.118, 31.441], level: '三级乙等', beds: 780 }
].map(d => ({ ...d, district: nearestDistrict(d.value[0], d.value[1]) })).map(d => withDetail('gov', d))
const alarmData = ref([
  { name: '中江县告警', value: [...regionCenter['中江县']], level: '紧急', time: '08:42', state: '待处理', handler: '仓山镇网格员', district: '中江县' },
  { name: '旌阳区告警', value: [...regionCenter['旌阳区']], level: '严重', time: '09:15', state: '处理中', handler: '孝感街道养老站', district: '旌阳区' }
].map(d => withDetail('alarm', d)))
// 按区县聚合告警数量（驱动市级总览的告警红点 + 数量徽标，以及区县下钻的告警视图）
const alarmByDistrict = computed(() => {
  const m = {}
  alarmData.value.forEach(a => {
    const d = a.district || (a.detail && (a.detail.rows || []).find(r => r.label === '发生区域') && (a.detail.rows || []).find(r => r.label === '发生区域').value) || districtOf(a.name)
    if (d) m[d] = (m[d] || 0) + 1
  })
  return m
})
// 自定义点位：district 用经纬度就近反查区县（不依赖后台自由文本 area），保证下钻过滤/面板始终匹配真实位置
const customPointData2D = computed(() => store.points.map(p => withDetail('custom', { name: p.name, value: [p.lng, p.lat], type: p.type, area: p.area, district: nearestDistrict(p.lng, p.lat) })))
const customPointData3D = computed(() => store.points.map(p => withDetail('custom', { name: p.name, value: [p.lng, p.lat, 18], type: p.type, area: p.area, district: nearestDistrict(p.lng, p.lat) })))

// 区县概览（点击区县区域 / 标签时弹出）
function districtDetail(name) {
  const d = districtStats[name]
  if (!d) return null
  const per = Math.round(d.beds / d.elderly * 1000)
  return {
    categoryLabel: '区县概览', color: '#00f0ff', name,
    rows: [
      { label: '老年人口', value: d.elderly + ' 万', hot: true },
      { label: '养老床位', value: d.beds + ' 万张' },
      { label: '千名老人床位', value: per + ' 张' },
      { label: '所属层级', value: '区县级养老单元' }
    ],
    desc: `${name}已构建「机构+社区+居家」三级养老服务体系，覆盖城乡老年群体基本养老与医养结合需求。`
  }
}

// ===== 区县下钻：点击区县轮廓 → 显示区县轮廓板块 + 区内全部点位；可返回市级 =====
const drillDistrict = ref('')
// 扁平化全部点位（带 district 归属），供面板列表与 2D/3D 过滤共用
const allPoints = computed(() => {
  const out = []
  const add = (list, cat) => list.forEach(d => {
    const dist = d.district || (d.detail && (d.detail.rows || []).find(r => r.label === '所属区县' || r.label === '发生区域') || {}).value || districtOf(d.name)
    out.push({ name: d.name, value: d.value, district: dist, cat, color: CAT[cat].color, detail: d.detail })
  })
  add(governmentData, 'gov'); add(realInstitutionData.value, 'org'); add(medicalData.value, 'med'); add(communityData, 'com'); add(homeData, 'home'); add(alarmData.value, 'alarm'); add(customPointData2D.value, 'custom'); add(elderData.value, 'elder')
  return out
})
// 当前有效类别：市级总览=告警视角；类别 tab=对应类别（驱动地图与下钻面板一致）
const activeCat = computed(() => activeTab.value === 'overview' ? 'alarm' : activeTab.value)
const districtPoints = computed(() => {
  if (!drillDistrict.value) return []
  if (activeCat.value === 'alarm') {
    const c = alarmByDistrict.value[drillDistrict.value] || 0
    if (!c) return []
    const center = regionCenter[drillDistrict.value]
    const d = makeDetail('alarm', { name: drillDistrict.value + '告警', district: drillDistrict.value, level: '紧急', state: '告警中', count: c })
    d.rows.unshift({ label: '告警数量', value: c + ' 起', hot: true })
    return [{ name: drillDistrict.value + '告警', value: center ? [center[0], center[1]] : null, district: drillDistrict.value, cat: 'alarm', color: CAT.alarm.color, count: c, detail: d }]
  }
  return allPoints.value.filter(p => p.district === drillDistrict.value && p.cat === activeCat.value)
})
function catName(c) { return (CAT[c] || {}).label || c }
// 区县轮廓 SVG：按 GeoJSON 真实多边形投影到 0 0 100 100 视图框，并叠加区内点位坐标
const districtOutline = computed(() => {
  if (!drillDistrict.value) return null
  const f = (deyangGeo.features || []).find(ft => ft.properties && ft.properties.name === drillDistrict.value)
  if (!f || !f.geometry) return null
  const g = f.geometry
  const rings = g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? [].concat(...g.coordinates) : []
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  rings.forEach(r => r.forEach(([lng, lat]) => { if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng; if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat }))
  const pad = 9, size = 100
  const sx = lng => pad + (lng - minLng) / ((maxLng - minLng) || 1) * (size - 2 * pad)
  const sy = lat => pad + (1 - (lat - minLat) / ((maxLat - minLat) || 1)) * (size - 2 * pad)
  const d = rings.map(r => r.map((co, i) => (i ? 'L' : 'M') + sx(co[0]).toFixed(2) + ' ' + sy(co[1]).toFixed(2)).join(' ') + ' Z').join(' ')
  const pts = districtPoints.value.map(p => ({ x: sx(p.value[0]).toFixed(2), y: sy(p.value[1]).toFixed(2), color: p.color, name: p.name }))
  return { d, pts }
})
const drillStats = computed(() => drillDistrict.value ? districtStats[drillDistrict.value] : null)
function onDistrict(name) {
  if (!name || !districtStats[name]) return
  drillDistrict.value = name
  if (engine3d) engine3d.setFocus(name)
  if (store.mapMode === '3d') renderMap3D()
  else renderMap2D(name)
}
function returnToCity() {
  drillDistrict.value = ''
  if (engine3d) engine3d.setFocus(null)
  if (store.mapMode === '3d') renderMap3D()
  else renderMap2D('')
}
function selectPoint(p) {
  const detail = p.detail || makeDetail(p.cat, { name: p.name, value: p.value, district: p.district })
  selectedPoint.value = { ...detail, rows: [...detail.rows, { label: '经纬度', value: coordStr(p.value) }] }
  showDetail.value = true
}

// 后台新增/删除点位 → 立即重渲染（2D/3D 均生效），无需等待 15s 轮询
watch(() => store.points, () => {
  if (!mapChart) return
  if (store.mapMode === '3d') { try { renderMap3D() } catch (e) { show2D() } }
  else requestAnimationFrame(() => { if (mapChart && !mapChart.isDisposed()) { mapChart.resize(); renderMap2D(drillDistrict.value) } })
}, { deep: true })
// 后台新增/删除机构 → 立即重渲染地图与下钻面板（2D/3D 均生效）
watch(() => dataStore.institutions, () => {
  if (!mapChart) return
  if (store.mapMode === '3d') { try { renderMap3D() } catch (e) { show2D() } }
  else requestAnimationFrame(() => { if (mapChart && !mapChart.isDisposed()) { mapChart.resize(); renderMap2D(drillDistrict.value) } })
}, { deep: true })
// 后台新增/删除医疗机构 → 立即重渲染地图与下钻面板（2D/3D 均生效）
watch(() => dataStore.medical, () => {
  if (!mapChart) return
  if (store.mapMode === '3d') { try { renderMap3D() } catch (e) { show2D() } }
  else requestAnimationFrame(() => { if (mapChart && !mapChart.isDisposed()) { mapChart.resize(); renderMap2D(drillDistrict.value) } })
}, { deep: true })
watch(() => store.mapMode, (m) => {
  if (!mapChart) return
  if (m === '2d') show2D()
  else { try { renderMap3D() } catch (e) { show2D() } }
})
watch(activeTab, () => {
  if (!mapChart) return
  if (store.mapMode === '3d') { try { renderMap3D() } catch (e) { show2D() } }
  else renderMap2D()
  nextTick(() => { renderPanelCharts(); animatePanelKpis() })
})
// 后台「大屏板块数据」修改后实时联动左右栏目图表
watch(view, () => { nextTick(renderPanelCharts) }, { deep: true })

function resize() {
  const app = screenRef.value
  if (!app) return
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  app.style.transform = `scale(${scale})`
}

function updateClock() {
  const el = document.getElementById('clock')
  if (el) el.textContent = new Date().toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-')
}

function animateValue(el, target, duration = 1600) {
  const startTime = performance.now()
  const isFloat = String(target).includes('.')
  const decimals = isFloat ? 1 : 0
  function step(t) {
    const p = Math.min((t - startTime) / duration, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    el.textContent = (target * ease).toFixed(decimals)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// 光柱：从区县中心向"北"延伸，宽度按老年人口映射
const pillarData = computed(() => Object.entries(regionCenter).map(([n, v]) => {
  const h = 6 + (districtStats[n].elderly / maxElderly.value) * 14
  return {
    name: n,
    coords: [[v[0], v[1]], [v[0], v[1] + 0.055]],
    lineStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(255, 170, 0, 0.12)' },
          { offset: 0.45, color: 'rgba(255, 200, 60, 0.55)' },
          { offset: 0.85, color: 'rgba(255, 235, 120, 0.92)' },
          { offset: 1, color: '#fff' }
        ]
      },
      width: h,
      shadowBlur: 24,
      shadowColor: 'rgba(255, 180, 0, 0.55)'
    }
  }
}))

function renderMap2D(F = drillDistrict.value) {
  const tab = activeTab.value
  const showAll = tab === 'overview'
  const series = []
  const inF = d => !F || (d.district === F)
  // 霓虹边界（所有 tab 都保留）
  series.push(
    { type: 'map', map: 'deyang', geoIndex: 0, silent: true, itemStyle: { areaColor: 'transparent', borderColor: 'rgba(0, 80, 200, 0.35)', borderWidth: 12 }, zlevel: -3 },
    { type: 'map', map: 'deyang', geoIndex: 0, silent: true, itemStyle: { areaColor: 'transparent', borderColor: 'rgba(0, 160, 255, 0.45)', borderWidth: 6 }, zlevel: -2 },
    { type: 'map', map: 'deyang', geoIndex: 0, silent: true, itemStyle: { areaColor: 'transparent', borderColor: 'rgba(180, 245, 255, 0.85)', borderWidth: 2 }, zlevel: -1 }
  )
  // 区县标签（所有 tab 都保留，用于定位参考）
  series.push({
    type: 'scatter', coordinateSystem: 'geo',
    data: Object.entries(regionCenter).map(([n, v]) => ({ name: n, value: [...v, districtStats[n].elderly] })).filter(d => !F || d.name === F),
    symbolSize: 0,
    label: {
      show: true,
      position: 'center',
      formatter: p => `{tag|${p.name}  ${p.value[2]}万}`,
      rich: {
        tag: {
          color: '#fff', fontSize: 13, fontWeight: 700, align: 'center',
          backgroundColor: 'rgba(0, 50, 120, 0.9)',
          padding: [6, 12], borderRadius: 8,
          borderColor: 'rgba(0, 220, 255, 0.85)', borderWidth: 1.5,
          shadowColor: 'rgba(0, 160, 255, 0.65)', shadowBlur: 14,
          textShadowColor: 'rgba(0,0,0,0.9)', textShadowBlur: 4
        }
      }
    },
    zlevel: 6
  })
  // 综合总览专属：服务连线 + 区县光柱（下钻时隐藏，突出单区县）
  if (showAll && !F) {
    series.push(
      {
        name: '服务连线', type: 'lines', coordinateSystem: 'geo',
        data: Object.values(regionCenter).map(v => ({ coords: [[...regionCenter['旌阳区']], [...v]] })),
        lineStyle: { color: 'rgba(0, 160, 255, 0.35)', width: 1.4, curveness: 0.2 },
        effect: { show: true, period: 4, trailLength: 0.55, symbol: 'arrow', symbolSize: 7, color: '#7ee8ff' },
        zlevel: 2
      },
      { name: '区县光柱', type: 'lines', coordinateSystem: 'geo', data: pillarData.value, lineStyle: { curveness: 0 }, zlevel: 3 },
      {
        name: '光柱顶点', type: 'scatter', coordinateSystem: 'geo',
        data: Object.entries(regionCenter).map(([n, v]) => ({ name: n, value: [v[0], v[1] + 0.055] })),
        symbolSize: 10, itemStyle: { color: '#fff', shadowBlur: 20, shadowColor: '#00f0ff' }, zlevel: 8
      }
    )
  }
  // 政府监管：仅公立医疗机构
  if (tab === 'gov') {
    series.push(
      { name: '公立医疗机构', type: 'effectScatter', coordinateSystem: 'geo', data: governmentData.filter(inF), symbolSize: 16, silent: true, rippleEffect: { brushType: 'stroke', scale: 5, period: 3 }, itemStyle: { color: 'rgba(54, 224, 160, 0.42)' }, zlevel: 4 },
      { name: '公立医疗机构', type: 'scatter', coordinateSystem: 'geo', data: governmentData.filter(inF), symbolSize: 9, itemStyle: { color: '#36e0a0', borderColor: '#fff', borderWidth: 1, shadowBlur: 14, shadowColor: '#36e0a0' }, zlevel: 6, label: { show: true, formatter: p => p.name, color: '#dffaf2', fontSize: 10, position: 'top' } }
    )
  }
  // 医疗机构：全部签约医疗机构（107 家，含公立/私立）
  if (tab === 'medical') {
    series.push(
      { name: '医疗机构', type: 'effectScatter', coordinateSystem: 'geo', data: medicalData.value.filter(inF), symbolSize: 14, silent: true, rippleEffect: { brushType: 'stroke', scale: 4.5, period: 3 }, itemStyle: { color: 'rgba(77, 139, 255, 0.42)' }, zlevel: 4 },
      { name: '医疗机构', type: 'scatter', coordinateSystem: 'geo', data: medicalData.value.filter(inF), symbolSize: 8, itemStyle: { color: '#4d8bff', borderColor: '#fff', borderWidth: 1, shadowBlur: 14, shadowColor: '#4d8bff' }, zlevel: 6, label: { show: tab === 'medical', formatter: p => p.name, color: '#e3edff', fontSize: 10, position: 'top' } }
    )
  }
  // 机构养老：仅机构注册点位
  if (tab === 'institution') {
    series.push(
      { name: '养老机构', type: 'effectScatter', coordinateSystem: 'geo', data: realInstitutionData.value.filter(inF), symbolSize: 16, silent: true, rippleEffect: { brushType: 'stroke', scale: 5, period: 3 }, itemStyle: { color: 'rgba(255, 170, 0, 0.42)' }, zlevel: 4 },
      { name: '养老机构', type: 'scatter', coordinateSystem: 'geo', data: realInstitutionData.value.filter(inF), symbolSize: 9, itemStyle: { color: '#ffcc66', borderColor: '#fff', borderWidth: 1, shadowBlur: 14, shadowColor: '#ffaa00' }, zlevel: 6 }
    )
  }
  // 社区养老：仅社区卫生服务中心
  if (tab === 'community') {
    series.push(
      { name: '社区卫生服务中心', type: 'effectScatter', coordinateSystem: 'geo', data: communityData.filter(inF), symbolSize: 14, silent: true, rippleEffect: { brushType: 'stroke', scale: 4.5, period: 3 }, itemStyle: { color: 'rgba(0, 200, 255, 0.4)' }, zlevel: 4 },
      { name: '社区卫生服务中心', type: 'scatter', coordinateSystem: 'geo', data: communityData.filter(inF), symbolSize: 8, itemStyle: { color: '#66e3ff', borderColor: '#fff', borderWidth: 1, shadowBlur: 12, shadowColor: '#00c8ff' }, zlevel: 6 }
    )
  }
  // 居家养老：仅老人家庭住址
  if (tab === 'home') {
    series.push(
      { name: '居家老人家庭', type: 'effectScatter', coordinateSystem: 'geo', data: homeData.filter(inF), symbolSize: 12, silent: true, rippleEffect: { brushType: 'stroke', scale: 4, period: 3 }, itemStyle: { color: 'rgba(0, 220, 255, 0.35)' }, zlevel: 4 },
      { name: '居家老人家庭', type: 'scatter', coordinateSystem: 'geo', data: homeData.filter(inF), symbolSize: 7, itemStyle: { color: '#4ad8ff', borderColor: '#fff', borderWidth: 1, shadowBlur: 10, shadowColor: '#00c8ff' }, zlevel: 6 }
    )
  }
  // 关怀对象：老人档案重点关怀对象（按区县聚合定位）
  if (tab === 'elder') {
    series.push(
      { name: '关怀对象', type: 'effectScatter', coordinateSystem: 'geo', data: elderData.value.filter(inF), symbolSize: 14, silent: true, rippleEffect: { brushType: 'stroke', scale: 4.5, period: 3 }, itemStyle: { color: 'rgba(255, 176, 32, 0.42)' }, zlevel: 4 },
      { name: '关怀对象', type: 'scatter', coordinateSystem: 'geo', data: elderData.value.filter(inF), symbolSize: 9, itemStyle: { color: '#ffb020', borderColor: '#fff', borderWidth: 1, shadowBlur: 14, shadowColor: '#ffb020' }, zlevel: 6, label: { show: tab === 'elder', formatter: p => p.name, color: '#ffe7bf', fontSize: 10, position: 'top' } }
    )
  }
  // 市级总览告警聚合：仅在存在告警的区县显示单个红点 + 数量徽标，其余所有点位已隐藏
  if (showAll) {
    const agg = Object.entries(alarmByDistrict.value)
      .map(([dist, count]) => { const c = regionCenter[dist]; return c ? { name: dist + '·告警', value: [c[0], c[1]], count, district: dist } : null })
      .filter(Boolean)
      .filter(d => !F || d.district === F)
    if (agg.length) {
      series.push(
        { name: '告警区县', type: 'effectScatter', coordinateSystem: 'geo', data: agg, symbolSize: 30, silent: true, rippleEffect: { brushType: 'stroke', scale: 7.5, period: 1.4 }, itemStyle: { color: 'rgba(255, 59, 48, 0.42)' }, zlevel: 9 },
        { name: '告警区县', type: 'scatter', coordinateSystem: 'geo', data: agg, symbolSize: 17, itemStyle: { color: '#ff3b30', borderColor: '#fff', borderWidth: 2, shadowBlur: 22, shadowColor: '#ff3b30' }, zlevel: 10, label: { show: true, position: 'top', formatter: p => `{badge|${p.data.count} 起}`, rich: { badge: { color: '#fff', fontSize: 12, fontWeight: 700, backgroundColor: '#ff3b30', padding: [3, 8], borderRadius: 11, borderColor: '#ffffff', borderWidth: 1, shadowColor: 'rgba(255, 59, 48, 0.85)', shadowBlur: 9 } } } }
      )
    }
  }
  // 后台标注点（自定义点位）：除市级告警总览外均渲染，确保后台新增即刻可见、点击可看详情
  if (!showAll) series.push(
    { name: '后台标注点', type: 'effectScatter', coordinateSystem: 'geo', data: customPointData2D.value.filter(inF), symbolSize: 14, rippleEffect: { brushType: 'stroke', scale: 4, period: 3 }, itemStyle: { color: '#ff4d4d', shadowBlur: 16, shadowColor: '#fff' }, label: { show: true, formatter: p => p.name, color: '#fff', fontSize: 11, position: 'top' }, zlevel: 7 }
  )
  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(3, 12, 30, 0.94)',
      borderColor: 'rgba(0, 160, 255, 0.55)',
      textStyle: { color: '#e6f3ff' },
      formatter: p => {
        if (['scatter', 'effectScatter'].includes(p.seriesType)) {
          if (p.data && p.data.count != null) {
            return `<div style="font-weight:700;color:#ff3b30">${p.data.district} · 实时告警</div><div>当前告警：${p.data.count} 起</div><div style="opacity:.72;margin-top:2px">点击红点进入${p.data.district}查看处置</div>`
          }
          const d = districtStats[p.name]
          if (d) return `<div style="font-weight:700;color:#00f0ff">${p.name}</div><div>老年人口：${d.elderly} 万</div><div>养老床位：${d.beds} 万张</div>`
        }
        if (p.seriesType === 'lines') return p.name ? `${p.name} 服务通道` : '服务连线'
        return p.name
      }
    },
    geo: {
      map: 'deyang',
      roam: true,
      zoom: 1.18,
      layoutCenter: ['50%', '52%'],
      layoutSize: '94%',
      itemStyle: {
        areaColor: {
          type: 'radial', x: 0.5, y: 0.4, r: 0.9,
          colorStops: [
            { offset: 0, color: 'rgba(12, 200, 175, 0.45)' },
            { offset: 0.5, color: 'rgba(5, 110, 110, 0.78)' },
            { offset: 1, color: 'rgba(2, 40, 52, 0.92)' }
          ]
        },
        borderColor: 'rgba(190, 255, 245, 0.92)',
        borderWidth: 1.8,
        shadowColor: 'rgba(0, 240, 210, 0.55)',
        shadowBlur: 24,
        decal: {
          symbol: 'rect',
          symbolSize: 1,
          dashArrayX: [1, 5],
          dashArrayY: [1, 5],
          rotation: Math.PI / 4,
          color: 'rgba(190, 255, 245, 0.12)'
        }
      },
      emphasis: {
        itemStyle: {
          areaColor: {
            type: 'radial', x: 0.5, y: 0.4, r: 0.9,
            colorStops: [
              { offset: 0, color: 'rgba(50, 255, 220, 0.68)' },
              { offset: 0.5, color: 'rgba(12, 150, 140, 0.88)' },
              { offset: 1, color: 'rgba(3, 60, 72, 0.96)' }
            ]
          },
          borderColor: '#fff',
          borderWidth: 2.4,
          shadowColor: 'rgba(0, 255, 220, 0.75)',
          shadowBlur: 36
        },
        label: { color: '#fff', fontSize: 14, fontWeight: 700 }
      },
      label: { show: false },
      regions: buildRegions(F)
    },
    series
  })
}

// ===== 3D 地图：Canvas 2.5D 立体挤出引擎（零依赖，替代 echarts-gl geo3D）=====
function ensureEngine() {
  if (engine3d) return
  const host = document.getElementById('mapCanvas')
  const opts = {
    onSelect: (detail) => { selectedPoint.value = detail; showDetail.value = true },
    onHover: (h) => {
      if (h) tip.value = { show: true, text: h.text, x: h.x, y: h.y, color: h.color }
      else tip.value = { ...tip.value, show: false }
    },
    onDistrict: (name) => onDistrict(name)
  }
  // 首选真 WebGL（Three.js）；THREE 未加载或显卡不支持时降级到 Canvas 2.5D 引擎
  try {
    engine3d = new Map3DEngine(host, opts)
  } catch (e) {
    console.warn('[3D地图] WebGL 引擎不可用，降级为 Canvas 2.5D：', e && e.message)
    engine3d = new CanvasMap3D(host, opts)
  }
  engine3d.setGeo(deyangGeo, districtStats, regionCenter)
}

function build3DMarkers(tab) {
  const showAll = tab === 'overview'
  const F = drillDistrict.value
  const list = []
  // 类别视图：仅渲染当前选中类别（市级总览不显示具体类别点位）
  const push = (arr, cat) => {
    if (!showAll && activeTab.value === tab) {
      arr.forEach(d => {
        if (F && d.district !== F) return
        list.push({ name: d.name, lng: d.value[0], lat: d.value[1], color: CAT[cat].color, cat, detail: d.detail })
      })
    }
  }
  push(governmentData, 'gov')
  push(realInstitutionData.value, 'org')
  push(medicalData.value, 'med')
  push(communityData, 'com')
  push(homeData, 'home')
  push(elderData.value, 'elder')
  // 市级总览：仅渲染按区县聚合的告警红点（示意）
  if (showAll) {
    for (const [dist, count] of Object.entries(alarmByDistrict.value)) {
      const c = regionCenter[dist]
      if (!c) continue
      list.push({ name: `${dist} 告警 ${count} 起`, lng: c[0], lat: c[1], color: CAT.alarm.color, cat: 'alarm', detail: makeDetail('alarm', { name: dist + '告警', district: dist, level: '紧急', state: '告警中', count }) })
    }
  }
  // 后台标注点（自定义点位）：除市级告警总览外均渲染
  if (!showAll) customPointData3D.value.forEach(d => list.push({ name: d.name, lng: d.value[0], lat: d.value[1], color: CAT.custom.color, cat: 'custom', detail: d.detail }))
  return list
}

function renderMap3D() {
  const ec = document.getElementById('mapChart')
  const cv = document.getElementById('mapCanvas')
  if (ec) ec.style.display = 'none'
  if (cv) cv.style.display = 'block'
  ensureEngine()
  engine3d.setData({ tab: activeTab.value, showAll: activeTab.value === 'overview', markers: build3DMarkers(activeTab.value) })
  if (drillDistrict.value && engine3d.setFocus) engine3d.setFocus(drillDistrict.value)
  if (!engine3d._raf) engine3d.start()
}

function show2D() {
  if (engine3d) engine3d.stop()
  const ec = document.getElementById('mapChart')
  const cv = document.getElementById('mapCanvas')
  if (ec) ec.style.display = 'block'
  if (cv) cv.style.display = 'none'
  tip.value = { ...tip.value, show: false }
  // 等待 DOM 布局完成后再渲染，避免 canvas 宽高为 0 导致 drawImage 崩溃
  requestAnimationFrame(() => {
    if (mapChart && !mapChart.isDisposed()) {
      mapChart.resize()
      renderMap2D()
    }
  })
}

// ===== 板块面板图表（随 tab 动态渲染）=====
function hexA(hex, a) {
  const h = String(hex).replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'
}
function grad(color) {
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0, color: hexA(color, 0.45) },
    { offset: 1, color: hexA(color, 0.02) }
  ])
}
// 纵向柱：底部略暗 → 顶部亮
function grad2(color) {
  return new echarts.graphic.LinearGradient(0, 1, 0, 0, [
    { offset: 0, color: hexA(color, 0.35) },
    { offset: 1, color: color }
  ])
}
// 横向条 / 仪表进度：左暗 → 右亮
function gradH(color) {
  return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: hexA(color, 0.32) },
    { offset: 1, color: color }
  ])
}
// 千分位/万级简写，避免坐标轴数字过长
function shortNum(v) {
  const n = Number(v)
  if (!isFinite(n)) return v
  if (Math.abs(n) >= 10000) return +(n / 10000).toFixed(1) + '万'
  if (Math.abs(n) >= 1000) return +(n / 1000).toFixed(1) + 'k'
  return n
}
const AXIS_BASE = {
  axisLine: { lineStyle: { color: 'rgba(0,240,255,0.22)' } },
  axisTick: { show: false },
  axisLabel: { color: '#8aa6c8', fontSize: 10 },
  splitLine: { lineStyle: { color: 'rgba(0,240,255,0.07)', type: 'dashed' } }
}
const TOOLTIP_BASE = {
  backgroundColor: 'rgba(4,14,34,0.92)',
  borderColor: 'rgba(0,240,255,0.28)',
  borderWidth: 1,
  textStyle: { color: '#cfeaff', fontSize: 11 },
  padding: [8, 10]
}
const LEGEND_BASE = { textStyle: { color: '#8aa6c8', fontSize: 10 }, top: 0, itemHeight: 8, itemWidth: 12, itemGap: 12 }

// 统一构建：line / bar / stack / hbar / ring(pie) / radar / gauge
function buildOption(cfg, baseColor, palette) {
  const unit = cfg.unit || ''
  const pick = (i) => (i === 0 ? baseColor : palette[i % palette.length])

  // ---- 环形占比图 ----
  if (cfg.type === 'ring' || cfg.type === 'pie') {
    const data = cfg.categories.map((c, i) => ({
      name: c, value: cfg.series[0].data[i],
      itemStyle: { color: palette[i % palette.length], borderColor: 'rgba(3,12,30,0.75)', borderWidth: 2 }
    }))
    const total = data.reduce((a, b) => a + b.value, 0)
    return {
      tooltip: { ...TOOLTIP_BASE, trigger: 'item', formatter: (p) => `${p.marker}${p.name}<br/><b style="color:#fff">${p.value}</b> ${unit} · ${p.percent}%` },
      legend: { ...LEGEND_BASE, orient: 'vertical', right: 2, top: 'middle', itemGap: 7 },
      graphic: [{
        type: 'text', left: '31%', top: 'middle', style: {
          text: `合计\n${shortNum(+total.toFixed(1))}`,
          textAlign: 'center', fill: '#cfeaff', fontSize: 12, lineHeight: 18, fontWeight: 600
        }
      }],
      series: [{
        type: 'pie', radius: ['48%', '72%'], center: ['34%', '52%'], avoidLabelOverlap: true,
        label: { show: true, formatter: '{d}%', color: '#cfeaff', fontSize: 10 },
        labelLine: { length: 6, length2: 8, lineStyle: { color: 'rgba(0,240,255,0.35)' } },
        emphasis: { scaleSize: 6, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,240,255,0.45)' } },
        data
      }]
    }
  }

  // ---- 雷达能力评估 ----
  if (cfg.type === 'radar') {
    return {
      tooltip: { ...TOOLTIP_BASE, trigger: 'item' },
      legend: { ...LEGEND_BASE, bottom: 0, top: undefined },
      radar: {
        indicator: cfg.indicators || cfg.categories.map((c) => ({ name: c, max: 100 })),
        center: ['50%', '48%'], radius: '62%', splitNumber: 4,
        axisName: { color: '#9fc4e0', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(0,240,255,0.14)' } },
        splitArea: { areaStyle: { color: ['rgba(0,120,180,0.04)', 'rgba(0,120,180,0.08)'] } },
        axisLine: { lineStyle: { color: 'rgba(0,240,255,0.14)' } }
      },
      series: [{
        type: 'radar', symbolSize: 4,
        data: cfg.series.map((s, i) => ({
          name: s.name, value: s.data,
          lineStyle: { width: 2, color: pick(i) },
          itemStyle: { color: pick(i) },
          areaStyle: { color: hexA(pick(i), i === 0 ? 0.26 : 0.1) }
        }))
      }]
    }
  }

  // ---- 仪表盘达成率 ----
  if (cfg.type === 'gauge') {
    const val = cfg.series[0].data[0]
    const max = cfg.max || 100
    return {
      series: [{
        type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max,
        center: ['50%', '58%'], radius: '86%',
        progress: { show: true, width: 12, roundCap: true, itemStyle: { color: gradH(baseColor) } },
        axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(0,240,255,0.1)']] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { distance: -16, length: 8, lineStyle: { color: 'rgba(0,240,255,0.25)', width: 1 } },
        axisLabel: { distance: -2, color: '#6f8fb0', fontSize: 9 },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '32%'], color: '#8aa6c8', fontSize: 11 },
        detail: {
          valueAnimation: true, offsetCenter: [0, '2%'],
          formatter: (v) => `{v|${v}}{u|${unit}}`,
          rich: {
            v: { fontSize: 30, fontWeight: 700, color: baseColor, lineHeight: 34 },
            u: { fontSize: 12, color: 'rgba(174,238,255,0.65)', padding: [0, 0, 0, 2] }
          }
        },
        data: [{ value: val, name: cfg.series[0].name || '' }]
      }]
    }
  }

  // ---- 横向排名条 ----
  if (cfg.type === 'hbar') {
    const raw = cfg.categories.map((c, i) => ({ name: c, value: cfg.series[0].data[i] }))
    raw.sort((a, b) => a.value - b.value) // ECharts y 轴自下而上，升序即为「第一名在顶」
    const maxV = Math.max(...raw.map((r) => r.value)) || 1
    return {
      tooltip: { ...TOOLTIP_BASE, trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => `${ps[0].name}<br/><b style="color:#fff">${ps[0].value}</b> ${unit}` },
      grid: { top: 6, bottom: 6, left: 6, right: 58, containLabel: true },
      xAxis: { type: 'value', show: false, max: maxV * 1.18 },
      yAxis: {
        type: 'category', data: raw.map((r) => r.name),
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { color: '#a8c6e0', fontSize: 11 }
      },
      series: [
        // 背景槽
        { type: 'bar', barWidth: 11, silent: true, itemStyle: { color: 'rgba(0,102,255,0.12)', borderRadius: 6 }, data: raw.map(() => maxV * 1.18) },
        {
          type: 'bar', barWidth: 11, barGap: '-100%', z: 3,
          itemStyle: { borderRadius: 6, color: (p) => gradH(palette[(raw.length - 1 - p.dataIndex) % palette.length]) },
          label: { show: true, position: 'right', distance: 8, color: '#e6f6ff', fontSize: 11, fontWeight: 600, formatter: (p) => p.value + unit },
          data: raw.map((r) => r.value)
        }
      ]
    }
  }

  // ---- 折线 / 柱 / 堆叠柱 ----
  const isLine = cfg.type === 'line'
  const isStack = cfg.type === 'stack'
  const dualAxis = cfg.series.some((s) => s.axis === 1)
  const seriesArr = cfg.series.map((s, i) => {
    const color = pick(i)
    if (isLine) {
      return {
        name: s.name, data: s.data, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        showSymbol: false, yAxisIndex: s.axis === 1 ? 1 : 0,
        itemStyle: { color }, lineStyle: { width: 2.4, color, shadowColor: hexA(color, 0.55), shadowBlur: 10, shadowOffsetY: 4 },
        areaStyle: cfg.series.length === 1 || i === 0 ? { color: grad(color) } : undefined,
        emphasis: { focus: 'series' }
      }
    }
    return {
      name: s.name, data: s.data, type: 'bar',
      stack: isStack ? 'total' : undefined,
      barWidth: isStack ? '52%' : undefined,
      barMaxWidth: 18,
      itemStyle: {
        color: isStack ? color : grad2(color),
        borderRadius: isStack ? (i === cfg.series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]
      },
      emphasis: { focus: 'series', itemStyle: { shadowBlur: 12, shadowColor: hexA(color, 0.6) } }
    }
  })
  const yBase = { type: 'value', ...AXIS_BASE, axisLabel: { ...AXIS_BASE.axisLabel, formatter: shortNum } }
  return {
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', axisPointer: { type: isLine ? 'line' : 'shadow', lineStyle: { color: 'rgba(0,240,255,0.3)' } } },
    legend: cfg.series.length > 1 ? LEGEND_BASE : { show: false },
    grid: { top: cfg.series.length > 1 ? 26 : 12, bottom: 4, left: 4, right: dualAxis ? 4 : 8, containLabel: true },
    xAxis: {
      type: 'category', data: cfg.categories, boundaryGap: !isLine,
      ...AXIS_BASE, splitLine: { show: false },
      axisLabel: { ...AXIS_BASE.axisLabel, interval: cfg.categories.length > 8 ? 1 : 0 }
    },
    yAxis: dualAxis ? [yBase, { ...yBase, splitLine: { show: false } }] : yBase,
    series: seriesArr
  }
}

function renderPanelCharts() {
  const cfg = view.value
  if (!cfg) return
  const color = cfg.color || '#00f0ff'
  const pal = cfg.key === 'overview' ? PALETTE : [color, '#00c8ff', '#ffaa00', '#b388ff', '#36e0a0', '#ff8ab0']
  ;['left', 'right'].forEach((side) => {
    const blocks = cfg[side] || []
    blocks.forEach((b, i) => {
      const el = chartEls[side][i]
      if (!el) return
      let inst = chartInsts[side][i]
      if (!inst || inst.isDisposed()) {
        inst = echarts.init(el)
        chartInsts[side][i] = inst
      }
      inst.setOption(buildOption(b, color, pal), true)
      inst.resize()
    })
    // 清理多余实例（板块图表块数量不一致时）
    for (let i = blocks.length; i < chartInsts[side].length; i++) {
      const ex = chartInsts[side][i]
      if (ex && !ex.isDisposed()) ex.dispose()
      chartInsts[side][i] = null
    }
  })
}
function allPanelInsts() {
  return [...chartInsts.left, ...chartInsts.right].filter((c) => c && !c.isDisposed())
}
function animatePanelKpis() {
  document.querySelectorAll('.panel [data-target]').forEach((el) => animateValue(el, parseFloat(el.dataset.target)))
}

// 从后端数据库接入数据：将 store 中的区县统计 / 告警映射进本地响应式数据并重渲染
function refreshMap() {
  if (engine3d && engine3d.setGeo) {
    try { engine3d.setGeo(deyangGeo, districtStats, regionCenter) } catch (e) { console.warn('[map] setGeo', e) }
  }
  if (store.mapMode === '3d') renderMap3D()
  else renderMap2D(drillDistrict.value)
}
function hydrateFromStores() {
  if (store.districts && store.districts.length) {
    const next = {}
    store.districts.forEach(d => { next[d.name] = { elderly: d.elderly, beds: d.beds } })
    Object.keys(districtStats).forEach(k => delete districtStats[k])
    Object.assign(districtStats, next)
  }
  if (dataStore.alerts && dataStore.alerts.length) {
    alarmData.value = dataStore.alerts.map(a => withDetail('alarm', {
      name: a.title, value: [...(regionCenter[a.area] || [104.4, 31.1])],
      level: a.level, time: a.time, state: a.state, handler: a.handler, district: a.area
    }))
  }
  refreshMap()
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  updateClock()
  timers.push(setInterval(updateClock, 1000))

  // 数字滚动
  setTimeout(() => {
    document.querySelectorAll('[data-target]').forEach(el => animateValue(el, parseFloat(el.dataset.target)))
  }, 300)

  echarts.registerMap('deyang', deyangGeo)
  mapChart = echarts.init(document.getElementById('mapChart'))
  mapChart.on('click', onMapClick)
  window.addEventListener('keydown', onKey)
  // 左右栏目图表块（随 tab 动态渲染：核心指标维度 / 细分指标）
  renderPanelCharts()
  window.addEventListener('resize', onResize)
  setTimeout(onResize, 80)

  const hasWebGL = (() => { try { return !!document.createElement('canvas').getContext('webgl') } catch (e) { return false } })()
  if (!hasWebGL || store.mapMode === '2d') renderMap2D()
  else { try { renderMap3D() } catch (e) { renderMap2D() } }

  const msgs = [
    '旌阳区智慧养老服务中心收到紧急呼叫，已派单处理',
    '绵竹市第三敬老院完成今日食品安全巡检',
    '广汉市居家养老上门服务今日已完成 86 单',
    '罗江区社区长者食堂今日就餐人数突破 300 人次',
    '什邡市养老机构消防演练顺利进行',
    '中江县仓山镇独居老人烟感告警已解除',
    '德阳市民政局发布高温天气养老服务机构安全提示'
  ]
  timers.push(setInterval(() => {
    currentTicker.value = msgs[Math.floor(Math.random() * msgs.length)] + ' | ' + msgs[Math.floor(Math.random() * msgs.length)]
  }, 12000))

  // 从后端数据库接入数据（配置/点位/区县/告警）；失败则保留本地默认
  store.init().catch(() => {}).finally(() => {
    dataStore.loadAll().catch(() => {}).finally(hydrateFromStores)
  })

  // 实时同步：每 15s 重新拉取后台数据并水合，使后台的增删改自动反映到大屏
  timers.push(setInterval(() => {
    store.init().catch(() => {}).finally(() => {
      dataStore.loadAll().catch(() => {}).finally(hydrateFromStores)
    })
  }, 15000))
})

function onResize() {
  if (mapChart && !mapChart.isDisposed()) mapChart.resize()
  if (engine3d) engine3d.resize()
  allPanelInsts().forEach((c) => c.resize())
}

onBeforeUnmount(() => {
  timers.forEach(t => clearInterval(t))
  window.removeEventListener('resize', resize)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  if (engine3d) engine3d.dispose()
  allPanelInsts().forEach((c) => c.dispose())
  if (mapChart && !mapChart.isDisposed()) mapChart.dispose()
})
</script>

<style scoped>
:root {
  --primary: #00ffae;
  --secondary: #15d68a;
  --accent: #7cff5a;
  --warning: #ffaa00;
  --danger: #ff4d4d;
  --bg: #02130b;
  --panel: rgba(6, 40, 26, 0.72);
}

.screen {
  width: 1920px; height: 1080px; position: relative; transform-origin: 0 0;
  background: var(--bg);
  overflow: hidden;
  color: #e6f3ff;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

/* 背景层 */
.bg-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 40%, black 0%, transparent 70%);
}
.bg-radial {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 50% 38%, rgba(0, 100, 255, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 20% 80%, rgba(0, 160, 255, 0.07) 0%, transparent 30%),
    radial-gradient(circle at 85% 75%, rgba(0, 160, 255, 0.07) 0%, transparent 30%);
}
.bg-scan {
  position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  box-shadow: 0 0 20px var(--primary);
  animation: scanMove 5s linear infinite;
}
@keyframes scanMove { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
.bg-light { position: absolute; width: 420px; height: 420px; border-radius: 50%; filter: blur(80px); opacity: 0.12; }
.bg-light.left { left: -120px; top: 20%; background: var(--secondary); }
.bg-light.right { right: -120px; top: 30%; background: var(--primary); }

/* 顶部 */
.header {
  position: absolute; top: 0; left: 0; right: 0; height: 88px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; z-index: 100;
  background: linear-gradient(180deg, rgba(6,12,26,0.95) 0%, rgba(6,12,26,0.75) 70%, transparent 100%);
}
.header::before {
  content: ''; position: absolute; bottom: 0; left: 5%; right: 5%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.4), transparent);
}
.header-left { display: flex; align-items: center; gap: 16px; }
.logo {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,102,255,0.3));
  border: 1px solid rgba(0,240,255,0.35);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20px rgba(0,240,255,0.25);
}
.logo-svg { width: 28px; height: 28px; color: var(--primary); }
.title-group { display: flex; flex-direction: column; gap: 2px; }
.main-title {
  font-size: 28px; font-weight: 700; letter-spacing: 3px;
  color: #eafdff;
  text-shadow: 0 0 18px rgba(0,240,255,0.55), 0 2px 5px rgba(0,0,0,0.55);
}
.sub-title { font-size: 12px; color: rgba(0,200,255,0.8); letter-spacing: 2px; }

.header-nav { display: flex; align-items: center; gap: 8px; }
.nav-item {
  position: relative; padding: 10px 28px; cursor: pointer;
  font-size: 15px; color: rgba(174,238,255,0.75);
  border-radius: 24px; transition: all 0.3s; overflow: hidden;
  border: 1px solid transparent;
}
.nav-item:hover { color: #fff; background: rgba(0,240,255,0.08); }
.nav-item.active {
  color: #fff; font-weight: 600;
  background: linear-gradient(180deg, rgba(0,240,255,0.18), rgba(0,102,255,0.12));
  border-color: rgba(0,240,255,0.35);
  box-shadow: 0 0 20px rgba(0,240,255,0.25), inset 0 0 12px rgba(0,240,255,0.1);
}
.nav-glow {
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
}
.nav-item.active .nav-glow { animation: navShine 2.5s infinite; }
@keyframes navShine { 0% { left: -100%; } 100% { left: 100%; } }

.header-right { display: flex; align-items: center; gap: 16px; }
.weather-info {
  display: flex; align-items: center; gap: 8px; padding: 8px 16px;
  background: rgba(0,102,255,0.1); border: 1px solid rgba(0,240,255,0.2);
  border-radius: 20px; font-size: 14px; color: #d6f0ff;
}
.clock-box {
  padding: 8px 18px; font-size: 15px; font-weight: 600; color: var(--primary);
  background: rgba(0,102,255,0.1); border: 1px solid rgba(0,240,255,0.2);
  border-radius: 20px; letter-spacing: 1px;
  box-shadow: 0 0 15px rgba(0,240,255,0.1);
}
.admin-entry {
  display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px;
  border-radius: 24px; font-size: 14px; font-weight: 700; color: #ffffff;
  background: linear-gradient(180deg, #1e9cff, #0b5fd9);
  border: 1px solid rgba(255,255,255,0.65);
  box-shadow: 0 0 18px rgba(0,240,255,0.5);
  text-decoration: none; white-space: nowrap;
  transition: all 0.25s;
}
.admin-entry:hover { transform: translateY(-2px); box-shadow: 0 0 28px rgba(0,240,255,0.7); }

/* 播报条 */
.ticker {
  position: absolute; top: 92px; left: 50%; transform: translateX(-50%);
  width: 720px; height: 34px; z-index: 99;
  background: linear-gradient(90deg, rgba(0,102,255,0.1), rgba(0,240,255,0.08), rgba(0,102,255,0.1));
  border: 1px solid rgba(0,240,255,0.2); border-radius: 18px;
  display: flex; align-items: center; padding: 0 16px; gap: 10px;
}
.ticker-icon { color: var(--primary); animation: tickerBell 1.5s infinite; }
@keyframes tickerBell { 0%, 100% { opacity: 1; transform: rotate(0); } 50% { opacity: 0.6; transform: rotate(12deg); } }
.ticker-label {
  flex-shrink: 0; padding: 3px 10px; border-radius: 10px;
  background: rgba(0,240,255,0.15); color: var(--primary); font-size: 12px; font-weight: 600;
}
.ticker-content { flex: 1; overflow: hidden; white-space: nowrap; }
.ticker-content span { display: inline-block; color: #cfefff; font-size: 13px; animation: tickerScroll 20s linear infinite; padding-left: 100%; }
@keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

/* 主体布局 */
.main-layout {
  position: absolute; top: 128px; left: 0; right: 0; bottom: 116px;
  display: grid; grid-template-columns: 430px 1fr 430px; gap: 18px;
  padding: 0 24px;
}
.left-column, .right-column { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.left-column > .panel, .right-column > .panel { min-height: 0; }
.center-column { display: flex; flex-direction: column; }

/* 面板 */
.panel {
  flex: 1; position: relative; border-radius: 14px;
  background: var(--panel);
  border: 1px solid rgba(0,240,255,0.12);
  box-shadow: inset 0 0 30px rgba(0,102,255,0.06), 0 10px 30px rgba(0,0,0,0.25);
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-frame { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.panel-frame .corner { position: absolute; width: 16px; height: 16px; border: 2px solid var(--primary); opacity: 0.6; }
.panel-frame .corner.tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.panel-frame .corner.tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
.panel-frame .corner.bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
.panel-frame .corner.br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
.panel-glow {
  position: absolute; top: -1px; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  box-shadow: 0 0 12px var(--primary);
  animation: panelGlow 3s ease-in-out infinite;
}
@keyframes panelGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px; flex-shrink: 0;
  border-bottom: 1px solid rgba(0,240,255,0.08);
}
.panel-title { display: flex; align-items: center; gap: 10px; }
.title-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.15);
}
.title-icon.blue { background: linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,102,255,0.2)); color: var(--primary); }
.title-icon.orange { background: linear-gradient(135deg, rgba(255,170,0,0.2), rgba(255,77,77,0.15)); color: var(--warning); }
.title-icon.cyan { background: linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,102,255,0.2)); color: var(--accent); }
.title-icon.green { background: linear-gradient(135deg, rgba(0,255,204,0.2), rgba(0,240,255,0.15)); color: var(--accent); }
.title-text { font-size: 18px; font-weight: 600; color: #fff; letter-spacing: 1px; }
.more-link { font-size: 12px; color: rgba(0,200,255,0.8); cursor: pointer; transition: color 0.2s; }
.more-link:hover { color: var(--primary); }

.panel-body { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 10px 16px 14px; min-height: 0; }
.panel-body.tight { padding: 6px 10px 8px; gap: 0; }
.panel.dim { opacity: 0.4; filter: saturate(0.55); transition: opacity 0.3s, filter 0.3s; }

/* 栏目：KPI 面板固定高，图表块均分剩余空间 */
.panel-kpi { flex: 0 0 auto; }
.panel-header.slim { padding: 9px 12px 7px; }
.bar-mark { width: 3px; height: 14px; border-radius: 2px; box-shadow: 0 0 8px currentColor; }
.title-text.sm { font-size: 14px; font-weight: 600; letter-spacing: 0.4px; white-space: nowrap; }
.chip {
  font-size: 10px; color: rgba(160, 205, 235, 0.9); white-space: nowrap;
  background: rgba(0,102,255,0.14); border: 1px solid rgba(0,240,255,0.14);
  padding: 2px 7px; border-radius: 20px;
}
.chip em { font-style: normal; opacity: 0.6; }
.live-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 5px;
  background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: panelGlow 1.6s ease-in-out infinite;
}

/* 右栏标题条 */
.col-caption {
  display: flex; align-items: center; gap: 9px; flex-shrink: 0;
  font-size: 16px; font-weight: 600; color: #fff; letter-spacing: 1px;
}
.col-caption .cap-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,240,255,0.35), transparent); }
.title-icon.sm { width: 24px; height: 24px; border-radius: 6px; }
.title-icon.sm .icon-svg { width: 14px; height: 14px; }

.kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; flex-shrink: 0; }
.kpi-row.two-rows .kpi-mini { padding: 7px 8px 5px; }
.kpi-row.two-rows .kpi-num { font-size: 17px; }
.kpi-row.two-rows .kpi-spark { height: 13px; }
.kpi-mini {
  position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgba(0,102,255,0.16), rgba(0,102,255,0.03));
  border: 1px solid rgba(0,240,255,0.1); border-radius: 10px;
  padding: 8px 9px 6px; text-align: left; transition: all 0.3s;
}
.kpi-mini::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: var(--kc, var(--primary)); opacity: 0.75;
}
.kpi-mini:hover { transform: translateY(-2px); border-color: rgba(0,240,255,0.28); background: linear-gradient(160deg, rgba(0,102,255,0.24), rgba(0,102,255,0.06)); }
.kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.kpi-num { font-size: 19px; font-weight: 700; color: var(--kc, var(--primary)); line-height: 1.25; margin-top: 1px; }
.kpi-num em { font-size: 10px; color: rgba(174,238,255,0.6); font-style: normal; margin-left: 2px; }
.kpi-desc { font-size: 11px; color: rgba(200, 230, 255, 0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-trend { font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; white-space: nowrap; }
.kpi-trend.up { color: #36e0a0; background: rgba(54,224,160,0.12); }
.kpi-trend.down { color: #ff6b6b; background: rgba(255,107,107,0.12); }
.kpi-spark { display: flex; align-items: flex-end; gap: 1.5px; height: 16px; margin-top: 5px; opacity: 0.75; }
.kpi-spark i {
  flex: 1; min-height: 2px; border-radius: 1px;
  background: linear-gradient(180deg, var(--kc, var(--primary)), rgba(0,240,255,0.08));
}

.chart-wrap { flex: 1 1 auto; min-height: 110px; position: relative; }
.chart-box { position: absolute; inset: 0; width: 100%; height: 100%; }

.rank-list { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.rank-item { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.rank-no { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-weight: 700; font-size: 11px; }
.rank-no.no-1 { background: linear-gradient(135deg, #ff4d4d, #ff7700); color: #fff; }
.rank-no.no-2 { background: linear-gradient(135deg, #ffaa00, #ffcc00); color: #fff; }
.rank-no.no-3 { background: linear-gradient(135deg, #00f0ff, #0066ff); color: #fff; }
.rank-name { width: 88px; color: rgba(255,255,255,0.92); }
.rank-bar { flex: 1; height: 6px; background: rgba(0,102,255,0.12); border-radius: 3px; overflow: hidden; }
.rank-bar i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--primary), var(--secondary)); box-shadow: 0 0 8px rgba(0,240,255,0.4); }
.rank-value { width: 64px; text-align: right; color: var(--primary); font-weight: 600; }

.info-tags { display: flex; gap: 12px; flex-shrink: 0; }
.info-tag {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: rgba(0,102,255,0.1); border-radius: 8px; font-size: 12px; color: rgba(205, 230, 255, 0.92);
}
.info-tag b { color: var(--primary); margin: 0 3px; }
.info-tag b.danger { color: var(--danger); }
.dot { width: 7px; height: 7px; border-radius: 50%; }
.dot.online { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.dot.warn { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
.dot.blue { background: var(--primary); box-shadow: 0 0 8px var(--primary); }
.dot.green { background: var(--accent); box-shadow: 0 0 8px var(--accent); }

/* 中间地图 */
.map-card {
  flex: 1; position: relative; border-radius: 16px;
  background: radial-gradient(circle at center, rgba(0, 90, 220, 0.16) 0%, transparent 65%);
  border: 1px solid rgba(0, 160, 255, 0.16);
  overflow: hidden;
}
.map-frame { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.map-frame .corner { position: absolute; width: 28px; height: 28px; border: 2px solid rgba(0,240,255,0.5); }
.map-frame .corner.tl { top: 14px; left: 14px; border-right: none; border-bottom: none; }
.map-frame .corner.tr { top: 14px; right: 14px; border-left: none; border-bottom: none; }
.map-frame .corner.bl { bottom: 14px; left: 14px; border-right: none; border-top: none; }
.map-frame .corner.br { bottom: 14px; right: 14px; border-left: none; border-top: none; }

.map-header { position: absolute; top: 18px; left: 0; right: 0; text-align: center; z-index: 10; }
.map-title { font-size: 24px; font-weight: 700; color: var(--primary); letter-spacing: 4px; text-shadow: 0 0 20px rgba(0,255,174,0.5); }
.map-subtitle { font-size: 11px; color: rgba(0,200,255,0.75); letter-spacing: 3px; margin-top: 4px; }

#mapChart { position: absolute; inset: 0; z-index: 5; }

/* 3D 引擎画布宿主（零依赖 Canvas 2.5D） */
.map-canvas { position: absolute; inset: 0; z-index: 5; display: none; }
.map3d-canvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
.map3d-canvas:active { cursor: grabbing; }

/* 悬停提示 */
.map-tip {
  position: absolute; z-index: 30; pointer-events: none;
  transform: translate(-50%, -130%);
  padding: 5px 10px; border-radius: 6px;
  font-size: 12px; color: #eaffff; white-space: nowrap;
  background: rgba(2, 14, 30, 0.85);
  border: 1px solid var(--tc, rgba(0, 220, 255, 0.6));
  box-shadow: 0 0 14px color-mix(in srgb, var(--tc, #00f0ff) 45%, transparent);
}

.map-toolbar {
  position: absolute; top: 70px; right: 20px; z-index: 15;
  display: flex; gap: 8px; padding: 4px; border-radius: 20px;
  background: rgba(2,6,23,0.6); border: 1px solid rgba(0,240,255,0.15);
}
.tool-btn {
  width: 36px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 14px; font-size: 12px; color: rgba(174,238,255,0.7); cursor: pointer; transition: all 0.2s;
}
.tool-btn { border: 1px solid transparent; }
.tool-btn:hover { color: #fff; background: rgba(0,240,255,0.1); }
.tool-btn.active { color: #021; font-weight: 700; background: linear-gradient(180deg, var(--primary), var(--secondary)); border-color: rgba(255,255,255,0.35); box-shadow: 0 0 12px rgba(0,255,174,0.5); }

.map-decor { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
.map-ring {
  position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%);
  border-radius: 50%; border: 1px dashed rgba(0, 160, 255, 0.18);
}
.map-ring.ring-1 { width: 360px; height: 360px; animation: ringRotate 30s linear infinite; }
.map-ring.ring-2 { width: 480px; height: 480px; animation: ringRotate 40s linear infinite reverse; }
.map-ring.ring-3 { width: 600px; height: 600px; animation: ringRotate 50s linear infinite; }
@keyframes ringRotate { from { transform: translate(-50%, -50%) rotate(0); } to { transform: translate(-50%, -50%) rotate(360deg); } }

.map-crosshair { position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); width: 700px; height: 700px; z-index: 2; }
.map-crosshair span { position: absolute; width: 24px; height: 24px; border: 2px solid rgba(0, 160, 255, 0.15); }
.map-crosshair span:nth-child(1) { top: 0; left: 0; border-right: none; border-bottom: none; }
.map-crosshair span:nth-child(2) { top: 0; right: 0; border-left: none; border-bottom: none; }
.map-crosshair span:nth-child(3) { bottom: 0; left: 0; border-right: none; border-top: none; }
.map-crosshair span:nth-child(4) { bottom: 0; right: 0; border-left: none; border-top: none; }

/* 雷达扫描扇形 */
.map-radar {
  position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%);
  width: 620px; height: 620px; border-radius: 50%; z-index: 2; pointer-events: none;
  background: conic-gradient(from 0deg, rgba(0,160,255,0) 0deg, rgba(0,160,255,0) 300deg, rgba(0,160,255,0.35) 350deg, rgba(120,210,255,0.5) 360deg);
  mask-image: radial-gradient(circle, transparent 8%, black 9%, black 55%, transparent 56%);
  -webkit-mask-image: radial-gradient(circle, transparent 8%, black 9%, black 55%, transparent 56%);
  animation: radarSpin 4s linear infinite;
  opacity: 0.6;
}
@keyframes radarSpin { from { transform: translate(-50%, -50%) rotate(0); } to { transform: translate(-50%, -50%) rotate(360deg); } }

/* 水平扫描线 */
.map-scan-h {
  position: absolute; left: 6%; right: 6%; height: 120px; z-index: 4; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(0, 120, 255, 0.14) 60%, rgba(0, 200, 255, 0.38), rgba(0, 120, 255, 0.14) 40%, transparent);
  filter: blur(1px);
  animation: scanV 6s ease-in-out infinite;
}
@keyframes scanV { 0% { top: 12%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 88%; opacity: 0; } }

/* 中心脉冲光晕 */
.map-pulse-center {
  position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%);
  width: 40px; height: 40px; border-radius: 50%; z-index: 4; pointer-events: none;
  background: radial-gradient(circle, rgba(0, 160, 255, 0.5) 0%, transparent 70%);
  box-shadow: 0 0 30px rgba(0, 160, 255, 0.6);
  animation: pulseCenter 2.4s ease-in-out infinite;
}
@keyframes pulseCenter { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); } }

/* 区域发光描边增强 */
.map-glow-edge {
  position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%);
  width: 560px; height: 560px; border-radius: 50%; z-index: 1; pointer-events: none;
  box-shadow: inset 0 0 80px rgba(0, 120, 255, 0.14);
  border: 1px solid rgba(0, 160, 255, 0.1);
}

.alert-float {
  position: absolute; top: 120px; left: 24px; z-index: 20;
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: rgba(255, 77, 77, 0.12); border: 1px solid rgba(255, 77, 77, 0.35);
  border-radius: 8px; font-size: 13px; color: #ffd4d4;
  animation: floatAlert 3s ease-in-out infinite;
}
.alert-pulse {
  width: 8px; height: 8px; border-radius: 50%; background: var(--danger);
  box-shadow: 0 0 10px var(--danger);
  animation: alertPulse 1.2s infinite;
}
@keyframes alertPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.4); } }
@keyframes floatAlert { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

.map-legend {
  position: absolute; bottom: 20px; right: 20px; z-index: 15;
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; border-radius: 10px;
  background: rgba(2,6,23,0.65); border: 1px solid rgba(0,240,255,0.12);
}
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #d6f0ff; }
.legend-item i { width: 8px; height: 8px; border-radius: 50%; }
.legend-item i.org { background: var(--warning); box-shadow: 0 0 6px var(--warning); }
.legend-item i.com { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.legend-item i.home { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.legend-item i.gov { background: #36e0a0; box-shadow: 0 0 6px #36e0a0; }
.legend-item i.alarm { background: var(--danger); box-shadow: 0 0 6px var(--danger); }
.legend-item i.med { background: #4d8bff; box-shadow: 0 0 6px #4d8bff; }
.legend-item i.elder { background: #ffb020; box-shadow: 0 0 6px #ffb020; }

/* 底部 KPI */
.bottom-bar {
  position: absolute; bottom: 18px; left: 24px; right: 24px; height: 92px;
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; z-index: 50;
}
.bottom-card {
  position: relative; border-radius: 12px; overflow: hidden;
  background: linear-gradient(180deg, rgba(0,102,255,0.15) 0%, rgba(0,102,255,0.04) 100%);
  border: 1px solid rgba(0,240,255,0.15);
  display: flex; align-items: center; gap: 14px; padding: 0 18px;
}
.bottom-glow {
  position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,0.1), transparent);
  animation: bottomShine 4s infinite;
}
.bottom-card:nth-child(2) .bottom-glow { animation-delay: 0.6s; }
.bottom-card:nth-child(3) .bottom-glow { animation-delay: 1.2s; }
.bottom-card:nth-child(4) .bottom-glow { animation-delay: 1.8s; }
.bottom-card:nth-child(5) .bottom-glow { animation-delay: 2.4s; }
.bottom-card:nth-child(6) .bottom-glow { animation-delay: 3s; }
@keyframes bottomShine { 0% { left: -100%; } 100% { left: 100%; } }
.bottom-icon {
  width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.2);
  color: var(--c, var(--primary));
  box-shadow: 0 0 14px rgba(0,240,255,0.15);
}
.bottom-icon svg { width: 22px; height: 22px; stroke: currentColor; }
.bottom-info { flex: 1; }
.bottom-value { font-size: 24px; font-weight: 700; color: #fff; }
.bottom-value em { font-size: 12px; color: rgba(174,238,255,0.6); font-style: normal; margin-left: 4px; }
.bottom-label { font-size: 12px; color: rgba(200, 230, 255, 0.85); margin-top: 2px; }
.bottom-trend { font-size: 12px; font-weight: 600; }
.bottom-trend.up { color: var(--accent); }
.bottom-trend.down { color: var(--danger); }

.icon-svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* ===== 点位详情弹窗 ===== */
.detail-mask {
  position: absolute; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(2, 6, 18, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.detail-card {
  position: relative; width: 440px; max-width: 86vw;
  border-radius: 16px; padding: 22px 24px 18px;
  background: linear-gradient(160deg, rgba(10, 26, 58, 0.96), rgba(6, 16, 38, 0.96));
  border: 1px solid rgba(0, 240, 255, 0.25);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 240, 255, 0.08),
    inset 0 0 30px rgba(0, 120, 255, 0.12);
  color: #e6f3ff;
}
.detail-card::before {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px;
  border-radius: 16px 16px 0 0;
  background: linear-gradient(90deg, transparent, var(--dcolor), transparent);
  box-shadow: 0 0 18px var(--dcolor);
}
.detail-close {
  position: absolute; top: 14px; right: 14px; width: 30px; height: 30px;
  border-radius: 8px; border: 1px solid rgba(0, 240, 255, 0.25);
  background: rgba(0, 102, 255, 0.12); color: #cfeaff; font-size: 20px; line-height: 1;
  cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.detail-close:hover { background: rgba(255, 77, 77, 0.2); border-color: rgba(255, 77, 77, 0.5); color: #fff; transform: rotate(90deg); }
.detail-head { padding-right: 36px; margin-bottom: 16px; }
.detail-cat {
  display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; border-radius: 12px;
  font-size: 12px; font-weight: 600; color: var(--dcolor);
  background: color-mix(in srgb, var(--dcolor) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcolor) 45%, transparent);
}
.d-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dcolor); box-shadow: 0 0 8px var(--dcolor); }
.detail-name { margin: 12px 0 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; color: #fff; text-shadow: 0 0 16px rgba(0, 255, 174, 0.35); }
.detail-body { display: flex; flex-direction: column; gap: 2px; }
.detail-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 4px; border-bottom: 1px dashed rgba(0, 240, 255, 0.1);
}
.detail-row:last-of-type { border-bottom: none; }
.detail-k { font-size: 13px; color: rgba(180, 215, 245, 0.85); }
.detail-v { font-size: 14px; font-weight: 600; color: #eafdff; }
.detail-v.hot { color: var(--dcolor); text-shadow: 0 0 12px color-mix(in srgb, var(--dcolor) 60%, transparent); }
.detail-desc {
  margin-top: 12px; padding: 12px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.7;
  color: rgba(205, 230, 255, 0.9);
  background: rgba(0, 102, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.12);
}
.detail-foot { margin-top: 14px; text-align: right; font-size: 11px; color: rgba(150, 190, 230, 0.6); letter-spacing: 0.5px; }

.detail-fade-enter-active, .detail-fade-leave-active { transition: opacity 0.25s ease; }
.detail-fade-enter-from, .detail-fade-leave-to { opacity: 0; }
.detail-fade-enter-active .detail-card { animation: cardPop 0.32s cubic-bezier(0.2, 0.8, 0.2, 1); }
@keyframes cardPop { from { transform: translateY(18px) scale(0.95); opacity: 0; } to { transform: none; opacity: 1; } }

/* 提示：地图点位可点击 */
.map-hint {
  position: absolute; top: 70px; left: 20px; z-index: 15;
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px;
  font-size: 12px; color: #cfeaff; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(0, 240, 255, 0.15);
  animation: hintPulse 2.4s ease-in-out infinite;
}
.map-hint i { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); }
@keyframes hintPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

/* 返回市级按钮 */
/* 返回（市级）按钮：幽灵/描边风格，弱化为主动操作的次要点，不再抢眼的实心绿 */
.tool-btn.back { color: var(--primary); font-weight: 600; background: rgba(0, 255, 174, 0.08); border: 1px solid rgba(0, 255, 174, 0.4); animation: none; }
.tool-btn.back:hover { background: rgba(0, 255, 174, 0.16); box-shadow: 0 0 14px rgba(0, 255, 174, 0.45); color: #aafff0; }

/* 区县下钻轮廓板块 */
.district-panel {
  position: absolute; top: 70px; right: 20px; width: 344px; max-height: calc(100% - 120px);
  z-index: 18; display: flex; flex-direction: column; gap: 12px;
  border-radius: 14px; padding: 14px; overflow: hidden;
  background: linear-gradient(160deg, rgba(8,24,54,0.95), rgba(4,12,30,0.95));
  border: 1px solid rgba(0,240,255,0.25);
  box-shadow: 0 18px 50px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,120,255,0.1);
  backdrop-filter: blur(8px);
}
.dp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0; }
.dp-crumb { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #cfeaff; }
.dp-crumb i { opacity: 0.5; font-style: normal; }
.dp-crumb b { color: var(--primary); font-size: 17px; letter-spacing: 1px; text-shadow: 0 0 12px rgba(0,255,174,0.4); }
.dp-back { padding: 5px 14px; border-radius: 14px; font-size: 12px; color: var(--primary); font-weight: 600; cursor: pointer; background: rgba(0, 255, 174, 0.08); border: 1px solid rgba(0, 255, 174, 0.4); transition: all 0.2s; white-space: nowrap; }
.dp-back:hover { background: rgba(0, 255, 174, 0.16); box-shadow: 0 0 14px rgba(0, 255, 174, 0.45); color: #aafff0; transform: translateY(-1px); }
.dp-outline { position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 45%, rgba(0,120,255,0.14), transparent 70%); border-radius: 10px; padding: 4px; flex-shrink: 0; }
.dp-svg { width: 100%; height: 158px; }
.dp-path { fill: rgba(0,200,255,0.16); stroke: var(--primary); stroke-width: 1.1; filter: drop-shadow(0 0 5px rgba(0,240,255,0.6)); }
.dp-dot { filter: drop-shadow(0 0 3px currentColor); }
.dp-outline-tip { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); font-size: 11px; color: rgba(185,222,246,0.9); white-space: nowrap; }
.dp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; flex-shrink: 0; }
.dp-stat { background: rgba(0,102,255,0.1); border: 1px solid rgba(0,240,255,0.12); border-radius: 8px; padding: 8px 4px; text-align: center; }
.dp-stat span { display: block; font-size: 10.5px; color: rgba(185,218,245,0.85); }
.dp-stat b { display: block; margin-top: 4px; font-size: 14px; color: var(--primary); }
.dp-list-head { font-size: 12px; color: rgba(0,200,255,0.85); letter-spacing: 0.5px; border-left: 3px solid var(--primary); padding-left: 8px; flex-shrink: 0; }
.dp-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; min-height: 60px; }
.dp-list::-webkit-scrollbar { width: 5px; }
.dp-list::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.3); border-radius: 3px; }
.dp-point { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 8px; cursor: pointer; background: rgba(0,102,255,0.07); border: 1px solid rgba(0,240,255,0.08); transition: all 0.2s; }
.dp-point:hover { background: rgba(0,102,255,0.16); border-color: rgba(0,240,255,0.3); transform: translateX(2px); }
.dp-pdot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 6px currentColor; }
.dp-pname { flex: 1; font-size: 12.5px; color: #e6f3ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-pcat { font-size: 11px; font-weight: 600; flex-shrink: 0; }
.dp-empty { text-align: center; font-size: 12px; color: rgba(170,205,235,0.7); padding: 20px 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.dp-slide-enter-active, .dp-slide-leave-active { transition: all 0.32s cubic-bezier(0.2,0.8,0.2,1); }
.dp-slide-enter-from, .dp-slide-leave-to { opacity: 0; transform: translateX(34px); }
</style>
