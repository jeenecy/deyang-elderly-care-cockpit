import { reactive } from 'vue'

// 全局 Toast 通知：模块级 reactive 队列，任意组件调用 useToast() 共享同一队列
const state = reactive({ items: [] })
let tid = 0

export function useToast() {
  function push(message, type = 'info', duration = 2600) {
    const id = ++tid
    state.items.push({ id, message, type })
    setTimeout(() => {
      const idx = state.items.findIndex((i) => i.id === id)
      if (idx > -1) state.items.splice(idx, 1)
    }, duration)
  }
  return {
    items: state.items,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
    warn: (m) => push(m, 'warn')
  }
}
