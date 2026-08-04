<template>
  <div class="wrap-col">
    <!-- 服务健康总览 -->
    <div class="a-card">
      <div class="a-card-title">服务健康总览
        <span class="sub">最近一次检测 {{ lastCheck }}</span>
        <div class="spacer"></div>
        <button class="a-btn" @click="refresh"><IconSvg name="refresh" /> 刷新指标</button>
      </div>
      <div class="health">
        <div class="h-item" v-for="h in healths" :key="h.name">
          <span class="dot" :class="h.ok ? 'ok' : 'bad'"></span>
          <div class="h-body">
            <div class="h-name">{{ h.name }}</div>
            <div class="h-sub">{{ h.desc }}</div>
          </div>
          <b :style="{ color: h.ok ? '#00ffcc' : '#ffaa00' }">{{ h.ok ? '正常' : '警告' }}</b>
        </div>
      </div>
      <div class="uptime">
        <div class="up-item"><span>系统可用率</span><b>99.97%</b></div>
        <div class="up-item"><span>连续运行</span><b>128 天</b></div>
        <div class="up-item"><span>生效规则</span><b>{{ enabledRules }} / {{ store.alertRules.length }}</b></div>
        <div class="up-item"><span>阈值命中</span><b :class="{ warn: hitCount > 0 }">{{ hitCount }} 项</b></div>
      </div>
    </div>

    <!-- 核心监控指标 -->
    <div class="a-card">
      <div class="a-card-title">核心监控指标<span class="sub">点击卡片查看 24 小时趋势</span></div>
      <div class="metric-grid">
        <div class="metric" v-for="m in store.metrics" :key="m.id"
             :class="{ on: focus === m.name, hit: isHit(m) }" @click="focus = m.name">
          <div class="m-name">{{ m.name }}</div>
          <div class="m-val">{{ m.value }}<span class="m-unit">{{ m.unit }}</span></div>
          <div class="m-foot">
            <span class="a-tag" :class="isHit(m) ? 'red' : (m.status === '健康' ? 'green' : 'orange')">{{ isHit(m) ? '超阈值' : m.status }}</span>
            <span class="trend" :class="m.trend === '上升' ? 'up' : (m.trend === '下降' ? 'down' : 'flat')">{{ m.trend }}</span>
          </div>
          <div class="m-bar" v-if="ruleOf(m.name)">
            <div class="m-bar-fill" :style="{ width: pctOf(m) + '%', background: isHit(m) ? '#ff4d4d' : 'linear-gradient(90deg,#0066ff,#00f0ff)' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="grid-2">
      <div class="a-card">
        <div class="a-card-title">{{ focus }} · 24 小时趋势
          <div class="spacer"></div>
          <div class="seg">
            <button v-for="r in ['24h', '7d']" :key="r" class="seg-btn" :class="{ on: range === r }" @click="range = r">{{ r }}</button>
          </div>
        </div>
        <div ref="trendEl" class="chart chart-m"></div>
      </div>

      <div class="a-card">
        <div class="a-card-title">数据源同步成功率<span class="sub">近 24 小时</span></div>
        <div ref="srcEl" class="chart chart-m"></div>
      </div>
    </div>

    <!-- 告警规则配置 -->
    <div class="a-card">
      <div class="a-card-title">告警规则配置
        <span class="sub">阈值触发后按渠道推送</span>
        <div class="spacer"></div>
        <button class="a-btn" @click="exportRules"><IconSvg name="download" /> 导出</button>
        <button class="a-btn primary" @click="openRule()"><IconSvg name="plus" /> 新增规则</button>
      </div>
      <div class="rule-grid">
        <div class="rule" v-for="r in store.alertRules" :key="r.id" :class="{ off: !r.enabled }">
          <div class="rule-head">
            <span class="lvl" :class="'lvl-' + lvlKey(r.level)">{{ r.level }}</span>
            <div class="rule-name">{{ r.name }}</div>
            <label class="sw" @click.stop>
              <input type="checkbox" :checked="r.enabled" @change="toggleRule(r)" />
              <span class="sw-track"><span class="sw-thumb"></span></span>
            </label>
          </div>
          <div class="rule-cond">
            <span class="c-target">{{ r.target }}</span>
            <span class="c-op">{{ r.op }}</span>
            <span class="c-th">{{ r.threshold }}{{ r.unit }}</span>
          </div>
          <div class="rule-meta">
            <span><i>通知</i>{{ r.channel }}</span>
            <span><i>静默</i>{{ r.silence }} 分钟</span>
          </div>
          <div class="rule-foot">
            <span class="state" :class="ruleHit(r) ? 'bad' : 'good'">{{ !r.enabled ? '已停用' : (ruleHit(r) ? '当前命中' : '监控中') }}</span>
            <div class="spacer"></div>
            <button class="op" @click="openRule(r)">编辑</button>
            <button class="op danger" @click="delRule(r)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <Modal v-model:show="showRule" :title="editing ? '编辑告警规则' : '新增告警规则'" width="560px">
      <div class="a-form">
        <div class="a-field">
          <label>规则名称</label>
          <input class="a-input" :class="{ invalid: errors.name }" v-model.trim="form.name" placeholder="如：CPU 高负载" />
          <div class="err" v-if="errors.name">{{ errors.name }}</div>
        </div>
        <div class="a-field">
          <label>监控对象</label>
          <select class="a-input" v-model="form.target">
            <option v-for="m in store.metrics" :key="m.id" :value="m.name">{{ m.name }}</option>
          </select>
        </div>
        <div class="row2">
          <div class="a-field">
            <label>比较符</label>
            <select class="a-input" v-model="form.op">
              <option value=">">大于 ></option>
              <option value="<">小于 &lt;</option>
            </select>
          </div>
          <div class="a-field">
            <label>阈值</label>
            <input class="a-input" :class="{ invalid: errors.threshold }" v-model="form.threshold" placeholder="如：80" />
            <div class="err" v-if="errors.threshold">{{ errors.threshold }}</div>
          </div>
          <div class="a-field">
            <label>单位</label>
            <input class="a-input" v-model.trim="form.unit" placeholder="% / ms / 次" />
          </div>
        </div>
        <div class="row2">
          <div class="a-field">
            <label>告警级别</label>
            <select class="a-input" v-model="form.level">
              <option v-for="l in ALERT_LEVELS" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <div class="a-field">
            <label>通知渠道</label>
            <select class="a-input" v-model="form.channel">
              <option v-for="x in NOTIFY_CHANNELS" :key="x" :value="x">{{ x }}</option>
            </select>
          </div>
          <div class="a-field">
            <label>静默期(分钟)</label>
            <input class="a-input" :class="{ invalid: errors.silence }" v-model="form.silence" placeholder="0" />
            <div class="err" v-if="errors.silence">{{ errors.silence }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="a-btn" @click="showRule = false">取消</button>
        <button class="a-btn primary" @click="saveRule">保存</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import { useToast } from '../../composables/useToast.js'
import { useChart, CHART, baseGrid, baseTooltip, axisStyle, grad } from '../../composables/useChart.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { ALERT_LEVELS, NOTIFY_CHANNELS } from '../../constants/dict.js'

const store = useDataStore()
const toast = useToast()

/* ===== 健康总览 ===== */
const warnSrc = computed(() => store.sources.some((s) => s.status === '警告'))
const healths = computed(() => [
  { name: '大屏渲染服务', desc: '3D 地图 / 粒子 / 数据流', ok: true },
  { name: '数据接口网关', desc: '平均时延 ' + (store.metrics.find((m) => m.name === '接口平均时延')?.value || '-') + ' ms', ok: true },
  { name: '数据源通道', desc: store.sources.length + ' 个接入源', ok: !warnSrc.value },
  { name: '告警推送通道', desc: enabledRulesText(), ok: true }
])
function enabledRulesText() {
  const n = store.alertRules.filter((r) => r.enabled).length
  return n + ' 条规则生效中'
}
const lastCheck = ref(nowStr())
function nowStr() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
const enabledRules = computed(() => store.alertRules.filter((r) => r.enabled).length)

/* ===== 阈值命中判定 ===== */
function numOf(v) { const n = parseFloat(String(v)); return isNaN(n) ? null : n }
function ruleOf(metricName) { return store.alertRules.find((r) => r.enabled && r.target === metricName) }
function isHit(m) {
  const r = ruleOf(m.name); const v = numOf(m.value)
  if (!r || v === null) return false
  return r.op === '>' ? v > r.threshold : v < r.threshold
}
function ruleHit(r) {
  if (!r.enabled) return false
  const m = store.metrics.find((x) => x.name === r.target); const v = numOf(m?.value)
  if (v === null || v === undefined) return false
  return r.op === '>' ? v > r.threshold : v < r.threshold
}
function pctOf(m) {
  const r = ruleOf(m.name); const v = numOf(m.value)
  if (!r || v === null) return 0
  return Math.min(100, Math.round((v / (r.threshold || 1)) * 100))
}
const hitCount = computed(() => store.metrics.filter((m) => isHit(m)).length)

/* ===== 趋势图 ===== */
const focus = ref('大屏服务 CPU 使用率')
const range = ref('24h')

function seedRand(seed) { const x = Math.sin(seed) * 10000; return x - Math.floor(x) }
function series(name, n) {
  const base = numOf(store.metrics.find((m) => m.name === name)?.value) || 50
  const arr = []
  for (let i = 0; i < n; i++) {
    const wave = Math.sin((i / n) * Math.PI * 2.2) * base * 0.14
    const noise = (seedRand(i * 7.3 + name.length) - 0.5) * base * 0.16
    arr.push(Math.max(1, Math.round((base + wave + noise) * 10) / 10))
  }
  arr[n - 1] = base
  return arr
}

const { el: trendEl } = useChart(() => {
  const n = range.value === '24h' ? 24 : 7
  const labels = range.value === '24h'
    ? Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const data = series(focus.value, n)
  const r = store.alertRules.find((x) => x.target === focus.value)
  return {
    grid: { ...baseGrid, top: 28, right: 26 },
    tooltip: baseTooltip,
    xAxis: { type: 'category', boundaryGap: false, data: labels, ...axisStyle(false), axisLabel: { color: CHART.text, fontSize: 10, interval: range.value === '24h' ? 3 : 0 } },
    yAxis: { type: 'value', scale: true, ...axisStyle() },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, data,
      lineStyle: { width: 2.4, color: CHART.primary },
      itemStyle: { color: CHART.primary },
      areaStyle: { color: grad('rgba(0,240,255,0.30)', 'rgba(0,240,255,0)') },
      markLine: r ? {
        silent: true, symbol: 'none',
        data: [{ yAxis: r.threshold, label: { formatter: `阈值 ${r.threshold}${r.unit}`, color: CHART.danger, fontSize: 10 }, lineStyle: { color: 'rgba(255,77,77,.7)', type: 'dashed', width: 1.5 } }]
      } : undefined,
      markPoint: {
        symbolSize: 40,
        data: [{ type: 'max', name: '峰值' }],
        itemStyle: { color: 'rgba(255,170,0,.75)' },
        label: { fontSize: 10, color: '#041018' }
      }
    }]
  }
}, [focus, range, () => store.metrics])

