// 德阳市智慧养老数字驾驶舱 —— 后端服务（零依赖：node:http + JSON 文件存储）
// 启动：node server/index.js  （无需 --experimental-sqlite）
// 设计：JSON 文件承载全部数据，完美支持 Unicode 中文，无 node:sqlite 编码 bug。
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'cockpit.json')
const PORT = process.env.PORT || 3001

fs.mkdirSync(DATA_DIR, { recursive: true })

// ========== JSON 文件数据库 ==========
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) }
  catch { return null }
}
function saveDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8')
}
function nowStr() { return new Date().toISOString().slice(0, 19).replace('T', ' ') }

// ---------- 种子数据（与原 SQLite 版一致） ----------
const SEED = {
  config: {
    title: '德阳市智慧养老数字驾驶舱',
    modules: { gov: true, institution: true, community: true, home: true },
    mapMode: '3d',
    ticker: true,
    theme: 'dark'
  },
  districts: [
    { id: 1, name: '旌阳区', elderly: 12.6, beds: 1.8 },
    { id: 2, name: '罗江区', elderly: 4.2, beds: 0.6 },
    { id: 3, name: '中江县', elderly: 18.3, beds: 1.2 },
    { id: 4, name: '广汉市', elderly: 9.1, beds: 1.1 },
    { id: 5, name: '什邡市', elderly: 5.4, beds: 0.7 },
    { id: 6, name: '绵竹市', elderly: 6.8, beds: 0.9 }
  ],
  points: [
    { id: 'P1', name: '旌阳区智慧养老服务中心', type: '养老机构', area: '旌阳区', lng: 104.4085, lat: 31.1734 },
    { id: 'P2', name: '中江县第二敬老院', type: '养老机构', area: '中江县', lng: 104.7985, lat: 30.8812 },
    { id: 'P3', name: '沱江社区长者食堂', type: '社区中心', area: '旌阳区', lng: 104.3896, lat: 31.1304 },
    { id: 'P4', name: '雒城街道助老服务站', type: '社区中心', area: '广汉市', lng: 104.2925, lat: 31.0008 },
    { id: 'P5', name: '绵竹市紫岩街道康养点', type: '养老机构', area: '绵竹市', lng: 104.1231, lat: 31.4314 }
  ],
  records: {
    alerts: [
      { id: 'A001', level: '红', title: '独居老人烟感告警', area: '中江县仓山镇', time: '08:42', state: '已派单', handler: '仓山镇网格员' },
      { id: 'A002', level: '橙', title: 'SOS 紧急呼叫', area: '旌阳区孝感街道', time: '09:15', state: '处理中', handler: '孝感街道养老站' },
      { id: 'A003', level: '黄', title: '血压异常预警', area: '绵竹市紫岩街道', time: '10:03', state: '已解除', handler: '紫岩社区卫生服务中心' },
      { id: 'A004', level: '橙', title: '离床超时提醒', area: '广汉市雒城街道', time: '10:31', state: '处理中', handler: '雒城街道养老站' },
      { id: 'A005', level: '红', title: '燃气泄漏告警', area: '中江县凯江镇', time: '11:20', state: '待处置', handler: '' },
      { id: 'A006', level: '黄', title: '跌倒检测预警', area: '罗江区万安镇', time: '11:48', state: '已派单', handler: '万安养老站' }
    ],
    institutions: [
      { id: 'JG001', code: 'JG001', name: '旌阳区智慧养老服务中心', district: '旌阳区', type: '公办养老', beds: 320, status: '运营中', elders: 298, occupancy: '93%', assess: '混合' },
      { id: 'JG002', code: 'JG002', name: '罗江区社会福利院', district: '罗江区', type: '公办养老', beds: 210, status: '运营中', elders: 188, occupancy: '90%', assess: '自理偏多' },
      { id: 'JG003', code: 'JG003', name: '中江县第二敬老院', district: '中江县', type: '公办养老', beds: 180, status: '整改中', elders: 150, occupancy: '83%', assess: '失能偏多' },
      { id: 'JG004', code: 'JG004', name: '广汉市颐养院', district: '广汉市', type: '民办非企', beds: 260, status: '运营中', elders: 241, occupancy: '93%', assess: '混合' },
      { id: 'JG005', code: 'JG005', name: '什邡市康养中心', district: '什邡市', type: '民办非企', beds: 190, status: '运营中', elders: 176, occupancy: '93%', assess: '混合' },
      { id: 'JG006', code: 'JG006', name: '绵竹市第三敬老院', district: '绵竹市', type: '公办养老', beds: 240, status: '运营中', elders: 226, occupancy: '94%', assess: '失能偏多' },
      { id: 'JG007', code: 'JG007', name: '旌阳区孝感街道养老站', district: '旌阳区', type: '社区嵌入式', beds: 60, status: '筹建中', elders: 0, occupancy: '0%', assess: '自理偏多' }
    ],
    facilities: [
      { id: 'SQ001', code: 'SQ001', name: '沱江社区长者食堂', community: '旌阳区沱江', type: '长者食堂', monthly: 3200, status: '运营中' },
      { id: 'SQ002', code: 'SQ002', name: '文昌社区日间照料中心', community: '中江县文昌', type: '日间照料', monthly: 2100, status: '运营中' },
      { id: 'SQ003', code: 'SQ003', name: '雒城街道助老服务站', community: '广汉市雒城', type: '助老服务', monthly: 1800, status: '运营中' },
      { id: 'SQ004', code: 'SQ004', name: '紫岩社区文娱活动室', community: '绵竹市紫岩', type: '文娱活动', monthly: 1500, status: '运营中' },
      { id: 'SQ005', code: 'SQ005', name: '方亭街道康复点', community: '什邡市方亭', type: '康复护理', monthly: 1200, status: '运营中' }
    ],
    orders: [
      { id: 'O001', code: 'GD202607001', elder: '张某某（独居）', district: '中江县仓山镇', service: '助餐', response: '7.2 分钟', status: '已完成' },
      { id: 'O002', code: 'GD202607002', elder: '李某某（高龄）', district: '旌阳区孝感', service: '助洁', response: '9.1 分钟', status: '已完成' },
      { id: 'O003', code: 'GD202607003', elder: '王某某（失能）', district: '广汉市雒城', service: '护理', response: '6.8 分钟', status: '进行中' },
      { id: 'O004', code: 'GD202607004', elder: '赵某某（独居）', district: '绵竹市紫岩', service: '助浴', response: '11.3 分钟', status: '已完成' },
      { id: 'O005', code: 'GD202607005', elder: '陈某某（高龄）', district: '罗江区万安', service: '陪伴', response: '8.0 分钟', status: '已完成' },
      { id: 'O006', code: 'GD202607006', elder: '刘某某（独居）', district: '旌阳区孝感', service: '助餐', response: '5.5 分钟', status: '已完成' }
    ],
    devices: [
      { id: 'D001', code: 'D001', name: '智能烟感-仓山镇01', type: '烟感探测器', area: '中江县仓山镇', status: '在线', last: '2026-07-29 11:50' },
      { id: 'D002', code: 'D002', name: 'SOS呼叫器-孝感02', type: 'SOS呼叫', area: '旌阳区孝感', status: '在线', last: '2026-07-29 11:48' },
      { id: 'D003', code: 'D003', name: '红外人体感应-紫岩03', type: '红外感应', area: '绵竹市紫岩', status: '离线', last: '2026-07-29 10:12' },
      { id: 'D004', code: 'D004', name: '智能血压计-雒城04', type: '健康检测', area: '广汉市雒城', status: '在线', last: '2026-07-29 11:30' },
      { id: 'D005', code: 'D005', name: '燃气报警器-凯江05', type: '燃气报警', area: '中江县凯江', status: '故障', last: '2026-07-29 09:05' },
      { id: 'D006', code: 'D006', name: '睡眠监测带-万安06', type: '睡眠监测', area: '罗江区万安', status: '在线', last: '2026-07-29 11:55' }
    ],
    users: [
      { id: 'U001', acc: 'admin01', name: '市民政局管理员', role: '超级管理员', on: true },
      { id: 'U002', acc: 'mgr_jy', name: '旌阳区管理员', role: '区县账号', on: true },
      { id: 'U003', acc: 'mgr_zj', name: '中江县管理员', role: '区县账号', on: true },
      { id: 'U004', acc: 'org_001', name: '服务中心操作员', role: '机构管理员', on: false },
      { id: 'U005', acc: 'org_004', name: '广汉颐养院操作员', role: '机构管理员', on: true }
    ],
    roles: [
      { id: 'R001', name: '超级管理员', scope: '全市', users: 2, perms: { 总览: true, 业务数据: true, 数据接入: true, 告警: true, 物联设备: true, 可视化配置: true, 权限: true, 内容: true, 审计: true, 监控: true } },
      { id: 'R002', name: '市监管账号', scope: '全市', users: 6, perms: { 总览: true, 业务数据: true, 数据接入: true, 告警: true, 物联设备: true, 可视化配置: true, 权限: false, 内容: true, 审计: false, 监控: true } },
      { id: 'R003', name: '区县账号', scope: '本区县', users: 18, perms: { 总览: true, 业务数据: true, 数据接入: true, 告警: true, 物联设备: true, 可视化配置: true, 权限: false, 内容: true, 审计: false, 监控: false } },
      { id: 'R004', name: '机构管理员', scope: '本机构', users: 64, perms: { 总览: true, 业务数据: true, 数据接入: false, 告警: false, 物联设备: true, 可视化配置: false, 权限: false, 内容: false, 审计: false, 监控: false } }
    ],
    contents: [
      { id: 'C001', title: '夏季居家防暑指南', category: '科普文章', status: '已发布', publishAt: '2026-07-20' },
      { id: 'C002', title: '智慧养老政策解读', category: '政策解读', status: '已发布', publishAt: '2026-07-22' },
      { id: 'C003', title: '长者食堂本周菜单', category: '通知公告', status: '草稿', publishAt: '' },
      { id: 'C004', title: '防诈骗宣传视频', category: '宣教视频', status: '已发布', publishAt: '2026-07-25' },
      { id: 'C005', title: '秋季健康讲座报名', category: '活动招募', status: '已下线', publishAt: '2026-07-10' }
    ],
    sources: [
      { id: 'S001', name: '四川省养老服务平台', type: '省级接口', status: '正常', lastSync: '2026-07-29 11:00', interval: '每30分钟' },
      { id: 'S002', name: '德阳民政业务库', type: '本地数据库', status: '正常', lastSync: '2026-07-29 11:20', interval: '每15分钟' },
      { id: 'S003', name: '卫健委健康档案', type: '市级接口', status: '正常', lastSync: '2026-07-29 10:45', interval: '每小时' },
      { id: 'S004', name: '物联网设备网关', type: '设备接入', status: '警告', lastSync: '2026-07-29 09:05', interval: '实时' },
      { id: 'S005', name: '12349为老服务热线', type: '呼叫中心', status: '正常', lastSync: '2026-07-29 11:10', interval: '每5分钟' }
    ],
    metrics: [
      { id: 'M001', name: '大屏服务 CPU 使用率', value: '38%', unit: '', status: '健康', trend: '平稳' },
      { id: 'M002', name: '接口平均时延', value: '126', unit: 'ms', status: '健康', trend: '平稳' },
      { id: 'M003', name: '今日数据同步', value: '1842', unit: '次', status: '健康', trend: '上升' },
      { id: 'M004', name: '地图渲染节点', value: '6', unit: '个', status: '健康', trend: '平稳' },
      { id: 'M005', name: '告警通道', value: '在线', unit: '', status: '健康', trend: '平稳' },
      { id: 'M006', name: '数据库负载', value: '52%', unit: '', status: '健康', trend: '平稳' }
    ],
    alertRules: [
      { id: 'AR001', name: 'CPU 高负载', target: '大屏服务 CPU 使用率', op: '>', threshold: 80, unit: '%', level: '红', channel: '短信+站内', silence: 10, enabled: true },
      { id: 'AR002', name: '接口响应超时', target: '接口平均时延', op: '>', threshold: 500, unit: 'ms', level: '橙', channel: '站内', silence: 5, enabled: true },
      { id: 'AR003', name: '数据同步骤降', target: '今日数据同步', op: '<', threshold: 800, unit: '次', level: '黄', channel: '站内', silence: 30, enabled: true },
      { id: 'AR004', name: '数据库负载预警', target: '数据库负载', op: '>', threshold: 75, unit: '%', level: '橙', channel: '短信+站内', silence: 15, enabled: true },
      { id: 'AR005', name: '地图渲染节点缺失', target: '地图渲染节点', op: '<', threshold: 6, unit: '个', level: '红', channel: '电话+短信', silence: 0, enabled: false }
    ],
    medical: [
      { id: 'MED001', code: 'MED001', name: '旌阳区人民医院', srcDistrict: '旌阳区', district: '旌阳区', nature: '公立', level: '三级甲等', address: '旌阳区泰山北路一段', type: '综合医院', status: '正常接诊' },
      { id: 'MED002', code: 'MED002', name: '德阳市中医医院', srcDistrict: '旌阳区', district: '旌阳区', nature: '公立', level: '三级乙等', address: '旌阳区天山北路', type: '中医医院', status: '正常接诊' },
      { id: 'MED003', code: 'MED003', name: '旌阳区妇幼保健院', srcDistrict: '旌阳区', district: '旌阳区', nature: '公立', level: '二级甲等', address: '旌阳区岷江西路', type: '妇幼保健院', status: '正常接诊' },
      { id: 'MED004', code: 'MED004', name: '德阳华山眼科医院', srcDistrict: '旌阳区', district: '旌阳区', nature: '私立', level: '待核实', address: '旌阳区长江东路', type: '其他专科', status: '正常接诊' },
      { id: 'MED005', code: 'MED005', name: '罗江区人民医院', srcDistrict: '罗江区', district: '罗江区', nature: '公立', level: '二级甲等', address: '罗江区万安南路', type: '综合医院', status: '正常接诊' },
      { id: 'MED006', code: 'MED006', name: '罗江区万安镇卫生院', srcDistrict: '罗江区', district: '罗江区', nature: '公立', level: '未定级（基层）', address: '罗江区万安镇', type: '乡镇卫生院', status: '正常接诊' },
      { id: 'MED007', code: 'MED007', name: '罗江博爱康复医院', srcDistrict: '罗江区', district: '罗江区', nature: '私立', level: '待核实', address: '罗江区纹江路', type: '护理机构', status: '正常接诊' },
      { id: 'MED008', code: 'MED008', name: '中江县人民医院', srcDistrict: '中江县', district: '中江县', nature: '公立', level: '三级甲等', address: '中江县凯江镇大北街', type: '综合医院', status: '正常接诊' },
      { id: 'MED009', code: 'MED009', name: '中江县中医医院', srcDistrict: '中江县', district: '中江县', nature: '公立', level: '三级乙等', address: '中江县一环路北段', type: '中医医院', status: '正常接诊' },
      { id: 'MED010', code: 'MED010', name: '中江县妇幼保健院', srcDistrict: '中江县', district: '中江县', nature: '公立', level: '二级甲等', address: '中江县城区一环路东段', type: '妇幼保健院', status: '正常接诊' },
      { id: 'MED011', code: 'MED011', name: '中江县精神病医院', srcDistrict: '中江县', district: '中江县', nature: '公立', level: '二级乙等', address: '中江县南华镇', type: '精神专科', status: '正常接诊' },
      { id: 'MED012', code: 'MED012', name: '中江民瑞医院', srcDistrict: '中江县', district: '中江县', nature: '私立', level: '待核实', address: '中江县凯江镇', type: '综合医院', status: '正常接诊' },
      { id: 'MED013', code: 'MED013', name: '广汉市人民医院', srcDistrict: '广汉市', district: '广汉市', nature: '公立', level: '三级乙等', address: '广汉市汉口路', type: '综合医院', status: '正常接诊' },
      { id: 'MED014', code: 'MED014', name: '广汉市妇幼保健院', srcDistrict: '广汉市', district: '广汉市', nature: '公立', level: '二级甲等', address: '广汉市佛山路西段', type: '妇幼保健院', status: '正常接诊' },
      { id: 'MED015', code: 'MED015', name: '广汉市雒城街道社区卫生服务中心', srcDistrict: '广汉市', district: '广汉市', nature: '公立', level: '未定级（基层）', address: '广汉市雒城街道', type: '乡镇卫生院', status: '正常接诊' },
      { id: 'MED016', code: 'MED016', name: '广汉骨科医院', srcDistrict: '广汉市', district: '广汉市', nature: '私立', level: '二级乙等', address: '广汉市西安路', type: '其他专科', status: '正常接诊' },
      { id: 'MED017', code: 'MED017', name: '什邡市人民医院', srcDistrict: '什邡市', district: '什邡市', nature: '公立', level: '二级甲等', address: '什邡市方亭镇', type: '综合医院', status: '正常接诊' },
      { id: 'MED018', code: 'MED018', name: '什邡市妇幼保健院', srcDistrict: '什邡市', district: '什邡市', nature: '公立', level: '二级乙等', address: '什邡市金河南路', type: '妇幼保健院', status: '正常接诊' },
      { id: 'MED019', code: 'MED019', name: '什邡市方亭社区卫生服务中心', srcDistrict: '什邡市', district: '什邡市', nature: '公立', level: '未定级（基层）', address: '什邡市方亭街道', type: '乡镇卫生院', status: '正常接诊' },
      { id: 'MED020', code: 'MED020', name: '什邡爱尔眼科医院', srcDistrict: '什邡市', district: '什邡市', nature: '私立', level: '待核实', address: '什邡市蓥峰北路', type: '其他专科', status: '正常接诊' },
      { id: 'MED021', code: 'MED021', name: '绵竹市人民医院', srcDistrict: '绵竹市', district: '绵竹市', nature: '公立', level: '三级乙等', address: '绵竹市剑南镇', type: '综合医院', status: '正常接诊' },
      { id: 'MED022', code: 'MED022', name: '绵竹市妇幼保健院', srcDistrict: '绵竹市', district: '绵竹市', nature: '公立', level: '二级甲等', address: '绵竹市紫岩街道', type: '妇幼保健院', status: '正常接诊' },
      { id: 'MED023', code: 'MED023', name: '绵竹市紫岩社区卫生服务中心', srcDistrict: '绵竹市', district: '绵竹市', nature: '公立', level: '未定级（基层）', address: '绵竹市紫岩街道', type: '乡镇卫生院', status: '正常接诊' },
      { id: 'MED024', code: 'MED024', name: '绵竹聚康医养护理院', srcDistrict: '绵竹市', district: '绵竹市', nature: '私立', level: '待核实', address: '绵竹市东北镇', type: '护理机构', status: '正常接诊' },
      { id: 'MED025', code: 'MED025', name: '德阳市卫健委', srcDistrict: '旌阳区', district: '旌阳区', nature: '公立', level: '—', address: '旌阳区长江东路', type: '卫生健康行政', status: '正常接诊' },
      { id: 'MED026', code: 'MED026', name: '德阳市疾病预防控制中心', srcDistrict: '旌阳区', district: '旌阳区', nature: '公立', level: '—', address: '旌阳区峨眉南路', type: '疾病预防控制', status: '正常接诊' }
    ]
  }
}

