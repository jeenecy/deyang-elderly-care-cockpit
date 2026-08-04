<template>
  <div class="dash">
    <!-- KPI 卡片 + 迷你趋势线 -->
    <div class="stat-row">
      <div class="a-card stat-card" v-for="s in stats" :key="s.label">
        <div class="row" style="gap:14px">
          <div class="stat-ico" :style="{ color: s.color, background: hexA(s.color, .12), borderColor: hexA(s.color, .3) }">
            <IconSvg :name="s.icon" />
          </div>
          <div class="a-stat">
            <div class="num">{{ s.value }}</div>
            <div class="lbl">{{ s.label }}</div>
          </div>
        </div>
        <div class="trend" :class="s.up ? 'up' : 'down'">{{ s.up ? '▲' : '▼' }} {{ s.trend }}</div>
        <svg class="spark" viewBox="0 0 120 34" preserveAspectRatio="none">
          <defs>
            <linearGradient :id="'sg' + s.key" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="s.color" stop-opacity=".35" />
              <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path :d="sparkArea(s.series)" :fill="'url(#sg' + s.key + ')'" />
          <path :d="sparkLine(s.series)" fill="none" :stroke="s.color" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      </div>
    </div>

    <!-- 老年人口趋势 + 服务资源构成 -->
    <div class="grid-32">
      <div class="a-card">
        <div class="a-card-title">六区县老年人口态势
          <span class="sub">2021—2026 · 单位：万人</span>
          <div class="spacer"></div>
          <div class="seg">
            <button v-for="m in ['趋势', '对比']" :key="m" class="seg-btn" :class="{ on: popMode === m }" @click="popMode = m">{{ m }}</button>
          </div>
        </div>
        <div ref="popEl" class="chart chart-h"></div>
      </div>

      <div class="a-card">
        <div class="a-card-title">服务资源构成<span class="sub">实时联动业务数据</span></div>
        <div ref="pieEl" class="chart chart-h"></div>
      </div>
    </div>

    <!-- 近7日服务量 + 告警等级 + 最新告警 -->
    <div class="grid-32">
      <div class="a-card">
        <div class="a-card-title">近 7 日服务与告警走势<span class="sub">工单量 / 告警数</span></div>
        <div ref="weekEl" class="chart chart-m"></div>
      </div>

      <div class="a-card">
        <div class="a-card-title">最新告警
          <div class="spacer"></div>
          <router-link class="more" :to="{ name: 'admin-alert' }">全部 ›</router-link>
        </div>
        <div class="alarm-list">
          <div class="alarm" v-for="a in alarms" :key="a.id">
            <span class="lvl" :class="'lvl-' + lvlKey(a.level)">{{ a.level }}级</span>
            <div class="alarm-body">
              <div class="alarm-title">{{ a.title }}</div>
              <div class="alarm-meta">{{ a.area }} · {{ a.time }}</div>
            </div>
            <span class="a-tag" :class="stateClass(a.state)">{{ a.state }}</span>
          </div>
          <div class="alarm muted" v-if="alarms.length === 0">暂无告警</div>
        </div>
      </div>
    </div>

    <!-- 机构床位使用率排行 -->
    <div class="a-card">
      <div class="a-card-title">机构床位使用率 TOP<span class="sub">入住率由高到低</span></div>
      <div ref="bedEl" class="chart chart-m"></div>
    </div>

    <div class="a-card">
      <div class="a-card-title">功能快捷入口</div>
      <div class="quick">
        <router-link v-for="q in quick" :key="q.name" :to="{ name: q.name }" class="quick-card">
          <div class="quick-ico"><IconSvg :name="q.icon" /></div>
          <div>
            <div class="quick-name">{{ q.title }}</div>
            <div class="quick-desc">{{ q.desc }}</div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import { useChart, CHART, baseGrid, baseTooltip, axisStyle, grad } from '../../composables/useChart.js'

const store = useDataStore()