/* ===== 数据源同步成功率 ===== */
const { el: srcEl } = useChart(() => {
  const list = store.sources.map((s) => ({
    name: s.name.length > 8 ? s.name.slice(0, 7) + '…' : s.name,
    rate: s.status === '正常' ? 96 + Math.round(seedRand(s.name.length * 3.1) * 4) : 60 + Math.round(seedRand(s.name.length) * 20)
  }))
  return {
    grid: { ...baseGrid, left: 78, right: 40 },
    tooltip: { ...baseTooltip, axisPointer: { type: 'shadow' }, valueFormatter: (v) => v + '%' },
    xAxis: { type: 'value', max: 100, ...axisStyle() },
    yAxis: { type: 'category', data: list.map((l) => l.name), ...axisStyle(false), axisLabel: { color: CHART.text, fontSize: 11 } },
    series: [{
      type: 'bar', barWidth: 13, data: list.map((l) => l.rate),
      itemStyle: {
        borderRadius: [0, 7, 7, 0],
        color: (p) => (p.value >= 95 ? grad('#00ffcc', '#00f0ff') : grad('#ffaa00', '#ff4d4d'))
      },
      label: { show: true, position: 'right', color: CHART.text, fontSize: 11, formatter: '{c}%' },
      animationDelay: (i) => i * 80
    }]
  }
}, [() => store.sources])

