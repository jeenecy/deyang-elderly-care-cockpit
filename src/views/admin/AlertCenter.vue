<template>
  <div class="ac">
    <!-- 子标签：概览 / 告警列表 / 告警规则 / 通知配置 -->
    <div class="subtabs">
      <button class="subtab" :class="{ on: tab === 'overview' }" @click="tab = 'overview'"><IconSvg name="grid" /> 告警概览</button>
      <button class="subtab" :class="{ on: tab === 'list' }" @click="tab = 'list'"><IconSvg name="bell" /> 告警列表</button>
      <button class="subtab" :class="{ on: tab === 'rules' }" @click="tab = 'rules'"><IconSvg name="sliders" /> 告警规则</button>
      <button class="subtab" :class="{ on: tab === 'notify' }" @click="tab = 'notify'"><IconSvg name="mail" /> 通知配置</button>
      <div class="spacer"></div>
      <button class="a-btn sm" @click="refreshAll"><IconSvg name="refresh" /> 刷新</button>
    </div>

    <!-- 顶部：告警概览数据卡片（常驻） -->
    <div class="kpi-row">
      <div class="a-card kpi-card" v-for="k in kpi" :key="k.key">
        <div class="kpi-ico" :style="{ color: k.color, background: hexA(k.color, .12), borderColor: hexA(k.color, .3) }">
          <IconSvg :name="k.icon" />
        </div>
        <div class="a-stat">
          <div class="num" :style="{ color: k.color }">{{ k.value }}</div>
          <div class="lbl">{{ k.label }}</div>
        </div>
      </div>
    </div>

    <!-- ===== 概览：统计分析面板 ===== -->
    <div class="panel" v-show="tab === 'overview'">
      <div class="chart-grid">
        <div class="a-card">
          <div class="a-card-title">近 14 日告警趋势<span class="sub">按等级堆叠 · 单位：起</span></div>
          <div ref="trendEl" class="chart chart-h"></div>
        </div>
        <div class="a-card">
          <div class="a-card-title">告警等级分布<span class="sub">紧急 / 严重 / 一般 / 提示</span></div>
          <div ref="ringEl" class="chart chart-h"></div>
        </div>
        <div class="a-card">
          <div class="a-card-title">告警来源分布<span class="sub">来源追踪</span></div>
          <div ref="sourceEl" class="chart chart-h"></div>
        </div>
        <div class="a-card">
          <div class="a-card-title">告警处理效率<span class="sub">解决率 / 状态构成</span></div>
          <div ref="gaugeEl" class="chart chart-h"></div>
        </div>
      </div>
    </div>

    <!-- ===== 告警列表：筛选 / 排序 / 批量 / 详情抽屉 ===== -->
    <div class="panel" v-show="tab === 'list'">
      <div class="a-card">
        <div class="a-card-title">告警列表<span class="sub">实时联动处置状态 · 点击行查看详情</span></div>
        <div class="toolbar row wrap">
          <input class="a-input" v-model="kw" placeholder="搜索标题 / 区域 / 来源 / 规则" style="width:220px" @keyup.enter="page = 1" />
          <select class="a-select" v-model="fLevel" @change="page = 1">
            <option value="">全部等级</option>
            <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
          </select>
          <select class="a-select" v-model="fStatus" @change="page = 1">
            <option value="">全部状态</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <select class="a-select" v-model="fSource" @change="page = 1">
            <option value="">全部来源</option>
            <option v-for="s in SOURCES" :key="s" :value="s">{{ s }}</option>
          </select>
          <div class="spacer"></div>
          <button class="a-btn" @click="exportCurrent"><IconSvg name="download" /> 导出</button>
        </div>

        <div class="batch-bar" v-if="selected.size > 0">
          <span class="batch-info">已选 <b>{{ selected.size }}</b> 项</span>
          <div class="spacer"></div>
          <button class="a-btn sm" @click="batchSet('处理中')">批量处理中</button>
          <button class="a-btn sm" @click="batchSet('已解决')">批量已解决</button>
          <button class="a-btn sm" @click="batchSet('已忽略')">批量已忽略</button>
          <button class="a-btn sm ghost" @click="clear">取消选择</button>
        </div>

        <div class="table-wrap">
          <table class="a-table">
            <thead><tr>
              <th style="width:40px"><input type="checkbox" :checked="allSelected(paged)" @change="toggleAll(paged)" /></th>
              <th class="sortable" @click="toggleSort('level')">等级 <i class="caret" :class="sortKey==='level' ? sortDir : ''"></i></th>
              <th>告警标题</th>
              <th>来源</th>
              <th>区域</th>
              <th>触发规则</th>
              <th class="sortable" @click="toggleSort('time')">时间 <i class="caret" :class="sortKey==='time' ? sortDir : ''"></i></th>
              <th>状态</th>
              <th>处置人</th>
              <th style="width:150px">操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="a in paged" :key="a.id" class="clickable" @click="openAlert(a)">
                <td class="cb" @click.stop><input type="checkbox" :checked="isSelected(a)" @change="toggle(a)" /></td>
                <td><span class="lv" :class="'lv-' + LEVEL_CLS[a.level]">{{ a.level }}</span></td>
                <td>{{ a.title }}</td>
                <td><span class="src-tag">{{ a.source }}</span></td>
                <td>{{ a.area }}</td>
                <td class="muted">{{ a.ruleName || '—' }}</td>
                <td class="muted">{{ a.time }}</td>
                <td><span class="a-tag" :class="statusCls(a.state)">{{ a.state }}</span></td>
                <td class="muted">{{ a.handler || '未指派' }}</td>
                <td class="ops" @click.stop>
                  <button class="op" v-if="a.state === '待处理'" @click="setStatus(a, '处理中')">处理</button>
                  <button class="op" v-if="['待处理','处理中'].includes(a.state)" @click="setStatus(a, '已解决')">解决</button>
                  <button class="op" v-if="['待处理','处理中'].includes(a.state)" @click="setStatus(a, '已忽略')">忽略</button>
                  <span v-if="a.state === '已解决'" class="muted">已闭环</span>
                  <span v-if="a.state === '已忽略'" class="muted">已忽略</span>
                </td>
              </tr>
              <tr v-if="paged.length === 0"><td colspan="10" class="empty">没有符合条件的告警</td></tr>
            </tbody>
          </table>
        </div>

        <div class="pager row">
          <span class="muted">共 {{ sorted.length }} 条</span>
          <div class="spacer"></div>
          <button class="a-btn sm" :disabled="page <= 1" @click="page--">上一页</button>
          <span class="muted">第 {{ page }} / {{ pages }} 页</span>
          <button class="a-btn sm" :disabled="page >= pages" @click="page++">下一页</button>
        </div>
      </div>
    </div>

    <!-- ===== 告警规则：CRUD ===== -->
    <div class="panel" v-show="tab === 'rules'">
      <div class="a-card">
        <div class="a-card-title">告警规则配置<span class="sub">阈值触发后按渠道推送</span>
          <div class="spacer"></div>
          <button class="a-btn primary" @click="openRule()"><IconSvg name="plus" /> 新增规则</button>
        </div>
        <div class="table-wrap">
          <table class="a-table">
            <thead><tr>
              <th>级别</th><th>规则名称</th><th>监控对象</th><th>触发条件</th><th>通知渠道</th><th>静默期</th><th>状态</th><th style="width:130px">操作</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in store.alertRules" :key="r.id">
                <td><span class="lv" :class="'lv-' + LEVEL_CLS[r.level]">{{ r.level }}</span></td>
                <td>{{ r.name }}</td>
                <td class="muted">{{ r.target }}</td>
                <td class="cond">{{ r.op }} {{ r.threshold }}{{ r.unit }}</td>
                <td class="muted">{{ r.channel }}</td>
                <td class="muted">{{ r.silence }} 分</td>
                <td>
                  <label class="sw" @click.prevent>
                    <input type="checkbox" :checked="r.enabled" @change="toggleRule(r)" />
                    <span class="sw-box"></span>
                  </label>
                </td>
                <td class="ops">
                  <button class="op" @click="openRule(r)">编辑</button>
                  <button class="op danger" @click="delRule(r)">删除</button>
                </td>
              </tr>
              <tr v-if="store.alertRules.length === 0"><td colspan="8" class="empty">暂无规则</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== 通知配置：站内信 / 邮件 / 短信 ===== -->
    <div class="panel" v-show="tab === 'notify'">
      <div class="a-card">
        <div class="a-card-title">通知渠道配置<span class="sub">告警触发后按渠道推送 · 按等级设置默认渠道</span></div>
        <div class="chan-grid">
          <div class="chan" v-for="(c, key) in nc.channels" :key="key">
            <div class="chan-head">
              <div class="chan-ico" :class="key"><IconSvg :name="chanMeta[key].icon" /></div>
              <div class="chan-name">{{ chanMeta[key].label }}</div>
              <label class="sw ml" @click.prevent>
                <input type="checkbox" v-model="c.enabled" />
                <span class="sw-box"></span>
              </label>
            </div>
            <div class="chan-field" v-if="key === 'site'">
              <label>接收角色</label>
              <select class="a-input" v-model="c.recipients">
                <option v-for="o in RECIPIENTS" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </div>
            <div class="chan-field" v-else-if="key === 'email'">
              <label>接收邮箱</label>
              <input class="a-input" v-model="c.address" placeholder="name@deyang.gov.cn" />
            </div>
            <div class="chan-field" v-else>
              <label>接收手机号</label>
              <input class="a-input" v-model="c.phones" placeholder="138****0000" />
            </div>
            <div class="chan-levels">
              <label>触发等级</label>
              <div class="lvchecks">
                <label class="lvcheck" v-for="l in LEVELS" :key="l">
                  <input type="checkbox" :value="l" v-model="c.levels" />
                  <span class="lv" :class="'lv-' + LEVEL_CLS[l]">{{ l }}</span>
                </label>
              </div>
            </div>
            <button class="a-btn sm ghost test" @click="testNotify(key)"><IconSvg name="msg" /> 发送测试</button>
          </div>
        </div>
      </div>

      <div class="a-card">
        <div class="a-card-title">升级与免打扰</div>
        <div class="adv-grid">
          <div class="adv">
            <label class="sw" @click.prevent>
              <input type="checkbox" v-model="nc.escalation.enabled" />
              <span class="sw-box"></span>
            </label>
            <div class="adv-body">
              <div class="adv-name">超时未处理自动升级</div>
              <div class="adv-desc">紧急 / 严重告警超过
                <input class="a-input mini" type="number" min="0" v-model="nc.escalation.minutes" /> 分钟未处理，自动升级至
                <select class="a-input mini" v-model="nc.escalation.channel">
                  <option value="sms">短信</option>
                  <option value="mail">邮件</option>
                  <option value="site">站内信</option>
                </select>
              </div>
            </div>
          </div>
          <div class="adv">
            <label class="sw" @click.prevent>
              <input type="checkbox" v-model="nc.quietHours.enabled" />
              <span class="sw-box"></span>
            </label>
            <div class="adv-body">
              <div class="adv-name">免打扰时段</div>
              <div class="adv-desc">
                <input class="a-input mini" type="time" v-model="nc.quietHours.start" /> 至
                <input class="a-input mini" type="time" v-model="nc.quietHours.end" />
                期间仅推送紧急告警
              </div>
            </div>
          </div>
        </div>
        <div class="save-bar">
          <div class="spacer"></div>
          <button class="a-btn primary" @click="saveNotify"><IconSvg name="download" /> 保存配置</button>
        </div>
      </div>
    </div>

    <!-- 告警详情抽屉（右侧） -->
    <DetailDrawer :show="showDetail" :title="detailTitle" :category="detailCategory" :color="detailColor" :fields="detailFields" @update:show="showDetail = $event">
      <template #footer>
        <button class="a-btn" v-if="activeAlert && activeAlert.state === '待处理'" @click="act('处理中')">标记处理中</button>
        <button class="a-btn primary" v-if="activeAlert && ['待处理','处理中'].includes(activeAlert.state)" @click="act('已解决')">标记已解决</button>
        <button class="a-btn ghost" v-if="activeAlert && ['待处理','处理中'].includes(activeAlert.state)" @click="act('已忽略')">忽略</button>
        <button class="a-btn" v-if="activeAlert" @click="assign">指派处置人</button>
      </template>
    </DetailDrawer>

    <!-- 规则新增 / 编辑 模态框 -->
    <Modal v-model:show="showRule" :title="editing ? '编辑告警规则' : '新增告警规则'" width="560px">
      <div class="a-form">
        <div class="a-field">
          <label>规则名称</label>
          <input class="a-input" v-model="form.name" placeholder="如：CPU 高负载" />
          <span class="err" v-if="ruleErrors.name">{{ ruleErrors.name }}</span>
        </div>
        <div class="a-field">
          <label>监控对象</label>
          <select class="a-input" v-model="form.target">
            <option v-for="m in metricTargets" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="a-row2">
          <div class="a-field">
            <label>比较符</label>
            <select class="a-input" v-model="form.op"><option value=">">&gt;</option><option value="<">&lt;</option></select>
          </div>
          <div class="a-field">
            <label>阈值</label>
            <input class="a-input" v-model="form.threshold" placeholder="数值" />
            <span class="err" v-if="ruleErrors.threshold">{{ ruleErrors.threshold }}</span>
          </div>
          <div class="a-field">
            <label>单位</label>
            <input class="a-input" v-model="form.unit" placeholder="%" />
          </div>
        </div>
        <div class="a-row2">
          <div class="a-field">
            <label>告警级别</label>
            <select class="a-input" v-model="form.level">
              <option v-for="l in LEVELS" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
          <div class="a-field">
            <label>静默期（分钟）</label>
            <input class="a-input" type="number" min="0" v-model="form.silence" />
          </div>
        </div>
        <div class="a-field">
          <label>通知渠道</label>
          <div class="lvchecks">
            <label class="lvcheck" v-for="ch in RULE_CHANNEL_PARTS" :key="ch">
              <input type="checkbox" :value="ch" v-model="form.channel" />
              <span class="muted">{{ ch }}</span>
            </label>
          </div>
        </div>
        <div class="a-field row2">
          <label class="sw" @click.prevent>
            <input type="checkbox" v-model="form.enabled" />
            <span class="sw-box"></span>
          </label>
          <span class="muted">启用该规则</span>
        </div>
      </div>
      <template #footer>
        <button class="a-btn ghost" @click="showRule = false">取消</button>
        <button class="a-btn primary" @click="saveRule">保存</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick } from 'vue'