/* ============ KPI ============ */
const stats = computed(() => [
  { key: 'a', label: '养老服务机构', value: store.stats.institutions + ' 家', icon: 'database', color: '#00f0ff', up: true, trend: '3.2%', series: [18, 19, 19, 20, 21, 21, 22, store.stats.institutions] },
  { key: 'b', label: '养老床位总数', value: store.stats.beds.toLocaleString() + ' 张', icon: 'grid', color: '#00ffcc', up: true, trend: '1.8%', series: [1180, 1220, 1240, 1290, 1330, 1380, 1420, store.stats.beds] },
  { key: 'c', label: '居家服务工单', value: store.stats.orders + ' 单', icon: 'shield', color: '#0066ff', up: true, trend: '5.4%', series: [4, 6, 5, 8, 7, 9, 8, store.stats.orders] },
  { key: 'd', label: '待处理告警', value: store.stats.alertsActive + ' 起', icon: 'bell', color: '#ff4d4d', up: false, trend: '12.0%', series: [6, 5, 7, 4, 5, 3, 4, store.stats.alertsActive] },
  { key: 'e', label: '关怀对象档案', value: store.stats.elderly + ' 人', icon: 'user', color: '#ffb020', up: true, trend: '在档 ' + store.stats.elderlyActive, series: [3, 4, 4, 5, 6, 7, 7, store.stats.elderly] }
])

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function pts(arr) {
  const max = Math.max(...arr), min = Math.min(...arr)
  const span = max - min || 1
  return arr.map((v, i) => [i * (120 / (arr.length - 1)), 30 - ((v - min) / span) * 24])
}
function sparkLine(arr) {
  return pts(arr).map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
}
function sparkArea(arr) {
  const p = pts(arr)
  const last = p[p.length - 1][0].toFixed(1)
  return `${sparkLine(arr)} L${last} 34 L0 34 Z`
}

/* ============ 老年人口 ============ */
const years = ['2021', '2022', '2023', '2024', '2025', '2026']
const popData = [
  { name: '中江县', values: [16.1, 16.7, 17.2, 17.6, 18.0, 18.3] },
  { name: '旌阳区', values: [10.8, 11.2, 11.6, 12.0, 12.3, 12.6] },
  { name: '广汉市', values: [7.9, 8.2, 8.5, 8.7, 8.9, 9.1] },
  { name: '绵竹市', values: [5.9, 6.1, 6.3, 6.5, 6.6, 6.8] },
  { name: '什邡市', values: [4.6, 4.8, 5.0, 5.1, 5.3, 5.4] },
  { name: '罗江区', values: [3.5, 3.7, 3.8, 4.0, 4.1, 4.2] }
]
const popMode = ref('趋势')

const { el: popEl } = useChart(() => {
  if (popMode.value === '对比') {
    const sorted = [...popData].sort((a, b) => a.values[5] - b.values[5])
    return {
      grid: { ...baseGrid, left: 68, right: 46 },
      tooltip: { ...baseTooltip, axisPointer: { type: 'shadow' }, valueFormatter: (v) => v + ' 万人' },
      xAxis: { type: 'value', ...axisStyle() },
      yAxis: { type: 'category', data: sorted.map((d) => d.name), ...axisStyle(false) },
      series: [{
        type: 'bar', barWidth: 14, data: sorted.map((d) => d.values[5]),
        itemStyle: { borderRadius: [0, 7, 7, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: CHART.blue }, { offset: 1, color: CHART.primary }] } },
        label: { show: true, position: 'right', color: CHART.primary, fontSize: 11, formatter: '{c} 万' },
        animationDelay: (i) => i * 70
      }]
    }
  }
  return {
    color: CHART.palette,
    grid: { ...baseGrid, top: 46 },
    tooltip: { ...baseTooltip, valueFormatter: (v) => v + ' 万人' },
    legend: { data: popData.map((d) => d.name), top: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: CHART.text, fontSize: 11 } },
    xAxis: { type: 'category', boundaryGap: false, data: years, ...axisStyle(false) },
    yAxis: { type: 'value', name: '万人', nameTextStyle: { color: CHART.text, fontSize: 11 }, ...axisStyle() },
    series: popData.map((d, i) => ({
      name: d.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { width: 2 }, data: d.values,
      areaStyle: i === 0 ? { color: grad('rgba(0,240,255,0.28)', 'rgba(0,240,255,0)') } : undefined,
      animationDelay: (idx) => idx * 40 + i * 60
    }))
  }
}, [popMode])

