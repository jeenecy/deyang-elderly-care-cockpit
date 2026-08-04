import { defineStore } from 'pinia'
import { reactive, computed, watch } from 'vue'
import { useDataStore } from './data.js'

// 大屏四板块业务数据 —— 唯一数据源（Single Source of Truth）
// 驾驶舱大屏(BigScreen) 与 后台「大屏板块数据」(ScreenData) 均从此 store 读写，
// 保证前后端数据一致；overview 由四板块数据实时汇总得出，确保数据逻辑连贯。
//
// 栏目结构（v2）：
//   kpis  —— 核心指标卡（含 spark 迷你趋势）
//   left  —— 左栏「核心指标维度」图表块数组（趋势 / 区域对比）
//   right —— 右栏「细分指标」图表块数组（构成 / 排名 / 能力评估）
// 图表块 type 支持：line | bar | stack | hbar | ring | radar | gauge

const DISTRICTS = ['旌阳区', '罗江区', '中江县', '广汉市', '什邡市', '绵竹市']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const HALF = MONTHS.slice(6) // 近 6 月
const SECTION_KEYS = ['gov', 'institution', 'community', 'home']

// 确定性伪随机（保证刷新后数据稳定，便于后台配置与前后端一致）
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// 生成 n 个 [min,max] 区间内的稳定数值，round 控制小数位
function series(seed, n, min, max, round = 0) {
  const rnd = mulberry32(seed)
  const out = []
  for (let i = 0; i < n; i++) out.push(+(min + rnd() * (max - min)).toFixed(round))
  return out
}
// 归一化为 0~100 的迷你趋势（KPI 卡片 sparkline）
function spark(seed, n = 12) {
  return series(seed, n, 24, 100)
}

// 区县文本归一化（与 BigScreen 地图层 districtOfText 保持一致，确保统计口径与地图点位统一）
function districtOfText(t) {
  if (!t) return ''
  for (const n of DISTRICTS) if (t.indexOf(n) >= 0 || n.indexOf(t) >= 0) return n
  return ''
}
// 机构等级聚合分组（原始值含「待核实 / —」，统一为 7 个口径桶，合计 = 总数）
function levelBucket(lv) {
  if (lv === '三级甲等') return '三级甲等'
  if (lv === '三级乙等' || lv === '三级') return '三级(乙/其他)'
  if (lv === '二级甲等') return '二级甲等'
  if (lv === '二级乙等' || lv === '二级') return '二级(乙/其他)'
  if (lv === '未定级（基层）') return '未定级(基层)'
  if (lv === '—') return '行政公卫(不适用)'
  return '待核实'
}
// 机构类型聚合分组（原始 16 类归并为 8 类，避免环形 / 条形过碎）
function typeBucket(t) {
  if (t === '综合医院') return '综合医院'
  if (t === '中医医院') return '中医医院'
  if (t === '妇幼保健院') return '妇幼保健院'
  if (t === '精神专科') return '精神专科'
  if (t === '乡镇卫生院') return '基层卫生院'
  if (t === '护理机构') return '护理机构'
  if (['卫生健康行政', '疾病预防控制', '急救指挥调度', '采供血机构'].includes(t)) return '公共卫生行政'
  return '其他专科'
}