import { useDataStore } from '../../stores/data.js'
import IconSvg from './IconSvg.vue'
import DetailDrawer from './DetailDrawer.vue'
import Modal from './Modal.vue'
import { useToast } from '../../composables/useToast.js'
import { useRowSelection, useDetail } from '../../composables/useTable.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { ALERT_LEVELS as LEVELS, ALERT_STATES as STATUSES, ALERT_SOURCES as SOURCES, RULE_CHANNEL_PARTS, RECIPIENTS } from '../../constants/dict.js'
import { useChart, CHART, baseGrid, baseTooltip, axisStyle } from '../../composables/useChart.js'

const store = useDataStore()
const toast = useToast()
const { selected, isSelected, toggle, toggleAll, allSelected, selectedRows, clear } = useRowSelection('id')
const { showDetail, detailFields, detailTitle, detailCategory, detailColor, openDetail } = useDetail()

const tab = ref('overview')

/* ===== 词表与配色 ===== */
const LEVEL_COLOR = { 紧急: '#ff4d4d', 严重: '#ffaa00', 一般: '#ffd400', 提示: '#3b82f6' }
const LEVEL_CLS = { 紧急: 'red', 严重: 'orange', 一般: 'yellow', 提示: 'blue' }
const LEVEL_RANK = { 紧急: 4, 严重: 3, 一般: 2, 提示: 1 }
function levelColor(l) { return LEVEL_COLOR[l] || '#8aa6c8' }
function statusCls(s) { return s === '待处理' ? 'red' : s === '处理中' ? 'orange' : s === '已解决' ? 'green' : 'gray' }
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/* ===== 概览 KPI ===== */
const kpi = computed(() => {
  const a = store.alerts
  const active = a.filter((x) => !['已解决', '已忽略'].includes(x.state)).length
  return [
    { key: 'total', label: '告警总数', value: a.length, color: '#00f0ff', icon: 'bell' },
    { key: 'critical', label: '紧急', value: a.filter((x) => x.level === '紧急').length, color: '#ff4d4d', icon: 'bell' },
    { key: 'major', label: '严重', value: a.filter((x) => x.level === '严重').length, color: '#ffaa00', icon: 'bell' },
    { key: 'minor', label: '一般', value: a.filter((x) => x.level === '一般').length, color: '#ffd400', icon: 'bell' },
    { key: 'info', label: '提示', value: a.filter((x) => x.level === '提示').length, color: '#3b82f6', icon: 'bell' },
    { key: 'active', label: '待处理 / 处理中', value: active, color: '#00ffcc', icon: 'activity' }
  ]
})