/* ============ 服务资源构成 ============ */
const { el: pieEl } = useChart(() => {
  const s = store.stats
  const data = [
    { name: '机构床位', value: s.beds },
    { name: '在院老人', value: s.elders },
    { name: '社区设施', value: s.facilities * 40 },
    { name: '居家工单', value: s.orders * 30 },
    { name: '物联设备', value: s.devices * 25 }
  ]
  return {
    color: CHART.palette,
    tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}<br/>折算权重 {c} ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: CHART.text, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['48%', '70%'], center: ['50%', '44%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: 'rgba(6,18,38,0.9)', borderWidth: 2 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6, label: { show: true, color: '#fff', fontSize: 13, fontWeight: 600, formatter: '{b}\n{d}%' } },
      data
    }, {
      type: 'pie', radius: ['0%', '40%'], center: ['50%', '44%'], silent: true,
      itemStyle: { color: 'rgba(0,102,255,0.05)' }, label: { show: false }, data: [{ value: 1 }]
    }],
    graphic: {
      type: 'text', left: 'center', top: '39%',
      style: { text: s.institutions + ' 家', fill: CHART.primary, fontSize: 20, fontWeight: 700, textAlign: 'center' }
    }
  }
}, [() => store.stats])

/* ============ 近 7 日走势 ============ */
const week = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const { el: weekEl } = useChart(() => ({
  grid: { ...baseGrid, top: 42, right: 40 },
  tooltip: baseTooltip,
  legend: { data: ['服务工单', '告警数'], top: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: CHART.text, fontSize: 11 } },
  xAxis: { type: 'category', data: week, ...axisStyle(false) },
  yAxis: [
    { type: 'value', name: '工单', nameTextStyle: { color: CHART.text, fontSize: 11 }, ...axisStyle() },
    { type: 'value', name: '告警', nameTextStyle: { color: CHART.text, fontSize: 11 }, ...axisStyle(false) }
  ],
  series: [
    {
      name: '服务工单', type: 'bar', barWidth: 18, data: [142, 168, 155, 189, 176, 132, 148],
      itemStyle: { borderRadius: [6, 6, 0, 0], color: grad('rgba(0,240,255,0.9)', 'rgba(0,102,255,0.25)') },
      animationDelay: (i) => i * 60
    },
    {
      name: '告警数', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6,
      data: [8, 12, 9, 15, 11, 6, 7], lineStyle: { width: 2.4, color: CHART.warn },
      itemStyle: { color: CHART.warn }, areaStyle: { color: grad('rgba(255,170,0,0.22)', 'rgba(255,170,0,0)') }
    }
  ]
}))

