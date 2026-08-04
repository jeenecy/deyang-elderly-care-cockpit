<template>
  <div class="wrap-col">
    <!-- 板块切换 -->
    <div class="a-card">
      <div class="a-card-title">大屏板块数据配置<span class="sub">实时联动驾驶舱大屏 · 前后端数据一致</span></div>
      <div class="seg section-tabs">
        <button v-for="t in tabs" :key="t.key" :class="{ on: tab === t.key }" @click="tab = t.key">
          <i class="dot" :style="{ background: t.color }"></i>{{ t.name }}
        </button>
      </div>
    </div>

    <!-- 综合概览（只读汇总） -->
    <div v-if="tab === 'overview'" class="a-card">
      <div class="a-card-title">综合概览<span class="sub">由四板块实时汇总，只读</span></div>
      <div class="ov-kpis">
        <div class="ov-kpi" v-for="k in secStore.overview.kpis" :key="k.label">
          <div class="ov-val">{{ k.value }}<em>{{ k.unit }}</em></div>
          <div class="ov-lab">{{ k.label }}</div>
          <div class="ov-tr" :class="k.trend >= 0 ? 'up' : 'down'">{{ k.trend > 0 ? '↑' : '↓' }} {{ Math.abs(k.trend) }}%</div>
        </div>
      </div>
      <p class="hint">综合概览的 KPI 与图表均由「政府监管 / 机构养老 / 社区养老 / 居家养老」四板块数据实时汇总得出。修改任一板块数据，概览将自动同步。</p>
      <div class="ov-blocks">
        <div class="ov-block" v-for="b in [...secStore.overview.left, ...secStore.overview.right]" :key="b.key">
          <span class="tag-type">{{ typeLabel(b.type) }}</span>
          <span class="ov-bt">{{ b.title }}</span>
          <span class="ov-bu">{{ b.unit }}</span>
        </div>
      </div>
    </div>

    <!-- 板块编辑 -->
    <template v-else>
      <div class="a-card">
        <div class="a-card-title">{{ cur.name }} · 核心指标（KPI）<span class="sub">编辑后实时写入大屏</span></div>
        <table class="a-table">
          <thead><tr><th>指标</th><th>数值</th><th>单位</th><th>同比</th><th style="width:80px">状态</th></tr></thead>
          <tbody>
            <tr v-for="k in cur.kpis" :key="k.key">
              <td>{{ k.label }}</td>
              <td><input class="a-input sm" type="number" min="0" :value="k.value" @change="onKpi(k.key, $event, 'value')" /></td>
              <td><input class="a-input sm" :value="k.unit" @change="onKpi(k.key, $event, 'unit')" /></td>
              <td><input class="a-input sm" type="number" step="0.1" :value="k.trend" @change="onKpi(k.key, $event, 'trend')" /></td>
              <td><span class="a-tag blue">核心</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 左栏：核心指标维度 -->
      <div class="a-card">
        <div class="a-card-title">左栏 · 核心指标维度<span class="sub">{{ cur.left.length }} 个图表块 · 趋势与区域对比</span></div>
        <div class="grid-2">
          <div class="blk" v-for="(b, bi) in cur.left" :key="'L' + b.key">
            <div class="blk-title">{{ b.title }} <span class="tag-type">{{ typeLabel(b.type) }}</span><span class="tag-unit">{{ b.unit }}</span></div>
            <div class="chart-edit">
              <table class="a-table tiny">
                <thead><tr><th>维度</th><th v-for="s in b.series" :key="s.name">{{ s.name }}</th></tr></thead>
                <tbody>
                  <tr v-for="(cat, ci) in b.categories" :key="cat">
                    <td class="cat">{{ cat }}</td>
                    <td v-for="(s, si) in b.series" :key="s.name">
                      <input class="a-input sm" type="number" :value="s.data[ci]" @change="onPoint('left', bi, si, ci, $event)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：细分指标 -->
      <div class="a-card">
        <div class="a-card-title">右栏 · 细分指标<span class="sub">{{ cur.right.length }} 个图表块 · 构成 / 排名 / 能力评估</span></div>
        <div class="grid-3">
          <div class="blk" v-for="(b, bi) in cur.right" :key="'R' + b.key">
            <div class="blk-title">{{ b.title }} <span class="tag-type">{{ typeLabel(b.type) }}</span><span class="tag-unit">{{ b.unit }}</span></div>
            <div class="chart-edit">
              <table class="a-table tiny">
                <thead><tr><th>维度</th><th v-for="s in b.series" :key="s.name">{{ s.name }}</th></tr></thead>
                <tbody>
                  <tr v-for="(cat, ci) in b.categories" :key="cat">
                    <td class="cat">{{ cat }}</td>
                    <td v-for="(s, si) in b.series" :key="s.name">
                      <input class="a-input sm" type="number" :value="s.data[ci]" @change="onPoint('right', bi, si, ci, $event)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="a-btn" @click="resetSec"><IconSvg name="refresh" /> 重置本节</button>
        <button class="a-btn primary" @click="exportSec"><IconSvg name="download" /> 导出 CSV</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSectionsStore } from '../../stores/sections.js'
import IconSvg from './IconSvg.vue'
import { useToast } from '../../composables/useToast.js'
import { exportCsv } from '../../utils/exportCsv.js'

const secStore = useSectionsStore()
const toast = useToast()