export const useSectionsStore = defineStore('sections', () => {
  // ===================== 政府监管 =====================
  const gov = reactive({
    key: 'gov', name: '政府监管', color: '#36e0a0',
    kpis: [
      { key: 'orgs', label: '养老服务机构', value: 186, unit: '家', trend: 3.2, spark: spark(1101) },
      { key: 'subsidy', label: '补贴发放总额', value: 2860, unit: '万元', trend: 5.1, spark: spark(1102) },
      { key: 'inspect', label: '本月监督检查', value: 128, unit: '次', trend: 8.4, spark: spark(1103) }
    ],
    left: [
      {
        key: 'trend', title: '监管事项月度趋势', type: 'line', unit: '次',
        categories: MONTHS,
        series: [
          { name: '监督检查(次)', data: series(101, 12, 92, 140) },
          { name: '问题整改(项)', data: series(102, 12, 42, 82) }
        ]
      },
      {
        key: 'district', title: '各区县监管强度对比', type: 'bar', unit: '次',
        categories: DISTRICTS,
        series: [
          { name: '检查次数', data: series(103, 6, 14, 38) },
          { name: '发现问题', data: series(104, 6, 4, 18) }
        ]
      }
    ],
    right: [
      {
        key: 'issue', title: '检查问题类型构成', type: 'ring', unit: '项',
        categories: ['消防安全', '食品卫生', '证照资质', '服务规范', '设施设备'],
        series: [{ name: '问题数', data: [42, 35, 18, 26, 21] }]
      },
      {
        key: 'rate', title: '各区县隐患整改率排名', type: 'hbar', unit: '%',
        categories: DISTRICTS,
        series: [{ name: '整改率', data: [98.2, 96.4, 92.1, 97.3, 94.6, 95.8] }]
      },
      {
        key: 'gauge', title: '年度监管任务完成率', type: 'gauge', unit: '%', max: 100,
        categories: ['完成率'],
        series: [{ name: '完成率', data: [86.5] }]
      }
    ]
  })

  // ===================== 机构养老 =====================
  const institution = reactive({
    key: 'institution', name: '机构养老', color: '#ffaa00',
    kpis: [
      { key: 'orgs', label: '养老机构', value: 68, unit: '家', trend: 2.1, spark: spark(1201) },
      { key: 'beds', label: '床位总数', value: 24580, unit: '张', trend: 1.8, spark: spark(1202) },
      { key: 'occupancy', label: '床位入住率', value: 78.5, unit: '%', trend: 0.6, spark: spark(1203) }
    ],
    left: [
      {
        key: 'trend', title: '在院老人与床位使用率趋势', type: 'line', unit: '人 / %',
        categories: MONTHS,
        series: [
          { name: '在院老人(人)', data: series(201, 12, 13100, 15800) },
          { name: '床位使用率(%)', data: series(202, 12, 72, 82, 1), axis: 1 }
        ]
      },
      {
        key: 'beds', title: '各区县床位供给与在院', type: 'bar', unit: '张 / 人',
        categories: DISTRICTS,
        series: [
          { name: '床位数', data: [6200, 1850, 4300, 4100, 3600, 4530] },
          { name: '在院老人', data: [4980, 1420, 3260, 3280, 2740, 3560] }
        ]
      }
    ],
    right: [
      {
        key: 'type', title: '养老机构类型构成', type: 'ring', unit: '家',
        categories: ['公办养老', '民办非企', '公建民营', '社区嵌入式'],
        series: [{ name: '机构数', data: [32, 18, 10, 8] }]
      },
      {
        key: 'star', title: '机构星级评定分布', type: 'hbar', unit: '家',
        categories: ['五星级', '四星级', '三星级', '二星级', '一星级'],
        series: [{ name: '机构数', data: [6, 13, 22, 17, 10] }]
      },
      {
        key: 'ability', title: '机构服务能力评估', type: 'radar', unit: '分',
        indicators: [
          { name: '护理能力', max: 100 }, { name: '医养结合', max: 100 },
          { name: '膳食服务', max: 100 }, { name: '文娱活动', max: 100 },
          { name: '安全管理', max: 100 }
        ],
        categories: ['护理能力', '医养结合', '膳食服务', '文娱活动', '安全管理'],
        series: [
          { name: '本年度', data: [88, 82, 91, 76, 94] },
          { name: '上年度', data: [80, 71, 86, 68, 89] }
        ]
      }
    ]
  })

  // ===================== 社区养老 =====================
  const community = reactive({
    key: 'community', name: '社区养老', color: '#00c8ff',
    kpis: [
      { key: 'facilities', label: '社区设施', value: 312, unit: '个', trend: 4.5, spark: spark(1301) },
      { key: 'canteens', label: '长者食堂', value: 89, unit: '个', trend: 2.0, spark: spark(1302) },
      { key: 'monthly', label: '月服务人次', value: 68500, unit: '人次', trend: 6.3, spark: spark(1303) }
    ],
    left: [
      {
        key: 'trend', title: '社区服务人次月度趋势', type: 'line', unit: '人次',
        categories: MONTHS,
        series: [{ name: '月度服务人次', data: series(301, 12, 42000, 72000) }]
      },
      {
        key: 'facility', title: '各区县社区设施与食堂', type: 'bar', unit: '个',
        categories: DISTRICTS,
        series: [
          { name: '社区设施', data: [82, 28, 64, 58, 40, 40] },
          { name: '长者食堂', data: [24, 8, 18, 16, 11, 12] }
        ]
      }
    ],
    right: [
      {
        key: 'type', title: '社区服务类型构成', type: 'ring', unit: '人次',
        categories: ['助餐', '助洁', '助浴', '康复', '文娱', '义诊'],
        series: [{ name: '月度服务(人次)', data: [15200, 8600, 4200, 6800, 12400, 9800] }]
      },
      {
        key: 'canteen', title: '长者食堂日均就餐排名', type: 'hbar', unit: '人次',
        categories: DISTRICTS,
        series: [{ name: '日均就餐', data: [1280, 420, 960, 880, 610, 700] }]
      },
      {
        key: 'gauge', title: '社区养老设施覆盖率', type: 'gauge', unit: '%', max: 100,
        categories: ['覆盖率'],
        series: [{ name: '覆盖率', data: [92.4] }]
      }
    ]
  })

  // ===================== 居家养老 =====================
  const home = reactive({
    key: 'home', name: '居家养老', color: '#b388ff',
    kpis: [
      { key: 'objects', label: '服务对象', value: 52800, unit: '人', trend: 3.0, spark: spark(1401) },
      { key: 'visits', label: '月上门服务', value: 124600, unit: '次', trend: 5.5, spark: spark(1402) },
      { key: 'renovation', label: '适老化改造', value: 3850, unit: '户', trend: 8.2, spark: spark(1403) }
    ],
    left: [
      {
        key: 'trend', title: '上门服务单量月度趋势', type: 'line', unit: '次',
        categories: MONTHS,
        series: [{ name: '月度上门服务(次)', data: series(401, 12, 82000, 132000) }]
      },
      {
        key: 'ability', title: '各区县居家老人能力分级', type: 'stack', unit: '人',
        categories: DISTRICTS,
        series: [
          { name: '自理', data: [9200, 3100, 12800, 6600, 4000, 5100] },
          { name: '半失能', data: [3100, 980, 4200, 2200, 1300, 1700] },
          { name: '失能', data: [1100, 320, 1500, 780, 460, 600] },
          { name: '高龄独居', data: [860, 240, 1180, 600, 350, 470] }
        ]
      }
    ],
    right: [
      {
        key: 'type', title: '居家服务类型构成', type: 'ring', unit: '次',
        categories: ['生活照料', '医疗护理', '助餐', '精神慰藉', '应急呼叫'],
        series: [{ name: '服务(次)', data: [42000, 31000, 28500, 12400, 10700] }]
      },
      {
        key: 'renovate', title: '适老化改造完成排名', type: 'hbar', unit: '户',
        categories: DISTRICTS,
        series: [{ name: '改造户数', data: [1120, 320, 940, 640, 380, 450] }]
      },
      {
        key: 'quality', title: '居家服务质量评估', type: 'radar', unit: '分',
        indicators: [
          { name: '响应时效', max: 100 }, { name: '服务规范', max: 100 },
          { name: '人员资质', max: 100 }, { name: '老人满意', max: 100 },
          { name: '安全保障', max: 100 }
        ],
        categories: ['响应时效', '服务规范', '人员资质', '老人满意', '安全保障'],
        series: [
          { name: '本年度', data: [90, 86, 79, 93, 88] },
          { name: '上年度', data: [82, 78, 72, 87, 81] }
        ]
      }
    ]
  })

  // ===================== 医疗机构（基于真实卫生专网签约数据实时聚合）=====================
  // 与地图层共用 dataStore.medical（107 家联网核实数据），保证统计口径与地图点位一致；
  // 数据为真实来源，故此处为「只读聚合」，不纳入后台手动编辑 / 重置（不进入 all / SECTION_KEYS）。
  const dataStore = useDataStore()
  const medical = reactive({ key: 'medical', name: '医疗机构', color: '#4d8bff', kpis: [], left: [], right: [] })
  function buildMedical() {
    const list = dataStore.medical || []
    const total = list.length
    const pub = list.filter((m) => m.nature === '公立').length
    const pri = list.filter((m) => m.nature === '私立').length
    const byDistrict = DISTRICTS.map((d) => list.filter((m) => districtOfText(m.district) === d).length)
    const pubByDistrict = DISTRICTS.map((d) => list.filter((m) => districtOfText(m.district) === d && m.nature === '公立').length)
    const priByDistrict = DISTRICTS.map((d) => list.filter((m) => districtOfText(m.district) === d && m.nature === '私立').length)

    // 等级分布（7 桶，合计 = total）
    const lvMap = {}
    list.forEach((m) => { const g = levelBucket(m.level); lvMap[g] = (lvMap[g] || 0) + 1 })
    const levelOrder = ['三级甲等', '三级(乙/其他)', '二级甲等', '二级(乙/其他)', '未定级(基层)', '行政公卫(不适用)', '待核实']
    const levelCats = levelOrder.filter((g) => lvMap[g] !== undefined)
    const levelData = levelCats.map((g) => lvMap[g])

    // 类型分布（8 桶）
    const tpMap = {}
    list.forEach((m) => { const g = typeBucket(m.type); tpMap[g] = (tpMap[g] || 0) + 1 })
    const typeCats = Object.keys(tpMap)
    const typeData = typeCats.map((g) => tpMap[g])

    // 等级评定完成率 = 已定级机构(非 待核实 / —) / 总数
    const verified = list.filter((m) => m.level !== '待核实' && m.level !== '—').length
    const rate = total ? +((verified / total) * 100).toFixed(1) : 0

    medical.kpis = [
      { key: 'total', label: '医疗机构总数', value: total, unit: '家', trend: 4.6, spark: spark(1601) },
      { key: 'public', label: '公立机构', value: pub, unit: '家', trend: 2.0, spark: spark(1602) },
      { key: 'private', label: '私立机构', value: pri, unit: '家', trend: 6.1, spark: spark(1603) }
    ]
    medical.left = [
      {
        key: 'district', title: '各区县医疗机构分布', type: 'bar', unit: '家',
        categories: DISTRICTS,
        series: [{ name: '机构数', data: byDistrict }]
      },
      {
        key: 'nature', title: '各区县公立 / 私立构成', type: 'stack', unit: '家',
        categories: DISTRICTS,
        series: [
          { name: '公立', data: pubByDistrict },
          { name: '私立', data: priByDistrict }
        ]
      }
    ]
    medical.right = [
      {
        key: 'level', title: '机构等级评定分布', type: 'ring', unit: '家',
        categories: levelCats,
        series: [{ name: '机构数', data: levelData }]
      },
      {
        key: 'type', title: '医疗机构类型构成', type: 'hbar', unit: '家',
        categories: typeCats,
        series: [{ name: '机构数', data: typeData }]
      },
      {
        key: 'rate', title: '等级评定完成率', type: 'gauge', unit: '%', max: 100,
        categories: ['完成率'],
        series: [{ name: '完成率', data: [rate] }]
      }
    ]
  }
  buildMedical()
  watch(() => dataStore.medical, buildMedical, { deep: true })

  // ===================== 关怀对象（老人档案 G03，基于真实档案数据实时聚合）=====================
  // 与地图层共用 dataStore.elderly（老人档案），保证统计口径与地图点位一致；
  // 数据为真实来源，故此处为「只读聚合」，不纳入后台手动编辑 / 重置（不进入 all / SECTION_KEYS）。
  const elder = reactive({ key: 'elder', name: '关怀对象', color: '#ffb020', kpis: [], left: [], right: [] })
  function buildElder() {
    const all = (dataStore.elderly || [])
    const list = all.filter((e) => e.status === '在档')
    const total = list.length
    const allTotal = all.length
    // 失能 / 特护 视为重点照护预警
    const careWarn = list.filter((e) => e.careLevel === '失能' || e.careLevel === '特护').length
    // 健康标签聚合（取 TOP6）
    const tagMap = {}
    list.forEach((e) => (e.healthTags || []).forEach((t) => { tagMap[t] = (tagMap[t] || 0) + 1 }))
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
    // 各区县（在档）分布
    const byDistrict = DISTRICTS.map((d) => list.filter((e) => districtOfText(e.district) === d).length)
    // 照护等级构成（在档）
    const careLevels = ['自理', '半失能', '失能', '特护']
    const careData = careLevels.map((lv) => list.filter((e) => e.careLevel === lv).length)
    // 失能 + 特护 预警率（gauge）
    const warnRate = total ? +((careWarn / total) * 100).toFixed(1) : 0
    // 平均年龄
    const ages = list.map((e) => +e.age).filter((n) => !isNaN(n))
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0

    elder.kpis = [
      { key: 'total', label: '在档关怀对象', value: total, unit: '人', trend: 4.6, spark: spark(1701) },
      { key: 'warn', label: '失能/特护预警', value: careWarn, unit: '人', trend: 2.0, spark: spark(1702) },
      { key: 'age', label: '平均年龄', value: avgAge, unit: '岁', trend: 0.4, spark: spark(1703) }
    ]
    elder.left = [
      {
        key: 'district', title: '各区县关怀对象分布', type: 'bar', unit: '人',
        categories: DISTRICTS,
        series: [{ name: '在档人数', data: byDistrict }]
      },
      {
        key: 'care', title: '各区县照护等级构成', type: 'stack', unit: '人',
        categories: DISTRICTS,
        series: careLevels.map((lv) => ({
          name: lv,
          data: DISTRICTS.map((d) => list.filter((e) => districtOfText(e.district) === d && e.careLevel === lv).length)
        }))
      }
    ]
    elder.right = [
      {
        key: 'level', title: '照护等级构成', type: 'ring', unit: '人',
        categories: careLevels,
        series: [{ name: '人数', data: careData }]
      },
      {
        key: 'tag', title: '健康风险标签 TOP', type: 'hbar', unit: '人',
        categories: topTags.map((t) => t[0]),
        series: [{ name: '人数', data: topTags.map((t) => t[1]) }]
      },
      {
        key: 'warn', title: '失能/特护预警率', type: 'gauge', unit: '%', max: 100,
        categories: ['预警率'],
        series: [{ name: '预警率', data: [warnRate] }]
      }
    ]
  }
  buildElder()
  watch(() => dataStore.elderly, buildElder, { deep: true })

  const all = { gov, institution, community, home }

  // 取板块首个图表块的首条序列（用于全市总量汇总）
  const primaryOf = (s) => s.left[0].series[0].data

  // ===================== 综合概览（从四板块实时汇总）=====================
  const overview = computed(() => {
    const g = primaryOf(gov), i = primaryOf(institution), c = primaryOf(community), h = primaryOf(home)
    // 全市养老服务总量趋势 = 监管 + 机构 + 社区 + 居家 月度逐月相加
    const total = MONTHS.map((_, idx) => g[idx] + i[idx] + c[idx] + h[idx])

    // 四大板块年度服务量（万）
    const vol = (arr) => +(arr.reduce((a, b) => a + b, 0) / 10000).toFixed(1)
    const proportions = [
      { name: '政府监管', value: vol(g) },
      { name: '机构养老', value: vol(i) },
      { name: '社区养老', value: vol(c) },
      { name: '居家养老', value: vol(h) }
    ]

    // 近 6 月四大板块服务量堆叠（万），直观看出结构变化
    const half = (arr) => arr.slice(6).map((v) => +(v / 10000).toFixed(2))

    // 各区县养老服务综合指数 = 机构床位 + 社区设施 + 居家改造 归一化加权
    const bedsArr = institution.left[1].series[0].data
    const facArr = community.left[1].series[0].data
    const renoArr = home.right[1].series[0].data
    const norm = (arr) => { const m = Math.max(...arr) || 1; return arr.map((v) => v / m) }
    const nb = norm(bedsArr), nf = norm(facArr), nr = norm(renoArr)
    const compositeIndex = DISTRICTS.map((_, idx) =>
      +((nb[idx] * 0.4 + nf[idx] * 0.35 + nr[idx] * 0.25) * 100).toFixed(1)
    )

    return {
      key: 'overview', name: '综合概览', color: '#00f0ff',
      kpis: [
        { label: '养老服务机构', value: gov.kpis[0].value, unit: '家', trend: gov.kpis[0].trend, spark: gov.kpis[0].spark },
        { label: '养老床位总数', value: institution.kpis[1].value, unit: '张', trend: institution.kpis[1].trend, spark: institution.kpis[1].spark },
        { label: '社区养老设施', value: community.kpis[0].value, unit: '个', trend: community.kpis[0].trend, spark: community.kpis[0].spark },
        { label: '居家服务对象', value: home.kpis[0].value, unit: '人', trend: home.kpis[0].trend, spark: home.kpis[0].spark },
        // 汇总指标：社区月服务 + 居家月上门服务
        { label: '月均服务总量', value: community.kpis[2].value + home.kpis[1].value, unit: '次', trend: 5.9, spark: spark(1501) },
        { label: '本月监管检查', value: gov.kpis[2].value, unit: '次', trend: gov.kpis[2].trend, spark: gov.kpis[2].spark }
      ],
      left: [
        {
          key: 'total', title: '全市养老服务总量月度趋势', type: 'line', unit: '人次',
          categories: MONTHS,
          series: [{ name: '全市服务总量', data: total }]
        },
        {
          key: 'stack', title: '近半年四大板块服务量结构', type: 'stack', unit: '万',
          categories: HALF,
          series: [
            { name: '政府监管', data: half(g) },
            { name: '机构养老', data: half(i) },
            { name: '社区养老', data: half(c) },
            { name: '居家养老', data: half(h) }
          ]
        }
      ],
      right: [
        {
          key: 'ratio', title: '四大板块服务量占比', type: 'ring', unit: '万',
          categories: proportions.map((p) => p.name),
          series: [{ name: '年度服务量(万)', data: proportions.map((p) => p.value) }]
        },
        {
          key: 'index', title: '各区县养老服务综合指数', type: 'hbar', unit: '分',
          categories: DISTRICTS,
          series: [{ name: '综合指数', data: compositeIndex }]
        },
        {
          key: 'capability', title: '全市养老服务能力评估', type: 'radar', unit: '分',
          indicators: [
            { name: '服务覆盖', max: 100 }, { name: '资源供给', max: 100 },
            { name: '响应时效', max: 100 }, { name: '群众满意', max: 100 },
            { name: '信息化', max: 100 }
          ],
          categories: ['服务覆盖', '资源供给', '响应时效', '群众满意', '信息化'],
          series: [
            { name: '德阳市', data: [92, 85, 88, 96, 90] },
            { name: '全省均值', data: [84, 79, 80, 88, 82] }
          ]
        }
      ]
    }
  })

  // 深拷贝初始值，支持「重置本节」
  const snapshot = () => JSON.parse(JSON.stringify({ gov, institution, community, home }))
  const initial = snapshot()

  // ===================== 后台管理动作 =====================
  function sectionOf(key) { return all[key] }
  function updateKpi(key, kpiKey, patch) {
    const s = all[key]
    if (!s) return
    const k = s.kpis.find((x) => x.key === kpiKey)
    if (k) Object.assign(k, patch)
  }
  // side: 'left' | 'right'，blockIdx 为图表块下标
  function updatePoint(key, side, blockIdx, seriesIdx, pointIdx, value) {
    const s = all[key]
    if (!s || !s[side] || !s[side][blockIdx]) return
    const ser = s[side][blockIdx].series[seriesIdx]
    if (!ser) return
    const v = Number(value)
    if (isNaN(v)) return
    ser.data[pointIdx] = +v.toFixed(ser.data[pointIdx] % 1 === 0 ? 0 : 2)
  }
  function resetSection(key) {
    if (!all[key] || !initial[key]) return
    const snap = JSON.parse(JSON.stringify(initial[key]))
    all[key].kpis = snap.kpis
    all[key].left = snap.left
    all[key].right = snap.right
  }
  function resetAll() {
    SECTION_KEYS.forEach((k) => resetSection(k))
  }

  return {
    DISTRICTS, MONTHS, SECTION_KEYS,
    gov, institution, community, home,
    overview,
    medical,
    elder,
    sectionOf, updateKpi, updatePoint, resetSection, resetAll
  }
})
