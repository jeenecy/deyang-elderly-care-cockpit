import { defineStore } from 'pinia'
import { reactive, computed, ref } from 'vue'
import { api } from '../api/client.js'
import { useToast } from '../composables/useToast.js'

// 业务数据中心 —— 后台所有页面共享同一份可变数据，操作即时联动大屏与总览
export const useDataStore = defineStore('data', () => {
  let seq = 1000
  const uid = (p) => p + (++seq)
  const toast = useToast()

  function now() {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  // ===== 操作日志 =====
  const logs = reactive([])
  function logOp(action, target, user = '当前管理员') {
    logs.unshift({ id: uid('LOG'), time: now(), action, target, user })
  }

  // 通用 CRUD 工厂：list 为 reactive 数组，prefix 为编号前缀，label 为中文名用于日志
  // entity 为后端 records 表的实体名（传了才持久化）；不传则纯本地（如 logs）。
  // 写入改为 await 落库；失败则回滚本地改动并弹错误提示，避免「假成功 / 刷新后丢失」。
  function persistEntity(entity, item, op) {
    if (!entity) return Promise.resolve(true)
    const p = op === 'remove'
      ? api.records.remove(entity, item.id)
      : api.records.save(entity, item)
    return p
      .then(() => true)
      .catch((e) => {
        console.error(`[data] ${op === 'remove' ? '删除' : '保存'} ${entity} 失败`, e)
        toast.error(`数据${op === 'remove' ? '删除' : '保存'}失败：${entity}（请确认后端服务已启动）`)
        return false
      })
  }
  function crud(list, prefix, label, entity) {
    return {
      async add(row) {
        const id = uid(prefix)
        const item = { id, ...row }
        if (item.code === undefined) item.code = id
        list.push(item)
        logOp('新增' + label, row.name || row.title || row.acc || row.elder || id)
        const ok = await persistEntity(entity, item)
        if (!ok) {
          const i = list.findIndex((x) => x.id === id)
          if (i > -1) list.splice(i, 1)
        }
        return ok ? id : null
      },
      async update(id, row) {
        const i = list.find((x) => x.id === id)
        if (!i) return false
        const before = { ...i }
        Object.assign(i, row)
        logOp('更新' + label, row.name || row.title || row.acc || row.elder || id)
        const ok = await persistEntity(entity, i)
        if (!ok) Object.assign(i, before)
        return ok
      },
      async remove(id) {
        const i = list.findIndex((x) => x.id === id)
        if (i < 0) return false
        const item = list[i]
        logOp('删除' + label, item.name || item.title || item.elder || id)
        list.splice(i, 1)
        const ok = await persistEntity(entity, item, 'remove')
        if (!ok) list.splice(i, 0, item)
        return ok
      }
    }
  }

  // ===== 养老机构（政府监管 + 机构养老共用）=====
  const institutions = reactive([
    { id: 'JG001', code: 'JG001', name: '旌阳区智慧养老服务中心', district: '旌阳区', type: '公办养老', beds: 320, status: '运营中', elders: 298, occupancy: '93%', assess: '混合' },
    { id: 'JG002', code: 'JG002', name: '罗江区社会福利院', district: '罗江区', type: '公办养老', beds: 210, status: '运营中', elders: 188, occupancy: '90%', assess: '自理偏多' },
    { id: 'JG003', code: 'JG003', name: '中江县第二敬老院', district: '中江县', type: '公办养老', beds: 180, status: '整改中', elders: 150, occupancy: '83%', assess: '失能偏多' },
    { id: 'JG004', code: 'JG004', name: '广汉市颐养院', district: '广汉市', type: '民办非企', beds: 260, status: '运营中', elders: 241, occupancy: '93%', assess: '混合' },
    { id: 'JG005', code: 'JG005', name: '什邡市康养中心', district: '什邡市', type: '民办非企', beds: 190, status: '运营中', elders: 176, occupancy: '93%', assess: '混合' },
    { id: 'JG006', code: 'JG006', name: '绵竹市第三敬老院', district: '绵竹市', type: '公办养老', beds: 240, status: '运营中', elders: 226, occupancy: '94%', assess: '失能偏多' },
    { id: 'JG007', code: 'JG007', name: '旌阳区孝感街道养老站', district: '旌阳区', type: '社区嵌入式', beds: 60, status: '筹建中', elders: 0, occupancy: '0%', assess: '自理偏多' }
  ])

  // ===== 社区养老设施 =====
  const facilities = reactive([
    { id: 'SQ001', code: 'SQ001', name: '沱江社区长者食堂', community: '旌阳区沱江', type: '长者食堂', monthly: 3200, status: '运营中' },
    { id: 'SQ002', code: 'SQ002', name: '文昌社区日间照料中心', community: '中江县文昌', type: '日间照料', monthly: 2100, status: '运营中' },
    { id: 'SQ003', code: 'SQ003', name: '雒城街道助老服务站', community: '广汉市雒城', type: '助老服务', monthly: 1800, status: '运营中' },
    { id: 'SQ004', code: 'SQ004', name: '紫岩社区文娱活动室', community: '绵竹市紫岩', type: '文娱活动', monthly: 1500, status: '运营中' },
    { id: 'SQ005', code: 'SQ005', name: '方亭街道康复点', community: '什邡市方亭', type: '康复护理', monthly: 1200, status: '运营中' }
  ])

  // ===== 居家养老工单 =====
  const orders = reactive([
    { id: 'O001', code: 'GD202607001', elder: '张某某（独居）', district: '中江县仓山镇', service: '助餐', response: '7.2 分钟', status: '已完成' },
    { id: 'O002', code: 'GD202607002', elder: '李某某（高龄）', district: '旌阳区孝感', service: '助洁', response: '9.1 分钟', status: '已完成' },
    { id: 'O003', code: 'GD202607003', elder: '王某某（失能）', district: '广汉市雒城', service: '护理', response: '6.8 分钟', status: '进行中' },
    { id: 'O004', code: 'GD202607004', elder: '赵某某（独居）', district: '绵竹市紫岩', service: '助浴', response: '11.3 分钟', status: '已完成' },
    { id: 'O005', code: 'GD202607005', elder: '陈某某（高龄）', district: '罗江区万安', service: '陪伴', response: '8.0 分钟', status: '已完成' },
    { id: 'O006', code: 'GD202607006', elder: '刘某某（独居）', district: '旌阳区孝感', service: '助餐', response: '5.5 分钟', status: '已完成' }
  ])

  // ===== 告警（等级：紧急/严重/一般/提示；状态：待处理/处理中/已解决/已忽略）=====
  // 字段说明：level 等级 | title 标题 | type 类型 | source 来源 | area 详细区域 | district 标准区县
  // ruleName 触发规则（来源追踪）| time 发生时间(YYYY-MM-DD HH:mm，可排序) | state 状态
  // handler 处置人 | note 处置说明 | resolvedAt 解决时间
  const alerts = reactive([
    { id: 'A001', level: '紧急', title: '独居老人烟感浓度超阈', type: '安全事件', source: '物联设备', area: '中江县仓山镇', district: '中江县', ruleName: '烟感浓度超阈', time: '2026-08-03 08:42', state: '处理中', handler: '仓山镇网格员', note: '已上门核查，烟感误报后复位', resolvedAt: '' },
    { id: 'A002', level: '紧急', title: 'SOS 紧急呼叫未响应', type: '安全事件', source: '物联设备', area: '旌阳区孝感街道', district: '旌阳区', ruleName: 'SOS 超时未响应', time: '2026-08-03 09:15', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A003', level: '紧急', title: '燃气泄漏告警', type: '安全事件', source: '物联设备', area: '中江县凯江镇', district: '中江县', ruleName: '燃气浓度超阈', time: '2026-08-02 11:20', state: '已解决', handler: '凯江镇养老站', note: '已联动燃气公司处置并通风', resolvedAt: '2026-08-02 12:05' },
    { id: 'A004', level: '严重', title: '离床超时提醒', type: '健康预警', source: '物联设备', area: '广汉市雒城街道', district: '广汉市', ruleName: '离床超 2 小时', time: '2026-08-03 10:31', state: '处理中', handler: '雒城街道养老站', note: '', resolvedAt: '' },
    { id: 'A005', level: '严重', title: '血压异常预警', type: '健康预警', source: '系统监测', area: '绵竹市紫岩街道', district: '绵竹市', ruleName: '血压越界', time: '2026-08-03 07:50', state: '已解决', handler: '紫岩社区卫生服务中心', note: '已随访并调整用药', resolvedAt: '2026-08-03 09:10' },
    { id: 'A006', level: '严重', title: '跌倒检测预警', type: '安全事件', source: '物联设备', area: '罗江区万安镇', district: '罗江区', ruleName: '跌倒姿态识别', time: '2026-08-02 15:48', state: '已解决', handler: '万安镇养老站', note: '家属已到场，老人无碍', resolvedAt: '2026-08-02 16:20' },
    { id: 'A007', level: '严重', title: '设备离线预警', type: '设备异常', source: '系统监测', area: '绵竹市紫岩街道', district: '绵竹市', ruleName: '设备离线', time: '2026-08-03 06:12', state: '处理中', handler: '运维组', note: '更换网关模块', resolvedAt: '' },
    { id: 'A008', level: '严重', title: '数据同步骤降', type: '服务异常', source: '第三方接口', area: '德阳市', district: '旌阳区', ruleName: '数据同步骤降', time: '2026-08-01 22:30', state: '已忽略', handler: '数据组', note: '接口维护窗口，非故障', resolvedAt: '2026-08-01 23:00' },
    { id: 'A009', level: '一般', title: '心率异常波动', type: '健康预警', source: '物联设备', area: '广汉市雒城街道', district: '广汉市', ruleName: '心率越界', time: '2026-08-03 11:02', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A010', level: '一般', title: '夜间多次起夜', type: '健康预警', source: '物联设备', area: '旌阳区孝感街道', district: '旌阳区', ruleName: '起夜频次', time: '2026-08-03 02:18', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A011', level: '一般', title: '用药提醒未确认', type: '服务异常', source: '人工上报', area: '中江县仓山镇', district: '中江县', ruleName: '工单超时', time: '2026-08-02 18:40', state: '处理中', handler: '仓山镇网格员', note: '', resolvedAt: '' },
    { id: 'A012', level: '一般', title: '助餐工单超时', type: '服务异常', source: '系统监测', area: '罗江区万安镇', district: '罗江区', ruleName: '工单超时', time: '2026-08-02 12:05', state: '已解决', handler: '万安镇养老站', note: '已补派并送达', resolvedAt: '2026-08-02 12:50' },
    { id: 'A013', level: '一般', title: '环境温度偏高', type: '设备异常', source: '物联设备', area: '什邡市方亭街道', district: '什邡市', ruleName: '环境温度越界', time: '2026-08-03 13:30', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A014', level: '一般', title: '水位传感器低电量', type: '设备异常', source: '系统监测', area: '广汉市雒城街道', district: '广汉市', ruleName: '设备低电量', time: '2026-08-01 09:00', state: '已解决', handler: '运维组', note: '已更换电池', resolvedAt: '2026-08-01 10:20' },
    { id: 'A015', level: '一般', title: '门磁长时间开启', type: '安全事件', source: '物联设备', area: '绵竹市紫岩街道', district: '绵竹市', ruleName: '门磁异常', time: '2026-08-02 20:15', state: '已忽略', handler: '紫岩社区', note: '老人外出散步，正常', resolvedAt: '2026-08-02 20:40' },
    { id: 'A016', level: '提示', title: '健康档案待更新', type: '服务异常', source: '人工上报', area: '旌阳区孝感街道', district: '旌阳区', ruleName: '档案更新提醒', time: '2026-08-03 09:00', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A017', level: '提示', title: '设备固件可升级', type: '设备异常', source: '系统监测', area: '什邡市方亭街道', district: '什邡市', ruleName: '固件版本', time: '2026-08-01 14:00', state: '已忽略', handler: '运维组', note: '非紧急，下月统一升级', resolvedAt: '2026-08-01 14:30' },
    { id: 'A018', level: '提示', title: '巡检计划待执行', type: '服务异常', source: '第三方接口', area: '中江县凯江镇', district: '中江县', ruleName: '巡检提醒', time: '2026-08-03 08:00', state: '待处理', handler: '', note: '', resolvedAt: '' },
    { id: 'A019', level: '提示', title: '满意度回访提醒', type: '服务异常', source: '人工上报', area: '罗江区万安镇', district: '罗江区', ruleName: '回访提醒', time: '2026-08-02 16:00', state: '已解决', handler: '万安镇养老站', note: '已完成回访', resolvedAt: '2026-08-02 17:00' },
    { id: 'A020', level: '提示', title: '知识库内容待审核', type: '服务异常', source: '第三方接口', area: '德阳市', district: '旌阳区', ruleName: '内容审核', time: '2026-08-01 10:00', state: '已解决', handler: '内容组', note: '已审核发布', resolvedAt: '2026-08-01 11:00' },
    { id: 'A021', level: '严重', title: '紧急呼叫中心话务高峰', type: '服务异常', source: '第三方接口', area: '德阳市', district: '旌阳区', ruleName: '话务并发', time: '2026-08-03 14:10', state: '处理中', handler: '12349 热线', note: '增开坐席', resolvedAt: '' },
    { id: 'A022', level: '一般', title: '定位信号弱', type: '设备异常', source: '物联设备', area: '广汉市雒城街道', district: '广汉市', ruleName: '定位信号', time: '2026-08-02 21:00', state: '已解决', handler: '运维组', note: '调整腕表位置', resolvedAt: '2026-08-02 21:30' }
  ])

  // ===== 物联设备 =====
  const devices = reactive([
    { id: 'D001', code: 'D001', name: '智能烟感-仓山镇01', type: '烟感探测器', area: '中江县仓山镇', status: '在线', last: '2026-07-29 11:50' },
    { id: 'D002', code: 'D002', name: 'SOS呼叫器-孝感02', type: 'SOS呼叫', area: '旌阳区孝感', status: '在线', last: '2026-07-29 11:48' },
    { id: 'D003', code: 'D003', name: '红外人体感应-紫岩03', type: '红外感应', area: '绵竹市紫岩', status: '离线', last: '2026-07-29 10:12' },
    { id: 'D004', code: 'D004', name: '智能血压计-雒城04', type: '健康检测', area: '广汉市雒城', status: '在线', last: '2026-07-29 11:30' },
    { id: 'D005', code: 'D005', name: '燃气报警器-凯江05', type: '燃气报警', area: '中江县凯江', status: '故障', last: '2026-07-29 09:05' },
    { id: 'D006', code: 'D006', name: '睡眠监测带-万安06', type: '睡眠监测', area: '罗江区万安', status: '在线', last: '2026-07-29 11:55' }
  ])

  // ===== 用户 =====
  const users = reactive([
    { id: 'U001', acc: 'admin01', name: '市民政局管理员', role: '超级管理员', org: '德阳市民政局', phone: '138****0001', on: true, password: '123456' },
    { id: 'U002', acc: 'mgr_jy', name: '旌阳区管理员', role: '区县账号', org: '旌阳区民政局', phone: '138****0002', on: true, password: '123456' },
    { id: 'U003', acc: 'mgr_zj', name: '中江县管理员', role: '区县账号', org: '中江县民政局', phone: '138****0003', on: true, password: '123456' },
    { id: 'U004', acc: 'org_001', name: '服务中心操作员', role: '机构管理员', org: '旌阳区孝感养老服务中心', phone: '138****0004', on: false, password: '123456' },
    { id: 'U005', acc: 'org_004', name: '广汉颐养院操作员', role: '机构管理员', org: '广汉市颐养院', phone: '138****0005', on: true, password: '123456' }
  ])
  // 当前登录用户（认证态，由 useAuth 维护）
  const currentUser = ref(null)

  // ===== 登录日志（G02 个人中心 / G10 安全审计共用）=====
  let loginSeq = 0
  const loginLogs = reactive([
    { id: 'LL001', userId: 'U001', username: 'admin01', ip: '192.168.1.20', device: 'Chrome 120 / Windows', location: '德阳市', result: 'success', time: '2026-08-04 09:02' },
    { id: 'LL002', userId: 'U001', username: 'admin01', ip: '192.168.1.20', device: 'Chrome 120 / Windows', location: '德阳市', result: 'fail', failReason: '密码错误', time: '2026-08-04 08:55' },
    { id: 'LL003', userId: 'U001', username: 'admin01', ip: '10.12.3.8', device: 'Safari / macOS', location: '德阳市', result: 'success', time: '2026-08-03 18:31' }
  ])
  function logLogin(entry) {
    const item = { id: 'LL' + (++loginSeq), time: now(), ...entry }
    loginLogs.unshift(item)
    api.records.save('loginLogs', item).catch(() => {})
  }

  // ===== 安全策略配置（G10 安全审计 · 登录策略，可由后台配置界面调整）=====
  const authConfig = reactive({
    maxFail: 5,        // 连续失败阈值（达到即锁定）
    lockMinutes: 30,   // 锁定分钟数
    captchaEnabled: true,   // 图形验证码总开关
    captchaThreshold: 2,    // 失败达此次数后出现验证码
    异地提醒: false    // 异地/新设备登录提醒
  })
  async function saveAuthConfig() {
    const ok = await persistEntity('authConfig', { id: 'CFG', ...authConfig })
    if (ok) toast.success('安全策略已保存')
    else toast.error('安全策略保存失败')
    return ok
  }

  // ===== 角色（RBAC，可编辑权限矩阵）=====
  const moduleList = ['总览', '业务数据', '数据接入', '告警', '物联设备', '可视化配置', '权限', '内容', '审计', '监控']
  function allOn() { return moduleList.reduce((o, m) => { o[m] = true; return o }, {}) }
  function viewOnly() { return moduleList.reduce((o, m) => { o[m] = m === '总览'; return o }, {}) }
  const roles = reactive([
    { id: 'R001', name: '超级管理员', scope: '全市', users: 2, perms: allOn() },
    { id: 'R002', name: '市监管账号', scope: '全市', users: 6, perms: { ...allOn(), 权限: false, 审计: false } },
    { id: 'R003', name: '区县账号', scope: '本区县', users: 18, perms: { ...viewOnly(), 业务数据: true, 数据接入: true, 告警: true, 物联设备: true, 可视化配置: true, 内容: true } },
    { id: 'R004', name: '机构管理员', scope: '本机构', users: 64, perms: { ...viewOnly(), 业务数据: true, 物联设备: true } }
  ])

  // ===== 内容运营 =====
  const contents = reactive([
    { id: 'C001', title: '夏季居家防暑指南', category: '科普文章', status: '已发布', publishAt: '2026-07-20' },
    { id: 'C002', title: '智慧养老政策解读', category: '政策解读', status: '已发布', publishAt: '2026-07-22' },
    { id: 'C003', title: '长者食堂本周菜单', category: '通知公告', status: '草稿', publishAt: '' },
    { id: 'C004', title: '防诈骗宣传视频', category: '宣教视频', status: '已发布', publishAt: '2026-07-25' },
    { id: 'C005', title: '秋季健康讲座报名', category: '活动招募', status: '已下线', publishAt: '2026-07-10' }
  ])

  // ===== 数据源 =====
  const sources = reactive([
    { id: 'S001', name: '四川省养老服务平台', type: '省级接口', status: '正常', lastSync: '2026-07-29 11:00', interval: '每30分钟' },
    { id: 'S002', name: '德阳民政业务库', type: '本地数据库', status: '正常', lastSync: '2026-07-29 11:20', interval: '每15分钟' },
    { id: 'S003', name: '卫健委健康档案', type: '市级接口', status: '正常', lastSync: '2026-07-29 10:45', interval: '每小时' },
    { id: 'S004', name: '物联网设备网关', type: '设备接入', status: '警告', lastSync: '2026-07-29 09:05', interval: '实时' },
    { id: 'S005', name: '12349为老服务热线', type: '呼叫中心', status: '正常', lastSync: '2026-07-29 11:10', interval: '每5分钟' }
  ])

  // ===== 监控指标 =====
  const metrics = reactive([
    { id: 'M001', name: '大屏服务 CPU 使用率', value: '38%', unit: '', status: '健康', trend: '平稳' },
    { id: 'M002', name: '接口平均时延', value: '126', unit: 'ms', status: '健康', trend: '平稳' },
    { id: 'M003', name: '今日数据同步', value: '1842', unit: '次', status: '健康', trend: '上升' },
    { id: 'M004', name: '地图渲染节点', value: '6', unit: '个', status: '健康', trend: '平稳' },
    { id: 'M005', name: '告警通道', value: '在线', unit: '', status: '健康', trend: '平稳' },
    { id: 'M006', name: '数据库负载', value: '52%', unit: '', status: '健康', trend: '平稳' }
  ])

  // ===== 告警规则（监控与运维 · 阈值配置）=====
  const alertRules = reactive([
    { id: 'R001', name: 'CPU 高负载', target: '大屏服务 CPU 使用率', op: '>', threshold: 80, unit: '%', level: '紧急', channel: '短信+站内', silence: 10, enabled: true },
    { id: 'R002', name: '接口响应超时', target: '接口平均时延', op: '>', threshold: 500, unit: 'ms', level: '严重', channel: '站内', silence: 5, enabled: true },
    { id: 'R003', name: '数据同步骤降', target: '今日数据同步', op: '<', threshold: 800, unit: '次', level: '一般', channel: '站内', silence: 30, enabled: true },
    { id: 'R004', name: '数据库负载预警', target: '数据库负载', op: '>', threshold: 75, unit: '%', level: '严重', channel: '短信+站内', silence: 15, enabled: true },
    { id: 'R005', name: '地图渲染节点缺失', target: '地图渲染节点', op: '<', threshold: 6, unit: '个', level: '紧急', channel: '电话+短信', silence: 0, enabled: false },
    { id: 'R006', name: '设备离线预警', target: '物联设备在线率', op: '<', threshold: 95, unit: '%', level: '严重', channel: '站内', silence: 20, enabled: true }
  ])

  // ===== 医疗机构（卫生专网签约机构，大屏独立图层）=====
  const medical = reactive([])

  // ===== 老人档案（G03 · 居家/社区/机构养老的关怀对象主数据）=====
  // 字段说明：name 姓名 | gender 性别 | age 年龄 | idNo 身份证号(可选)
  // district 标准区县 | town 街道乡镇 | address 详细住址 | phone 联系电话(可掩码)
  // livingType 居住类型 | careLevel 照护等级 | status 档案状态(在档/离档/转院)
  // belongOrg 所属机构(逻辑关联 institutions.name) | emergencyName/Phone/Relation 紧急联系人
  // healthTags 健康标签(数组，逗号无关，存为 string[]) | registerDate 建档日期(YYYY-MM-DD)
  const elderly = reactive([
    { id: 'E001', code: 'E001', name: '张文海', gender: '男', age: 82, idNo: '51060319440812****', district: '旌阳区', town: '孝感街道', address: '孝感街道怡康小区3栋2单元501', phone: '138****1021', livingType: '独居', careLevel: '失能', status: '在档', belongOrg: '旌阳区智慧养老服务中心', emergencyName: '张伟', emergencyPhone: '139****2233', emergencyRelation: '子女', healthTags: ['高血压', '糖尿病'], registerDate: '2026-03-12' },
    { id: 'E002', code: 'E002', name: '李秀兰', gender: '女', age: 78, idNo: '51060319481203****', district: '旌阳区', town: '孝感街道', address: '孝感街道安和苑7栋1单元302', phone: '137****3344', livingType: '与子女同住', careLevel: '半失能', status: '在档', belongOrg: '旌阳区孝感街道养老站', emergencyName: '张敏', emergencyPhone: '135****5566', emergencyRelation: '子女', healthTags: ['高血压'], registerDate: '2026-02-28' },
    { id: 'E003', code: 'E003', name: '王建国', gender: '男', age: 90, idNo: '51062319360821****', district: '中江县', town: '仓山镇', address: '仓山镇敬老院2号楼', phone: '136****7788', livingType: '机构养老', careLevel: '失能', status: '在档', belongOrg: '中江县第二敬老院', emergencyName: '王强', emergencyPhone: '138****9900', emergencyRelation: '子女', healthTags: ['冠心病', '脑卒中后遗症'], registerDate: '2026-01-15' },
    { id: 'E004', code: 'E004', name: '赵桂芳', gender: '女', age: 85, idNo: '51068119410309****', district: '广汉市', town: '雒城街道', address: '雒城街道滨江花园12栋', phone: '135****1122', livingType: '空巢', careLevel: '自理', status: '在档', belongOrg: '广汉市颐养院', emergencyName: '赵丽', emergencyPhone: '137****3344', emergencyRelation: '子女', healthTags: ['骨质疏松'], registerDate: '2026-04-02' },
    { id: 'E005', code: 'E005', name: '陈德明', gender: '男', age: 76, idNo: '51068319500517****', district: '绵竹市', town: '紫岩街道', address: '紫岩街道康馨苑5栋3单元', phone: '139****4455', livingType: '社区养老', careLevel: '半失能', status: '在档', belongOrg: '绵竹市第三敬老院', emergencyName: '陈晨', emergencyPhone: '138****6677', emergencyRelation: '子女', healthTags: ['高血压', '糖尿病'], registerDate: '2026-03-20' },
    { id: 'E006', code: 'E006', name: '刘淑华', gender: '女', age: 88, idNo: '51068219380725****', district: '什邡市', town: '方亭街道', address: '方亭街道幸福里8栋', phone: '137****8899', livingType: '独居', careLevel: '特护', status: '离档', belongOrg: '什邡市康养中心', emergencyName: '刘洋', emergencyPhone: '136****2211', emergencyRelation: '亲属', healthTags: ['认知障碍', '褥疮风险'], registerDate: '2026-01-30' },
    { id: 'E007', code: 'E007', name: '周学文', gender: '男', age: 71, idNo: '51060419550814****', district: '罗江区', town: '万安镇', address: '万安镇学府花园4栋2单元', phone: '138****3340', livingType: '与子女同住', careLevel: '自理', status: '在档', belongOrg: '罗江区社会福利院', emergencyName: '周婷', emergencyPhone: '135****5560', emergencyRelation: '子女', healthTags: ['视听障碍'], registerDate: '2026-05-11' },
    { id: 'E008', code: 'E008', name: '孙玉梅', gender: '女', age: 83, idNo: '51062319431208****', district: '中江县', town: '凯江镇', address: '凯江镇康乐小区1栋', phone: '139****7781', livingType: '空巢', careLevel: '失能', status: '转院', belongOrg: '中江县第二敬老院', emergencyName: '孙磊', emergencyPhone: '137****1190', emergencyRelation: '子女', healthTags: ['高血压', '冠心病'], registerDate: '2026-02-09' }
  ])

  // 初始化示例日志
  logOp('用户登录', '市民政局管理员')
  logOp('同步数据源', '四川省养老服务平台')
  logOp('处置告警', 'SOS紧急呼叫 → 处理中')

  // ===== CRUD 实例（entity 名对应后端 records 表，自动持久化）=====
  const instCrud = crud(institutions, 'JG', '机构', 'institutions')
  const facCrud = crud(facilities, 'SQ', '社区设施', 'facilities')
  const ordCrud = crud(orders, 'O', '居家工单', 'orders')
  const devCrud = crud(devices, 'D', '设备', 'devices')
  const userCrud = crud(users, 'U', '用户', 'users')
  const contentCrud = crud(contents, 'C', '内容', 'contents')
  const srcCrud = crud(sources, 'S', '数据源', 'sources')
  const ruleCrud = crud(alertRules, 'R', '告警规则', 'alertRules')
  // 医疗机构 CRUD（entity 对应后端 records 表 medical）
  const medCrud = crud(medical, 'MED', '医疗机构', 'medical')
  // 老人档案 CRUD（entity 对应后端 records 表 elderly）
  const elderCrud = crud(elderly, 'E', '老人档案', 'elderly')
  function setRuleOn(id, on) {
    const r = alertRules.find((x) => x.id === id)
    if (!r) return
    const before = r.enabled
    r.enabled = on
    logOp(on ? '启用告警规则' : '停用告警规则', r.name)
    persistEntity('alertRules', r).catch(() => { r.enabled = before })
  }

  // ===== 专属动作 =====
  async function handleAlert(id, state, handler, note) {
    const a = alerts.find((x) => x.id === id)
    if (!a) return
    const before = { state: a.state, handler: a.handler, note: a.note, resolvedAt: a.resolvedAt }
    a.state = state
    if (handler !== undefined) a.handler = handler
    if (note !== undefined) a.note = note
    if (state === '已解决' && !a.resolvedAt) a.resolvedAt = now()
    if (state !== '已解决') a.resolvedAt = ''
    logOp('告警处置', `${a.title} → ${state}`)
    const ok = await persistEntity('alerts', a)
    if (!ok) Object.assign(a, before)
  }

  // ===== 通知渠道配置（站内信 / 邮件 / 短信）=====
  const notifyConfig = reactive({
    channels: {
      site: { enabled: true, recipients: 'all_admins', levels: ['紧急', '严重', '一般', '提示'] },
      email: { enabled: true, address: 'mjz@deyang.gov.cn', levels: ['紧急', '严重'] },
      sms: { enabled: true, phones: '138****0000', levels: ['紧急'] }
    },
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    escalation: { enabled: true, minutes: 30, channel: 'sms' }
  })
  async function saveNotifyConfig() {
    const ok = await persistEntity('notifyConfig', { id: 'CFG', ...notifyConfig })
    if (ok) toast.success('通知配置已保存')
    else toast.error('通知配置保存失败')
    return ok
  }
  async function setDeviceStatus(id, status) {
    const d = devices.find((x) => x.id === id)
    if (!d) return
    const before = { status: d.status, last: d.last }
    d.status = status; d.last = now()
    logOp('设备状态', `${d.name} → ${status}`)
    const ok = await persistEntity('devices', d)
    if (!ok) Object.assign(d, before)
  }
  async function setUserOn(id, on) {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const before = u.on
    u.on = on
    logOp('用户状态', `${u.name} → ${on ? '启用' : '停用'}`)
    const ok = await persistEntity('users', u)
    if (!ok) u.on = before
  }
  async function setUserRole(id, role) {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const before = u.role
    u.role = role
    logOp('用户角色', `${u.name} → ${role}`)
    const ok = await persistEntity('users', u)
    if (!ok) u.role = before
  }
  // ===== 角色（RBAC）=====
  let rseq = 4
  async function addRole(row) {
    const id = 'R' + (++rseq)
    const item = { id, name: row.name, scope: row.scope || '本机构', users: 0, perms: row.perms || viewOnly() }
    roles.push(item)
    logOp('新增角色', row.name)
    const ok = await persistEntity('roles', item)
    if (!ok) { const i = roles.findIndex((r) => r.id === id); if (i > -1) roles.splice(i, 1) }
    return ok ? id : null
  }
  async function updateRole(id, row) {
    const r = roles.find((x) => x.id === id)
    if (!r) return false
    const before = { ...r }
    Object.assign(r, row)
    logOp('更新角色', row.name || r.name)
    const ok = await persistEntity('roles', r)
    if (!ok) Object.assign(r, before)
    return ok
  }
  async function removeRole(id) {
    const i = roles.findIndex((x) => x.id === id)
    if (i < 0) return false
    const item = roles[i]
    logOp('删除角色', item.name)
    roles.splice(i, 1)
    const ok = await persistEntity('roles', item, 'remove')
    if (!ok) roles.splice(i, 0, item)
    return ok
  }
  async function setContentStatus(id, status) {
    const c = contents.find((x) => x.id === id)
    if (!c) return
    const before = { status: c.status, publishAt: c.publishAt }
    c.status = status
    if (status === '已发布') c.publishAt = now().slice(0, 10)
    logOp('内容状态', `${c.title} → ${status}`)
    const ok = await persistEntity('contents', c)
    if (!ok) Object.assign(c, before)
  }
  async function setSourceStatus(id, status) {
    const s = sources.find((x) => x.id === id)
    if (!s) return
    const before = s.status
    s.status = status
    logOp('数据源状态', `${s.name} → ${status}`)
    const ok = await persistEntity('sources', s)
    if (!ok) s.status = before
  }
  async function syncSource(id) {
    const s = sources.find((x) => x.id === id)
    if (!s) return
    const before = { lastSync: s.lastSync, status: s.status }
    s.lastSync = now(); s.status = '正常'
    logOp('数据源同步', s.name)
    const ok = await persistEntity('sources', s)
    if (!ok) Object.assign(s, before)
  }
  function refreshMetrics() {
    metrics.forEach((m) => {
      if (m.unit === '%' || m.unit === 'ms') {
        const base = parseFloat(m.value)
        const delta = (Math.random() - 0.5) * base * 0.12
        m.value = String(Math.max(1, Math.round((base + delta) * 10) / 10))
      }
      m.status = '健康'
    })
    logOp('刷新监控指标', '')
  }

  // ===== 统计概览（驱动 Dashboard）=====
  const stats = computed(() => ({
    institutions: institutions.length,
    beds: institutions.reduce((s, i) => s + (+i.beds || 0), 0),
    elders: institutions.reduce((s, i) => s + (+i.elders || 0), 0),
    facilities: facilities.length,
    orders: orders.length,
    ordersDone: orders.filter((o) => o.status === '已完成').length,
    alerts: alerts.length,
    alertsActive: alerts.filter((a) => !['已解决', '已忽略'].includes(a.state)).length,
    devices: devices.length,
    devicesOnline: devices.filter((d) => d.status === '在线').length,
    users: users.length,
    contents: contents.length,
    elderly: elderly.length,
    elderlyActive: elderly.filter((e) => e.status === '在档').length
  }))

  // ===== 初始化：从后端 records 表拉取所有业务实体（失败则保留本地默认）=====
  const ENTITIES = [
    ['institutions', institutions], ['facilities', facilities], ['orders', orders],
    ['alerts', alerts], ['devices', devices], ['users', users], ['roles', roles],
    ['contents', contents], ['sources', sources], ['metrics', metrics], ['alertRules', alertRules],
    ['loginLogs', loginLogs], ['medical', medical], ['elderly', elderly]
  ]
  async function loadAll() {
    await Promise.all(ENTITIES.map(async ([entity, list]) => {
      try {
        const rows = await api.records.list(entity)
        if (Array.isArray(rows) && rows.length) {
          list.splice(0, list.length, ...rows)
        }
      } catch (e) {
        console.warn(`[data] 加载 ${entity} 失败，使用本地默认`, e)
      }
    }))
    // 通知配置（对象型，单独加载）
    try {
      const rows = await api.records.list('notifyConfig')
      if (Array.isArray(rows) && rows.length) {
        const cfg = rows[0]
        Object.assign(notifyConfig, cfg)
        delete notifyConfig.id
      }
    } catch (e) {
      console.warn('[data] 加载 notifyConfig 失败，使用本地默认', e)
    }
    // 安全策略（对象型，单独加载）
    try {
      const rows = await api.records.list('authConfig')
      if (Array.isArray(rows) && rows.length) {
        const cfg = rows[0]
        Object.assign(authConfig, cfg)
        delete authConfig.id
      }
    } catch (e) {
      console.warn('[data] 加载 authConfig 失败，使用本地默认', e)
    }
  }

  return {
    // state
    institutions, facilities, orders, alerts, devices, users, roles, contents, sources, metrics, logs, alertRules, medical, elderly, notifyConfig, currentUser, loginLogs, logLogin, authConfig, saveAuthConfig,
    // 初始化
    loadAll,
    // 机构
    addInstitution: instCrud.add, updateInstitution: instCrud.update, removeInstitution: instCrud.remove,
    // 社区
    addFacility: facCrud.add, updateFacility: facCrud.update, removeFacility: facCrud.remove,
    // 居家
    addOrder: ordCrud.add, updateOrder: ordCrud.update, removeOrder: ordCrud.remove,
    // 设备
    addDevice: devCrud.add, updateDevice: devCrud.update, removeDevice: devCrud.remove, setDeviceStatus,
    // 用户
    addUser: userCrud.add, updateUser: userCrud.update, removeUser: userCrud.remove, setUserOn, setUserRole,
    // 角色（RBAC）
    moduleList, addRole, updateRole, removeRole,
    // 内容
    addContent: contentCrud.add, updateContent: contentCrud.update, removeContent: contentCrud.remove, setContentStatus,
    // 数据源
    addSource: srcCrud.add, updateSource: srcCrud.update, removeSource: srcCrud.remove, setSourceStatus, syncSource,
    // 告警 / 监控
    handleAlert, refreshMetrics,
    // 告警规则
    addRule: ruleCrud.add, updateRule: ruleCrud.update, removeRule: ruleCrud.remove, setRuleOn,
    // 通知配置
    saveNotifyConfig,
    // 医疗机构
    addMedical: medCrud.add, updateMedical: medCrud.update, removeMedical: medCrud.remove,
    // 老人档案
    addElder: elderCrud.add, updateElder: elderCrud.update, removeElder: elderCrud.remove,
    // 统计
    stats
  }
})
