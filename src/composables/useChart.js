import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

/**
 * 后台通用 ECharts 挂载器
 * @param {Function} optionFn 返回 ECharts option 的函数（可依赖响应式数据）
 * @param {Array}    deps     需要监听并触发重绘的响应式依赖
 */
export function useChart(optionFn, deps = []) {
  const el = ref(null)
  let chart = null
  let ro = null

  function render() {
    if (!el.value) return
    if (!chart) chart = echarts.init(el.value)
    chart.setOption(optionFn(), true)
  }

  onMounted(async () => {
    await nextTick()
    render()
    ro = new ResizeObserver(() => chart && chart.resize())
    if (el.value) ro.observe(el.value)
    window.addEventListener('resize', onWinResize)
  })

  function onWinResize() { chart && chart.resize() }

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWinResize)
    if (ro) { ro.disconnect(); ro = null }
    if (chart) { chart.dispose(); chart = null }
  })

  if (deps.length) watch(deps, () => render(), { deep: true })

  return { el, render, getChart: () => chart }
}

// ===== 后台图表统一视觉规范（深色科技风）=====
export const CHART = {
  primary: '#00f0ff',
  accent: '#00ffcc',
  blue: '#0066ff',
  warn: '#ffaa00',
  danger: '#ff4d4d',
  purple: '#8b5cf6',
  text: '#8fa8c8',
  line: 'rgba(0,102,255,0.16)',
  palette: ['#00f0ff', '#00ffcc', '#0066ff', '#ffaa00', '#8b5cf6', '#ff4d4d']
}

export const baseGrid = { left: 44, right: 20, top: 34, bottom: 30 }

export const baseTooltip = {
  trigger: 'axis',
  backgroundColor: 'rgba(6,18,38,0.94)',
  borderColor: 'rgba(0,240,255,0.35)',
  borderWidth: 1,
  textStyle: { color: '#dbeafe', fontSize: 12 },
  axisPointer: { lineStyle: { color: 'rgba(0,240,255,0.3)' } }
}

export function axisStyle(showSplit = true) {
  return {
    axisLine: { lineStyle: { color: CHART.line } },
    axisTick: { show: false },
    axisLabel: { color: CHART.text, fontSize: 11 },
    splitLine: showSplit ? { lineStyle: { color: CHART.line, type: 'dashed' } } : { show: false }
  }
}

/** 生成渐变色（竖向） */
export function grad(from, to) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }]
  }
}