/* ===== 规则 CRUD ===== */
const showRule = ref(false)
const editing = ref(null)
const form = reactive({ name: '', target: '', op: '>', threshold: '', unit: '%', level: '严重', channel: '站内', silence: 10 })
const errors = reactive({})

function openRule(r) {
  editing.value = r || null
  Object.keys(errors).forEach((k) => delete errors[k])
  if (r) Object.assign(form, { name: r.name, target: r.target, op: r.op, threshold: r.threshold, unit: r.unit, level: r.level, channel: r.channel, silence: r.silence })
  else Object.assign(form, { name: '', target: store.metrics[0]?.name || '', op: '>', threshold: '', unit: '%', level: '严重', channel: '站内', silence: 10 })
  showRule.value = true
}
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name) errors.name = '请填写规则名称'
  if (form.threshold === '' || isNaN(Number(form.threshold))) errors.threshold = '阈值需为数字'
  if (form.silence === '' || isNaN(Number(form.silence)) || Number(form.silence) < 0) errors.silence = '静默期需为非负数字'
  return Object.keys(errors).length === 0
}
function saveRule() {
  if (!validate()) return
  const payload = { name: form.name, target: form.target, op: form.op, threshold: Number(form.threshold), unit: form.unit, level: form.level, channel: form.channel, silence: Number(form.silence), enabled: editing.value ? editing.value.enabled : true }
  if (editing.value) { store.updateRule(editing.value.id, payload); toast.success('规则已更新') }
  else { store.addRule(payload); toast.success('规则已新增') }
  showRule.value = false
}
function delRule(r) {
  if (!confirm(`确认删除规则「${r.name}」？`)) return
  store.removeRule(r.id); toast.success('规则已删除')
}
function toggleRule(r) {
  store.setRuleOn(r.id, !r.enabled)
  toast.success(`「${r.name}」已${r.enabled ? '启用' : '停用'}`)
}
function exportRules() {
  exportCsv('告警规则配置', [
    { key: 'id', label: '规则编号' }, { key: 'name', label: '规则名称' }, { key: 'target', label: '监控对象' },
    { key: 'cond', label: '触发条件' }, { key: 'level', label: '级别' }, { key: 'channel', label: '通知渠道' },
    { key: 'silence', label: '静默期(分钟)' }, { key: 'state', label: '状态' }
  ], store.alertRules.map((r) => ({ ...r, cond: `${r.op} ${r.threshold}${r.unit}`, state: r.enabled ? '启用' : '停用' })))
  toast.success('规则配置已导出')
}