/* ===== 分析图表 ===== */
const trendDays = ['07-21','07-22','07-23','07-24','07-25','07-26','07-27','07-28','07-29','07-30','07-31','08-01','08-02','08-03']
const trendSeries = {
  紧急: [1,0,2,1,1,0,1,2,1,0,1,1,2,3],
  严重: [3,2,4,3,2,3,4,3,5,4,3,4,3,5],
  一般: [6,5,7,6,5,6,8,7,6,8,7,6,9,8],
  提示: [4,3,5,4,3,5,4,6,5,4,3,5,4,5]
}
const { el: trendEl, render: trendRender } = useChart(() => ({
  color: LEVELS.map((l) => LEVEL_COLOR[l]),
  grid: { ...baseGrid, top: 34, right: 20 },
  tooltip: baseTooltip,
  legend: { data: LEVELS, top: 0, itemWidth: 12, itemHeight: 8, textStyle: { color: CHART.text, fontSize: 11 } },
  xAxis: { type: 'category', boundaryGap: false, data: trendDays, ...axisStyle(false) },
  yAxis: { type: 'value', ...axisStyle() },
  series: LEVELS.map((l) => ({
    name: l, type: 'line', stack: 't', smooth: true, symbol: 'none',
    lineStyle: { width: 1.5 }, areaStyle: { opacity: 0.16 }, data: trendSeries[l]
  }))
}), [])

