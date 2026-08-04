// 前端 API 客户端 —— 统一访问后端 /api（开发环境由 vite 代理到 :3001）
const BASE = '/api'

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${text}`)
  }
  return res.json()
}

export const api = {
  health: () => req('GET', '/health'),

  // 大屏配置（单条）
  config: {
    get: () => req('GET', '/config'),
    put: (c) => req('PUT', '/config', c)
  },

  // 区县统计
  districts: {
    list: () => req('GET', '/districts'),
    create: (d) => req('POST', '/districts', d),
    update: (id, d) => req('PUT', `/districts/${id}`, d),
    remove: (id) => req('DELETE', `/districts/${id}`)
  },

  // 地图自定义点位
  points: {
    list: () => req('GET', '/points'),
    create: (p) => req('POST', '/points', p),
    remove: (id) => req('DELETE', `/points/${id}`)
  },

  // 通用业务实体（records 表：告警/机构/社区/工单/设备/用户/角色/内容/数据源/指标/规则…）
  records: {
    list: (entity) => req('GET', `/records/${entity}`),
    save: (entity, item) => req('POST', `/records/${entity}`, item),
    replace: (entity, list) => req('PUT', `/records/${entity}`, list),
    remove: (entity, id) => req('DELETE', `/records/${entity}/${id}`)
  }
}

export default api