// 初始化：如果数据文件不存在或为空，写入种子
let db = loadDB()
if (!db || !db.config) {
  db = JSON.parse(JSON.stringify(SEED)) // 深拷贝种子
  saveDB(db)
}

// ========== HTTP 工具 ==========
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    // 关键：禁止任何缓存，确保前端每次都拿到最新数据（避免刷新后读到旧列表 / 大屏不同步）
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(body)
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => { data += c; if (data.length > 5e6) req.destroy() })
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}
function parseId(url, prefix) {
  const m = url.slice(prefix.length).match(/^\/([^/]+)/)
  return m ? decodeURIComponent(m[1]) : null
}
function nextId(arr) {
  if (!arr || !arr.length) return 1
  return Math.max(...arr.map(x => x.id || 0)) + 1
}

// ========== 路由 ==========
async function router(req, res) {
  const url = req.url.split('?')[0]
  const method = req.method

  if (method === 'OPTIONS') return sendJSON(res, 204, {})
  if (url === '/api/health') return sendJSON(res, 200, { ok: true, time: nowStr() })

  // ---- 大屏配置 ----
  if (url === '/api/config' && method === 'GET') {
    return sendJSON(res, 200, {
      title: db.config.title,
      modules: db.config.modules,
      mapMode: db.config.mapMode,
      ticker: db.config.ticker,
      theme: db.config.theme
    })
  }
  if (url === '/api/config' && method === 'PUT') {
    const b = await readBody(req)
    Object.assign(db.config, {
      title: b.title,
      modules: b.modules,
      mapMode: b.mapMode,
      ticker: !!b.ticker,
      theme: b.theme
    })
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }

  // ---- 区县统计 ----
  if (url === '/api/districts' && method === 'GET') {
    return sendJSON(res, 200, db.districts)
  }
  if (url === '/api/districts' && method === 'POST') {
    const b = await readBody(req)
    const id = nextId(db.districts)
    db.districts.push({ id, name: b.name, elderly: b.elderly, beds: b.beds })
    saveDB(db)
    return sendJSON(res, 200, { id, ok: true })
  }
  if (url.startsWith('/api/districts/') && method === 'PUT') {
    const id = parseInt(parseId(url, '/api/districts/'))
    const b = await readBody(req)
    const row = db.districts.find(d => d.id === id)
    if (row) Object.assign(row, { name: b.name, elderly: b.elderly, beds: b.beds })
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }
  if (url.startsWith('/api/districts/') && method === 'DELETE') {
    const id = parseInt(parseId(url, '/api/districts/'))
    db.districts = db.districts.filter(d => d.id !== id)
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }

  // ---- 地图点位 ----
  if (url === '/api/points' && method === 'GET') {
    return sendJSON(res, 200, db.points)
  }
  if (url === '/api/points' && method === 'POST') {
    const b = await readBody(req)
    const id = b.id || ('P' + Date.now())
    db.points.push({ id, name: b.name, type: b.type, area: b.area, lng: b.lng, lat: b.lat })
    saveDB(db)
    return sendJSON(res, 200, { id, ok: true })
  }
  if (url.startsWith('/api/points/') && method === 'DELETE') {
    const id = parseId(url, '/api/points/')
    db.points = db.points.filter(p => p.id !== id)
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }

  // ---- 通用业务实体（records）----
  const recMatch = url.match(/^\/api\/records\/([^/]+)(?:\/([^/]+))?$/)
  if (recMatch && method === 'GET') {
    const entity = decodeURIComponent(recMatch[1])
    return sendJSON(res, 200, db.records[entity] || [])
  }
  if (recMatch && method === 'POST') {
    const entity = decodeURIComponent(recMatch[1])
    const b = await readBody(req)
    if (!db.records[entity]) db.records[entity] = []
    // upsert by id
    const idx = db.records[entity].findIndex(r => r.id === b.id)
    if (idx >= 0) db.records[entity][idx] = b
    else db.records[entity].push(b)
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }
  if (recMatch && method === 'PUT') {
    const entity = decodeURIComponent(recMatch[1])
    const list = await readBody(req)
    db.records[entity] = list || []
    saveDB(db)
    return sendJSON(res, 200, { ok: true, count: (list || []).length })
  }
  if (recMatch && method === 'DELETE' && recMatch[2]) {
    const entity = decodeURIComponent(recMatch[1])
    const id = decodeURIComponent(recMatch[2])
    if (db.records[entity]) db.records[entity] = db.records[entity].filter(r => r.id !== id)
    saveDB(db)
    return sendJSON(res, 200, { ok: true })
  }

  // 静态产物兜底
  const distIndex = path.join(__dirname, '..', 'dist', 'index.html')
  if (fs.existsSync(distIndex) && (url === '/' || !url.startsWith('/api'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(fs.readFileSync(distIndex))
  }

  return sendJSON(res, 404, { error: 'not found', url })
}

const server = http.createServer((req, res) => {
  router(req, res).catch((e) => {
    console.error('[API ERROR]', e)
    if (!res.headersSent) sendJSON(res, 500, { error: String(e && e.message || e) })
  })
})
server.listen(PORT, () => {
  console.log(`[cockpit-server] 已启动: http://localhost:${PORT}  (storage: ${DATA_FILE})`)
})