const { el: ringEl, render: ringRender } = useChart(() => {
  const total = store.alerts.length
  const data = LEVELS.map((l) => ({ name: l, value: store.alerts.filter((x) => x.level === l).length }))
  return {
    color: LEVELS.map((l) => LEVEL_COLOR[l]),
    tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}: {c} 起 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: CHART.text, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['52%', '74%'], center: ['50%', '42%'], avoidLabelOverlap: true,
      itemStyle: { borderColor: 'rgba(6,18,38,0.9)', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, color: '#fff', fontSize: 13, fontWeight: 600, formatter: '{b}\n{c} 起' } },
      data
    }],
    graphic: { type: 'text', left: 'center', top: '37%', style: { text: String(total), fill: CHART.primary, fontSize: 22, fontWeight: 700, textAlign: 'center' } }
  }
}, [() => store.alerts])

const { el: sourceEl, render: sourceRender } = useChart(() => ({
  grid: { ...baseGrid, left: 92, right: 34, top: 14, bottom: 14 },
  tooltip: { ...baseTooltip, axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>${p[0].value} 起` },
  xAxis: { type: 'value', ...axisStyle() },
  yAxis: { type: 'category', data: SOURCES, ...axisStyle(false), axisLabel: { color: CHART.text, fontSize: 12 } },
  series: [{
    type: 'bar', barWidth: 16,
    data: SOURCES.map((s, i) => ({
      value: store.alerts.filter((x) => x.source === s).length,
      itemStyle: { borderRadius: [0, 6, 6, 0], color: CHART.palette[i % CHART.palette.length] }
    })),
    label: { show: true, position: 'right', color: CHART.text, fontSize: 11 }
  }]
}), [() => store.alerts])

const { el: gaugeEl, render: gaugeRender } = useChart(() => {
  const total = store.alerts.length
  const resolved = store.alerts.filter((x) => x.state === '已解决').length
  const rate = total ? Math.round((resolved / total) * 100) : 0
  const color = rate >= 80 ? CHART.accent : rate >= 50 ? CHART.warn : CHART.danger
  return {
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '92%',
      progress: { show: true, width: 14, itemStyle: { color } },
      axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(0,240,255,0.12)']] } },
      pointer: { show: true, length: '58%', width: 4, itemStyle: { color: CHART.primary } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, anchor: { show: false },
      detail: { valueAnimation: true, fontSize: 26, fontWeight: 700, color: '#fff', offsetCenter: [0, '2%'], formatter: '{value}%' },
      title: { show: true, offsetCenter: [0, '30%'], color: CHART.text, fontSize: 12 },
      data: [{ value: rate, name: '告警解决率' }]
    }]
  }
}, [() => store.alerts])

watch(tab, async (t) => {
  if (t === 'overview') {
    await nextTick()
    trendRender(); ringRender(); sourceRender(); gaugeRender()
  }
})

/* ===== 列表：筛选 / 排序 / 分页 ===== */
const kw = ref('')
const fLevel = ref('')
const fStatus = ref('')
const fSource = ref('')
const sortKey = ref('time')
const sortDir = ref('desc')
const page = ref(1)
const pageSize = 8
watch([kw, fLevel, fStatus, fSource], () => { page.value = 1 })

const filtered = computed(() => {
  const k = kw.value.trim().toLowerCase()
  return store.alerts.filter((a) => {
    const m = !k || [a.title, a.area, a.source, a.ruleName, a.handler].some((v) => (v || '').toLowerCase().includes(k))
    const ml = !fLevel.value || a.level === fLevel.value
    const ms = !fStatus.value || a.state === fStatus.value
    const msrc = !fSource.value || a.source === fSource.value
    return m && ml && ms && msrc
  })
})
const sorted = computed(() => {
  const arr = [...filtered.value]
  arr.sort((x, y) => {
    let r = 0
    if (sortKey.value === 'time') r = x.time < y.time ? -1 : x.time > y.time ? 1 : 0
    else r = (LEVEL_RANK[x.level] || 0) - (LEVEL_RANK[y.level] || 0)
    return sortDir.value === 'asc' ? r : -r
  })
  return arr
})
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize)))
const paged = computed(() => {
  const s = (Math.min(page.value, pages.value) - 1) * pageSize
  return sorted.value.slice(s, s + pageSize)
})
function toggleSort(key) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'desc' }
  page.value = 1
}

/* ===== 详情抽屉 + 处置动作 ===== */
const activeAlert = ref(null)
function openAlert(a) {
  activeAlert.value = a
  openDetail({
    title: a.title,
    category: a.level + '级告警',
    color: levelColor(a.level),
    fields: [
      { label: '告警等级', value: a.level, hot: a.level === '紧急' },
      { label: '告警类型', value: a.type },
      { label: '告警来源', value: a.source },
      { label: '触发规则', value: a.ruleName || '—' },
      { label: '发生区域', value: a.area },
      { label: '所属区县', value: a.district },
      { label: '发生时间', value: a.time },
      { label: '处置状态', value: a.state },
      { label: '处置人', value: a.handler || '未指派' },
      { label: '处置说明', value: a.note || '—' },
      { label: '解决时间', value: a.resolvedAt || '—' }
    ]
  })
}
function refreshActive() { if (activeAlert.value) openAlert(activeAlert.value) }
function act(state) {
  const a = activeAlert.value
  if (!a) return
  store.handleAlert(a.id, state, a.handler, a.note)
  toast.success(`已标记为「${state}」`)
  refreshActive()
}
function assign() {
  const a = activeAlert.value
  if (!a) return
  const h = prompt('指派处置人 / 单位', a.handler || '网格员')
  if (h === null) return
  store.handleAlert(a.id, a.state === '待处理' ? '处理中' : a.state, h, a.note)
  toast.success('已指派：' + h)
  refreshActive()
}
function setStatus(a, state) {
  store.handleAlert(a.id, state, a.handler, a.note)
  toast.success(`「${a.title}」已${state}`)
}
function batchSet(state) {
  const rows = selectedRows(store.alerts)
  rows.forEach((a) => store.handleAlert(a.id, state, a.handler, a.note))
  toast.success(`已批量${state} ${rows.length} 条`)
  clear()
}
function refreshAll() { page.value = 1; toast.info('告警列表已刷新') }
function exportCurrent() {
  if (!sorted.value.length) { toast.warn('当前没有可导出的数据'); return }
  exportCsv('告警列表', [
    { key: 'level', label: '等级' }, { key: 'title', label: '标题' }, { key: 'type', label: '类型' },
    { key: 'source', label: '来源' }, { key: 'area', label: '区域' }, { key: 'ruleName', label: '触发规则' },
    { key: 'time', label: '时间' }, { key: 'state', label: '状态' }, { key: 'handler', label: '处置人' }
  ], sorted.value)
  toast.success(`已导出 ${sorted.value.length} 条告警`)
}

/* ===== 规则 CRUD ===== */
const showRule = ref(false)
const editing = ref(null)
const form = reactive({ name: '', target: '', op: '>', threshold: '', unit: '%', level: '严重', channel: ['站内信'], silence: 10, enabled: true })
const ruleErrors = reactive({})
const metricTargets = computed(() => store.metrics.map((m) => m.name))
function openRule(r) {
  editing.value = r || null
  Object.keys(ruleErrors).forEach((k) => delete ruleErrors[k])
  if (r) Object.assign(form, { name: r.name, target: r.target, op: r.op, threshold: r.threshold, unit: r.unit, level: r.level, channel: (r.channel || '').split('+').filter(Boolean), silence: r.silence, enabled: r.enabled })
  else Object.assign(form, { name: '', target: store.metrics[0]?.name || '', op: '>', threshold: '', unit: '%', level: '严重', channel: ['站内信'], silence: 10, enabled: true })
  showRule.value = true
}
function saveRule() {
  if (!form.name.trim()) { ruleErrors.name = '请输入规则名称'; return }
  if (form.threshold === '' || isNaN(Number(form.threshold))) { ruleErrors.threshold = '请输入数字阈值'; return }
  const payload = {
    name: form.name.trim(), target: form.target, op: form.op,
    threshold: Number(form.threshold), unit: form.unit, level: form.level,
    channel: form.channel.join('+') || '站内信', silence: Number(form.silence), enabled: form.enabled
  }
  if (editing.value) store.updateRule(editing.value.id, payload)
  else store.addRule(payload)
  toast.success(editing.value ? '规则已更新' : '规则已新增')
  showRule.value = false
}
function delRule(r) {
  if (!confirm(`确认删除规则「${r.name}」？`)) return
  store.removeRule(r.id)
  toast.success('规则已删除')
}
function toggleRule(r) { store.setRuleOn(r.id, !r.enabled) }

/* ===== 通知配置 ===== */
const nc = store.notifyConfig
const chanMeta = {
  site: { label: '站内信', icon: 'bell' },
  email: { label: '邮件', icon: 'mail' },
  sms: { label: '短信', icon: 'msg' }
}
function saveNotify() { store.saveNotifyConfig() }
function testNotify(key) { toast.success(`${chanMeta[key].label} 测试通知已发送`) }
</script>

<style scoped>
.ac { display: flex; flex-direction: column; gap: 18px; }
.subtabs { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.subtab { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px;
  border: 1px solid var(--c-line); background: rgba(0,102,255,.08); color: var(--c-muted); font-size: 14px; cursor: pointer; transition: all .2s; }
.subtab svg { width: 16px; height: 16px; }
.subtab:hover { color: var(--c-text); border-color: var(--c-line2); }
.subtab.on { color: #041018; background: linear-gradient(90deg, #00f0ff, #00ffcc); border-color: transparent; font-weight: 600; }

/* KPI 卡片 */
.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
.kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; }
.kpi-ico { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid; flex-shrink: 0; }
.kpi-ico svg { width: 24px; height: 24px; }
.kpi-card .num { font-size: 24px; }
.kpi-card .lbl { font-size: 12.5px; }

/* 图表 */
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.chart { width: 100%; }
.chart-h { height: 280px; }
.panel { display: flex; flex-direction: column; gap: 18px; }

/* 工具栏 / 表格 */
.toolbar { gap: 10px; margin-bottom: 16px; }
.table-wrap { min-height: 280px; overflow-x: auto; }
.clickable { cursor: pointer; }
.clickable:hover { background: rgba(0,240,255,.05); }
.cb { width: 40px; text-align: center; }
.ops { white-space: nowrap; }
.op { background: transparent; border: 1px solid var(--c-line); color: var(--c-primary); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 6px; transition: all .2s; }
.op:hover { background: rgba(0,240,255,.12); }
.op.danger { color: var(--c-danger); border-color: rgba(255,77,77,.3); }
.op.danger:hover { background: rgba(255,77,77,.12); }
.empty { text-align: center; color: var(--c-muted); padding: 30px 0; }
.pager { margin-top: 16px; }
.sortable { cursor: pointer; user-select: none; }
.sortable:hover { color: var(--c-text); }
.caret { display: inline-block; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-top: 5px solid var(--c-muted); opacity: .4; vertical-align: middle; margin-left: 2px; }
.caret.asc { transform: rotate(180deg); opacity: 1; border-top-color: var(--c-primary); }
.caret.desc { opacity: 1; border-top-color: var(--c-primary); }
.cond { font-family: var(--font-mono, monospace); color: var(--c-primary); }

/* 等级徽标 */
.lv { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.lv-red { color: #ff4d4d; background: rgba(255,77,77,.14); }
.lv-orange { color: #ffaa00; background: rgba(255,170,0,.14); }
.lv-yellow { color: #ffd400; background: rgba(255,212,0,.14); }
.lv-blue { color: #3b82f6; background: rgba(59,130,246,.16); }
.src-tag { font-size: 12px; color: var(--c-text); padding: 2px 8px; border-radius: 6px; background: rgba(0,102,255,.1); border: 1px solid var(--c-line); }

/* 批量条 */
.batch-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 10px 14px;
  background: rgba(0,102,255,.1); border: 1px solid var(--c-line2); border-radius: 10px; }
.batch-info { font-size: 13px; color: var(--c-text); }
.batch-info b { color: var(--c-primary); }

/* 开关 */
.sw { display: inline-flex; align-items: center; cursor: pointer; }
.sw input { position: absolute; opacity: 0; width: 0; height: 0; }
.sw-box { width: 38px; height: 20px; border-radius: 12px; background: rgba(138,166,200,.25); position: relative; transition: all .2s; }
.sw-box::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: all .2s; }
.sw input:checked + .sw-box { background: linear-gradient(90deg, #00f0ff, #0066ff); }
.sw input:checked + .sw-box::after { transform: translateX(18px); }
.ml { margin-left: auto; }

/* 规则表 */
.chan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.chan { padding: 16px; border-radius: 12px; background: rgba(0,102,255,.07); border: 1px solid var(--c-line); display: flex; flex-direction: column; gap: 12px; }
.chan-head { display: flex; align-items: center; gap: 10px; }
.chan-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; }
.chan-ico.site { background: rgba(0,240,255,.18); color: #00f0ff; }
.chan-ico.email { background: rgba(0,255,204,.16); color: #00ffcc; }
.chan-ico.sms { background: rgba(255,170,0,.16); color: #ffaa00; }
.chan-ico svg { width: 20px; height: 20px; }
.chan-name { font-size: 15px; font-weight: 600; color: #fff; }
.chan-field { display: flex; flex-direction: column; gap: 6px; }
.chan-field label, .chan-levels > label { font-size: 12px; color: var(--c-muted); }
.chan-levels { display: flex; flex-direction: column; gap: 8px; }
.lvchecks { display: flex; flex-wrap: wrap; gap: 10px; }
.lvcheck { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; }
.lvcheck input { accent-color: var(--c-primary); }
.test { margin-top: auto; align-self: flex-start; }

/* 升级 / 免打扰 */
.adv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.adv { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; background: rgba(0,102,255,.06); border: 1px solid var(--c-line); }
.adv-body { flex: 1; }
.adv-name { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 6px; }
.adv-desc { font-size: 12.5px; color: var(--c-muted); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.a-input.mini { width: 72px; padding: 4px 8px; font-size: 12px; display: inline-block; }
.save-bar { display: flex; margin-top: 16px; }

/* 表单 */
.a-form { display: flex; flex-direction: column; gap: 14px; }
.a-field { display: flex; flex-direction: column; gap: 6px; }
.a-field > label { font-size: 12.5px; color: var(--c-muted); }
.a-row2 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.a-field.row2 { flex-direction: row; align-items: center; gap: 8px; }
.err { font-size: 12px; color: var(--c-danger); }

input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--c-primary); cursor: pointer; }

@media (max-width: 1400px) {
  .kpi-row { grid-template-columns: repeat(3, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
  .chan-grid { grid-template-columns: 1fr; }
  .adv-grid { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
