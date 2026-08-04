// =============================================================
// G04 数据字典 · 受控词表中心化（单一来源）
// -------------------------------------------------------------
// 与《G04_数据字典.md》§4「受控词表」一一对应。
// 规则：新增任何业务枚举，先在本文件登记，再在组件中引用，
// 禁止在表单 / 筛选项里再硬编码字符串，确保前后端取值一致。
//
// 业务枚举统一 value === label（纯字符串数组）；
// UI 专用映射（value !== label）单独以 { value, label } 数组提供。
// =============================================================

/* ---------- 基础维度 ---------- */
export const DISTRICTS = ['旌阳区', '罗江区', '中江县', '广汉市', '什邡市', '绵竹市']

/* ---------- 养老机构 ---------- */
export const INSTITUTION_TYPES = ['公办养老', '民办非企', '社区嵌入式']
export const OPERATION_STATUS = ['运营中', '整改中', '筹建中']
export const CARE_LEVEL = ['混合', '自理偏多', '失能偏多']

/* ---------- 社区养老设施 ---------- */
export const FACILITY_TYPES = ['长者食堂', '日间照料', '助老服务', '文娱活动', '康复护理']
export const FACILITY_STATUS = ['运营中', '筹建中']

/* ---------- 居家养老工单 ---------- */
export const SERVICE_TYPES = ['助餐', '助洁', '助浴', '护理', '陪伴']
export const ORDER_STATUS = ['已完成', '进行中', '待派单', '已取消']

/* ---------- 用户 / 角色（RBAC） ---------- */
export const ROLE_NAMES = ['超级管理员', '市监管账号', '区县账号', '机构管理员']
export const DATA_SCOPE = ['全市', '本区县', '本机构']

/* ---------- 内容运营 ---------- */
export const CONTENT_CATEGORIES = ['科普文章', '政策解读', '通知公告', '宣教视频', '活动招募']
export const CONTENT_STATUS = ['已发布', '草稿', '已下线']

/* ---------- 数据源 ---------- */
export const SOURCE_TYPES = ['省级接口', '市级接口', '本地数据库', '设备接入', '呼叫中心']
export const SYNC_STATUS = ['正常', '警告']
export const SYNC_INTERVAL = ['实时', '每5分钟', '每15分钟', '每30分钟', '每小时']

/* ---------- 物联设备 ---------- */
export const DEVICE_TYPES = ['烟感探测器', 'SOS呼叫', '红外感应', '健康检测', '燃气报警', '睡眠监测']
export const DEVICE_STATUS = ['在线', '离线', '故障']

/* ---------- 老人档案（G03） ---------- */
export const GENDER = ['男', '女']
export const LIVING_TYPES = ['独居', '空巢', '与子女同住', '机构养老', '社区养老']
export const ELDER_CARE_LEVEL = ['自理', '半失能', '失能', '特护']
export const ELDER_STATUS = ['在档', '离档', '转院']
export const EMERGENCY_RELATIONS = ['配偶', '子女', '父母', '亲属', '邻居', '社区网格员', '其他']
export const HEALTH_TAGS = ['高血压', '糖尿病', '冠心病', '脑卒中后遗症', '认知障碍', '骨质疏松', '褥疮风险', '视听障碍']

/* ---------- 告警 / 监控规则 ---------- */
export const ALERT_LEVELS = ['紧急', '严重', '一般', '提示']
export const ALERT_TYPES = ['安全事件', '健康预警', '设备异常', '服务异常']
export const ALERT_SOURCES = ['物联设备', '系统监测', '人工上报', '第三方接口']
export const ALERT_STATES = ['待处理', '处理中', '已解决', '已忽略']
export const COMPARE_OPS = ['>', '<']
export const METRIC_UNITS = ['%', 'ms', '次', '个']
export const METRIC_TREND = ['平稳', '上升', '下降']
// 告警规则通知渠道（与监控页规则表单保持一致；覆盖 G04 词典 + 企业微信）
export const NOTIFY_CHANNELS = ['站内', '短信+站内', '电话+短信', '企业微信']
// 规则表单「多通道勾选」的拆项（保存时以 + 连接）
export const RULE_CHANNEL_PARTS = ['站内信', '邮件', '短信']

/* =============================================================
 * UI 专用映射（value !== label）
 * ============================================================= */
export const LOGIN_RESULTS = [
  { value: 'success', label: '成功' },
  { value: 'fail', label: '失败' },
  { value: 'locked', label: '锁定' }
]
export const RECIPIENTS = [
  { value: 'all_admins', label: '全部管理员' },
  { value: 'city', label: '市级监管' },
  { value: 'district', label: '区县账号' }
]
export const NOTIFY_CHAN_META = [
  { value: 'site', label: '站内信', icon: 'bell' },
  { value: 'email', label: '邮件', icon: 'mail' },
  { value: 'sms', label: '短信', icon: 'msg' }
]
export const THEME_OPTIONS = [
  { value: 'dark', label: '科技蓝（深色）' },
  { value: 'light', label: '浅色' }
]
export const MAP_MARKERS = [
  { value: '养老机构', label: '养老机构' },
  { value: '社区中心', label: '社区中心' },
  { value: '居家服务站', label: '居家服务站' }
]

/* ---------- 辅助函数 ---------- */
// 把字符串数组或 {value,label}[] 统一成 {value,label}[]，便于 <option> 渲染
export function asOptions(list) {
  return (list || []).map((x) => (typeof x === 'string' ? { value: x, label: x } : x))
}
// 由 value 取 label（兼容字符串数组与 {value,label}）
export function labelOf(list, value) {
  const it = (list || []).find((x) => (typeof x === 'string' ? x === value : x.value === value))
  return it ? (typeof it === 'string' ? it : it.label) : value
}
// 由 label 取 value（兼容字符串数组与 {value,label}）
export function valueOf(list, label) {
  const it = (list || []).find((x) => (typeof x === 'string' ? x === label : x.label === label))
  return it ? (typeof it === 'string' ? it : it.value) : label
}