/* ============ 床位使用率 ============ */
const { el: bedEl } = useChart(() => {
  const list = [...store.institutions]
    .map((i) => ({ name: i.name.length > 10 ? i.name.slice(0, 9) + '…' : i.name, rate: parseFloat(i.occupancy) || 0, beds: i.beds }))
    .sort((a, b) => b.rate - a.rate)
  return {
    grid: { ...baseGrid, bottom: 56, right: 30 },
    tooltip: { ...baseTooltip, axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>入住率 ${p[0].value}%<br/>床位 ${list[p[0].dataIndex].beds} 张` },
    xAxis: { type: 'category', data: list.map((l) => l.name), ...axisStyle(false), axisLabel: { color: CHART.text, fontSize: 11, rotate: 22, interval: 0 } },
    yAxis: { type: 'value', max: 100, name: '%', nameTextStyle: { color: CHART.text, fontSize: 11 }, ...axisStyle() },
    series: [{
      type: 'bar', barWidth: 22, data: list.map((l) => l.rate),
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: (p) => (p.value >= 90 ? grad('#00ffcc', 'rgba(0,255,204,0.15)') : p.value >= 60 ? grad('#00f0ff', 'rgba(0,240,255,0.12)') : grad('#ffaa00', 'rgba(255,170,0,0.12)'))
      },
      label: { show: true, position: 'top', color: CHART.text, fontSize: 11, formatter: '{c}%' },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ yAxis: 85, label: { formatter: '预警线 85%', color: CHART.warn, fontSize: 10 }, lineStyle: { color: 'rgba(255,170,0,.6)', type: 'dashed' } }]
      },
      animationDelay: (i) => i * 70
    }]
  }
}, [() => store.institutions])

/* ============ 告警列表 ============ */
const alarms = computed(() => store.alerts.slice(0, 5))
function lvlKey(l) { return l === '紧急' ? 'red' : l === '严重' ? 'orange' : l === '提示' ? 'blue' : 'yellow' }
function stateClass(s) {
  if (s === '已解决') return 'green'
  if (s === '待处理') return 'red'
  if (s === '处理中') return 'orange'
  return 'gray'
}

const quick = [
  { name: 'admin-data-manage', title: '业务数据管理', desc: '四大模块台账与流水', icon: 'database' },
  { name: 'admin-elder', title: '老人档案管理', desc: '档案 / 健康标签 / 紧急联系人', icon: 'user' },
  { name: 'admin-vis-config', title: '可视化配置', desc: '大屏模块 / 地图 / 主题', icon: 'sliders' },
  { name: 'admin-alert', title: '告警预警中心', desc: '规则与处置闭环', icon: 'bell' },
  { name: 'admin-iot', title: '物联设备管理', desc: '设备注册与监控', icon: 'cpu' },
  { name: 'admin-permission', title: '权限与组织', desc: '机构树 / 角色 / 用户', icon: 'shield' },
  { name: 'admin-monitor', title: '监控与运维', desc: '大屏心跳与告警规则', icon: 'activity' }
]
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 18px; }
.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 18px; }
.stat-card { position: relative; overflow: hidden; }
.stat-ico { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--c-line2); }
.stat-ico svg { width: 24px; height: 24px; }
.trend { position: absolute; top: 16px; right: 16px; font-size: 12px; }
.trend.up { color: var(--c-accent); } .trend.down { color: var(--c-danger); }
.spark { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 34px; opacity: .85; pointer-events: none; }

.grid-32 { display: grid; grid-template-columns: 1.55fr 1fr; gap: 18px; }
.chart { width: 100%; }
.chart-h { height: 288px; }
.chart-m { height: 250px; }

.seg { display: flex; background: rgba(0, 102, 255, .1); border: 1px solid var(--c-line); border-radius: 8px; overflow: hidden; }
.seg-btn { padding: 4px 12px; font-size: 12px; color: var(--c-muted); background: transparent; border: none; cursor: pointer; transition: all .2s; }
.seg-btn.on { color: #041018; background: linear-gradient(90deg, #00f0ff, #00ffcc); font-weight: 600; }
.more { font-size: 12px; color: var(--c-primary); }

.alarm-list { display: flex; flex-direction: column; gap: 10px; }
.alarm { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: rgba(0, 102, 255, .06); border-radius: 9px; transition: all .2s; }
.alarm:hover { background: rgba(0, 240, 255, .09); transform: translateX(2px); }
.alarm-body { flex: 1; min-width: 0; }
.alarm-title { font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alarm-meta { font-size: 12px; color: var(--c-muted); margin-top: 2px; }
.lvl { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.lvl-red { color: #ff4d4d; background: rgba(255, 77, 77, 0.14); }
.lvl-orange { color: #ffaa00; background: rgba(255, 170, 0, 0.14); }
.lvl-yellow { color: #ffd400; background: rgba(255, 212, 0, 0.14); }
.lvl-blue { color: #3b82f6; background: rgba(59, 130, 246, 0.16); }

.quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.quick-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 11px;
  background: rgba(0, 102, 255, .07); border: 1px solid var(--c-line); transition: all .25s cubic-bezier(.16, 1, .3, 1); }
.quick-card:hover { transform: translateY(-3px); border-color: var(--c-line2); box-shadow: 0 8px 22px rgba(0, 240, 255, .16); }
.quick-ico { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
  color: var(--c-primary); background: rgba(0, 240, 255, .1); border: 1px solid var(--c-line2); }
.quick-name { font-size: 15px; color: #fff; font-weight: 600; }
.quick-desc { font-size: 12px; color: var(--c-muted); margin-top: 2px; }

@media (max-width: 1400px) {
  .stat-row { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .grid-32 { grid-template-columns: 1fr; }
  .quick { grid-template-columns: repeat(2, 1fr); }
}
</style>