function refresh() {
  store.refreshMetrics()
  lastCheck.value = nowStr()
  toast.success('监控指标已刷新')
}
function lvlKey(l) { return l === '紧急' ? 'red' : l === '严重' ? 'orange' : l === '提示' ? 'blue' : 'yellow' }
</script>

<style scoped>
.wrap-col { display: flex; flex-direction: column; gap: 18px; }
.grid-2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; }
.chart { width: 100%; }
.chart-m { height: 250px; }

/* 健康总览 */
.health { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.h-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px;
  background: rgba(0, 102, 255, .07); border: 1px solid var(--c-line); font-size: 14px; color: var(--c-text); transition: all .2s; }
.h-item:hover { border-color: var(--c-line2); transform: translateY(-2px); }
.h-body { flex: 1; min-width: 0; }
.h-name { font-size: 13px; color: #fff; }
.h-sub { font-size: 11px; color: var(--c-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-item b { font-size: 13px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot.ok { background: #00ffcc; box-shadow: 0 0 10px #00ffcc; animation: pulse 2s infinite; }
.dot.bad { background: #ffaa00; box-shadow: 0 0 10px #ffaa00; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.uptime { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--c-line); }
.up-item { display: flex; align-items: baseline; justify-content: center; gap: 8px; font-size: 12px; color: var(--c-muted); }
.up-item b { font-size: 16px; color: var(--c-primary); }
.up-item b.warn { color: var(--c-danger); }

/* 指标卡 */
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.metric { padding: 16px; border-radius: 12px; background: rgba(0, 102, 255, .07); border: 1px solid var(--c-line);
  cursor: pointer; transition: all .25s cubic-bezier(.16, 1, .3, 1); }
.metric:hover { transform: translateY(-3px); border-color: var(--c-line2); box-shadow: 0 8px 20px rgba(0, 240, 255, .14); }
.metric.on { border-color: var(--c-primary); background: rgba(0, 240, 255, .1); box-shadow: 0 0 0 1px rgba(0, 240, 255, .25) inset; }
.metric.hit { border-color: rgba(255, 77, 77, .5); background: rgba(255, 77, 77, .08); }
.m-name { font-size: 13px; color: var(--c-muted); }
.m-val { font-size: 24px; font-weight: 700; color: var(--c-primary); margin: 8px 0; text-shadow: 0 0 14px rgba(0, 240, 255, .3); }
.metric.hit .m-val { color: #ff6b6b; text-shadow: 0 0 14px rgba(255, 77, 77, .35); }
.m-unit { font-size: 13px; color: var(--c-muted); margin-left: 4px; font-weight: 400; }
.m-foot { display: flex; align-items: center; justify-content: space-between; }
.trend { font-size: 12px; }
.trend.up { color: var(--c-accent); } .trend.down { color: var(--c-danger); } .trend.flat { color: var(--c-muted); }
.m-bar { height: 4px; border-radius: 2px; background: rgba(0, 102, 255, .12); margin-top: 10px; overflow: hidden; }
.m-bar-fill { height: 100%; border-radius: 2px; transition: width .8s cubic-bezier(.16, 1, .3, 1); }

/* 分段控件 */
.seg { display: flex; background: rgba(0, 102, 255, .1); border: 1px solid var(--c-line); border-radius: 8px; overflow: hidden; }
.seg-btn { padding: 4px 12px; font-size: 12px; color: var(--c-muted); background: transparent; border: none; cursor: pointer; transition: all .2s; }
.seg-btn.on { color: #041018; background: linear-gradient(90deg, #00f0ff, #00ffcc); font-weight: 600; }

/* 规则卡片 */
.rule-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.rule { padding: 15px 16px; border-radius: 12px; background: rgba(0, 102, 255, .07); border: 1px solid var(--c-line);
  display: flex; flex-direction: column; gap: 10px; transition: all .25s cubic-bezier(.16, 1, .3, 1); }
.rule:hover { transform: translateY(-2px); border-color: var(--c-line2); box-shadow: 0 8px 20px rgba(0, 240, 255, .12); }
.rule.off { opacity: .55; }
.rule-head { display: flex; align-items: center; gap: 9px; }
.rule-name { flex: 1; font-size: 14px; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lvl { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.lvl-red { color: #ff4d4d; background: rgba(255, 77, 77, .16); }
.lvl-orange { color: #ffaa00; background: rgba(255, 170, 0, .16); }
.lvl-yellow { color: #ffd400; background: rgba(255, 212, 0, .16); }
.lvl-blue { color: #3b82f6; background: rgba(59, 130, 246, .16); }
.rule-cond { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px;
  background: rgba(2, 10, 26, .5); border: 1px solid var(--c-line); font-size: 12px; }
.c-target { color: var(--c-text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.c-op { color: var(--c-muted); }
.c-th { color: var(--c-primary); font-weight: 700; }
.rule-meta { display: flex; gap: 14px; font-size: 12px; color: var(--c-text); }
.rule-meta i { color: var(--c-muted); font-style: normal; margin-right: 5px; }
.rule-foot { display: flex; align-items: center; gap: 8px; }
.state { font-size: 11px; padding: 2px 8px; border-radius: 5px; }
.state.good { color: #00ffcc; background: rgba(0, 255, 204, .12); }
.state.bad { color: #ff4d4d; background: rgba(255, 77, 77, .14); }
.spacer { flex: 1; }
.op { background: transparent; border: 1px solid var(--c-line2); color: var(--c-text); padding: 3px 9px;
  border-radius: 6px; font-size: 12px; cursor: pointer; transition: all .2s; }
.op:hover { color: var(--c-primary); border-color: var(--c-primary); }
.op.danger:hover { color: var(--c-danger); border-color: var(--c-danger); }

/* 开关 */
.sw { display: inline-flex; cursor: pointer; flex-shrink: 0; }
.sw input { display: none; }
.sw-track { width: 36px; height: 20px; border-radius: 10px; background: rgba(120, 140, 170, .28);
  border: 1px solid var(--c-line); position: relative; transition: all .25s; }
.sw-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%;
  background: #b9c9de; transition: all .25s cubic-bezier(.16, 1, .3, 1); }
.sw input:checked + .sw-track { background: linear-gradient(90deg, #0066ff, #00f0ff); border-color: rgba(0, 240, 255, .5); box-shadow: 0 0 10px rgba(0, 240, 255, .3); }
.sw input:checked + .sw-track .sw-thumb { left: 18px; background: #fff; }

/* 表单 */
.a-form { display: flex; flex-direction: column; gap: 14px; }
.a-field { display: flex; flex-direction: column; gap: 6px; }
.a-field > label { font-size: 13px; color: var(--c-muted); }
.a-field .a-input { width: 100%; }
.row2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.err { color: var(--c-danger); font-size: 12px; margin-top: 4px; }
.a-input.invalid { border-color: var(--c-danger); }
.a-btn svg { width: 15px; height: 15px; }

@media (max-width: 1400px) {
  .health, .uptime { grid-template-columns: repeat(2, 1fr); }
  .grid-2 { grid-template-columns: 1fr; }
  .metric-grid, .rule-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