const tabs = [
  { key: 'overview', name: '综合概览', color: '#00f0ff' },
  { key: 'gov', name: '政府监管', color: '#36e0a0' },
  { key: 'institution', name: '机构养老', color: '#ffaa00' },
  { key: 'community', name: '社区养老', color: '#00c8ff' },
  { key: 'home', name: '居家养老', color: '#b388ff' }
]
const tab = ref('overview')
const cur = computed(() => (tab.value === 'overview' ? secStore.overview : secStore[tab.value]))

function onKpi(kpiKey, e, field) {
  const v = e.target.value
  if (field === 'value' || field === 'trend') {
    const n = Number(v)
    if (v === '' || isNaN(n) || n < 0) {
      toast.warn(field === 'value' ? '数值必须为非负数字' : '同比必须为数字')
      e.target.value = secStore[tab.value].kpis.find((x) => x.key === kpiKey)[field]
      return
    }
    secStore.updateKpi(tab.value, kpiKey, { [field]: n })
  } else {
    secStore.updateKpi(tab.value, kpiKey, { unit: v })
  }
  toast.success('已更新并同步大屏')
}

const TYPE_LABEL = { line: '趋势图', bar: '对比柱状', stack: '堆叠结构', hbar: '排名条', ring: '环形占比', pie: '占比图', radar: '能力雷达', gauge: '达成仪表' }
function typeLabel(t) { return TYPE_LABEL[t] || '图表' }

function onPoint(side, blockIdx, seriesIdx, pointIdx, e) {
  const v = e.target.value
  const n = Number(v)
  if (v === '' || isNaN(n) || n < 0) {
    toast.warn('数据必须为非负数字')
    e.target.value = secStore[tab.value][side][blockIdx].series[seriesIdx].data[pointIdx]
    return
  }
  secStore.updatePoint(tab.value, side, blockIdx, seriesIdx, pointIdx, n)
  toast.success('已更新并同步大屏')
}

function resetSec() {
  secStore.resetSection(tab.value)
  toast.success('已重置为默认数据')
}

function exportSec() {
  const s = secStore[tab.value]
  if (!s) return
  const columns = [
    { label: '板块', key: 'section' },
    { label: '栏目', key: 'col' },
    { label: '图表', key: 'cat' },
    { label: '系列', key: 'ser' },
    { label: '维度', key: 'dim' },
    { label: '数值', key: 'val' }
  ]
  const rows = []
  s.kpis.forEach((k) =>
    rows.push({ section: s.name, col: '核心指标', cat: 'KPI', ser: '当前值', dim: k.label, val: k.value + ' ' + k.unit })
  )
  const dump = (blocks, colName) => {
    blocks.forEach((b) => {
      b.series.forEach((se) => {
        se.data.forEach((d, i) => {
          rows.push({ section: s.name, col: colName, cat: b.title, ser: se.name, dim: b.categories[i], val: d })
        })
      })
    })
  }
  dump(s.left, '左栏·核心指标维度')
  dump(s.right, '右栏·细分指标')
  exportCsv(s.name + '_板块数据', columns, rows)
  toast.success('已导出 CSV')
}
</script>

<style scoped>
.wrap-col { display: flex; flex-direction: column; gap: 18px; }
.section-tabs { flex-wrap: wrap; }
.section-tabs button { display: inline-flex; align-items: center; gap: 8px; }
.section-tabs .dot { width: 8px; height: 8px; border-radius: 50%; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
@media (max-width: 1500px) { .grid-3 { grid-template-columns: 1fr 1fr; } }
.blk { border: 1px solid var(--c-line); border-radius: 10px; padding: 12px; background: rgba(0,102,255,.03); }
.blk-title { font-size: 13px; font-weight: 600; color: var(--c-text); margin-bottom: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.tag-unit { font-size: 11px; color: var(--c-muted); font-weight: 400; }
.ov-blocks { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
.ov-block { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--c-text);
  border: 1px solid var(--c-line); border-radius: 8px; padding: 8px 12px; background: rgba(0,102,255,.04); }
.ov-bu { color: var(--c-muted); font-size: 11px; }
.a-input.sm { width: 92px; padding: 6px 8px; font-size: 13px; }
.chart-edit { max-height: 320px; overflow: auto; border-radius: 8px; }
.a-table.tiny { font-size: 12px; }
.a-table.tiny th, .a-table.tiny td { padding: 6px 8px; }
.a-table .cat { color: var(--c-text); font-weight: 600; white-space: nowrap; }
.tag-type { font-size: 11px; color: var(--c-muted); background: rgba(0,102,255,.12); border: 1px solid var(--c-line); padding: 2px 8px; border-radius: 6px; margin-left: 8px; }

.actions { display: flex; gap: 12px; }
.ov-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ov-kpi { padding: 16px; border-radius: 12px; background: linear-gradient(180deg, rgba(0,102,255,.1), rgba(0,102,255,.03));
  border: 1px solid var(--c-line); transition: all .2s; }
.ov-kpi:hover { transform: translateY(-2px); border-color: var(--c-line2); }
.ov-val { font-size: 24px; font-weight: 700; color: #fff; }
.ov-val em { font-size: 12px; color: var(--c-muted); font-style: normal; margin-left: 4px; }
.ov-lab { font-size: 13px; color: var(--c-muted); margin-top: 4px; }
.ov-tr { font-size: 12px; font-weight: 600; margin-top: 6px; }
.ov-tr.up { color: var(--c-accent); }
.ov-tr.down { color: var(--c-danger); }
.a-btn svg { width: 15px; height: 15px; }
</style>
