<template>
  <teleport to="body">
    <transition name="drawer-fade">
      <div class="drawer-mask" v-if="show" @click.self="close">
        <aside class="drawer" :style="color ? { '--dcolor': color } : null">
          <div class="drawer-head">
            <div>
              <div class="drawer-cat" v-if="category">{{ category }}</div>
              <div class="drawer-title">{{ title }}</div>
            </div>
            <button class="drawer-close" @click="close" aria-label="关闭">✕</button>
          </div>
          <div class="drawer-body">
            <div class="d-row" v-for="(f, i) in fields" :key="i">
              <span class="d-k">{{ f.label }}</span>
              <span class="d-v" :class="{ hot: f.hot }">{{ f.value }}</span>
            </div>
            <div class="d-desc" v-if="desc">{{ desc }}</div>
          </div>
          <div class="drawer-foot" v-if="$slots.footer">
            <slot name="footer" />
          </div>
        </aside>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  category: { type: String, default: '' },
  color: { type: String, default: '' },
  desc: { type: String, default: '' },
  fields: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:show', 'close'])
function close() {
  emit('update:show', false)
  emit('close')
}
</script>

<style scoped>
.drawer-mask {
  position: fixed; inset: 0; z-index: 1600;
  background: rgba(4, 8, 20, 0.5); backdrop-filter: blur(3px);
  display: flex; justify-content: flex-end;
}
.drawer {
  width: 420px; max-width: 92vw; height: 100%;
  background: var(--c-panel); border-left: 1px solid var(--c-line2);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
  display: flex; flex-direction: column;
  --dcolor: var(--c-primary);
}
.drawer-cat {
  display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 10px;
  font-size: 12px; font-weight: 600; color: var(--dcolor);
  background: color-mix(in srgb, var(--dcolor) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--dcolor) 40%, transparent);
  margin-bottom: 8px;
}
.drawer-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 22px 16px; border-bottom: 1px solid var(--c-line);
}
.drawer-title { font-size: 18px; font-weight: 700; color: #fff; text-shadow: 0 0 14px rgba(0, 240, 255, 0.25); }
.drawer-close {
  background: transparent; border: 1px solid var(--c-line); color: var(--c-muted);
  width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font-size: 15px; transition: all 0.2s;
}
.drawer-close:hover { color: #fff; border-color: var(--c-line2); background: rgba(255, 77, 77, 0.12); }
.drawer-body { flex: 1; overflow: auto; padding: 18px 22px; }
.d-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 13px 4px; border-bottom: 1px dashed rgba(0, 240, 255, 0.1);
}
.d-row:last-of-type { border-bottom: none; }
.d-k { font-size: 13px; color: var(--c-muted); flex-shrink: 0; }
.d-v { font-size: 14px; font-weight: 600; color: #eafdff; text-align: right; }
.d-v.hot { color: var(--dcolor); text-shadow: 0 0 10px color-mix(in srgb, var(--dcolor) 55%, transparent); }
.d-desc {
  margin-top: 16px; padding: 12px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.7;
  color: rgba(205, 230, 255, 0.9); background: rgba(0, 102, 255, 0.08); border: 1px solid var(--c-line);
}
.drawer-foot { padding: 14px 22px; border-top: 1px solid var(--c-line); display: flex; justify-content: flex-end; gap: 10px; }

.drawer-fade-enter-active, .drawer-fade-leave-active { transition: opacity 0.25s; }
.drawer-fade-enter-from, .drawer-fade-leave-to { opacity: 0; }
.drawer-fade-enter-active .drawer { animation: drawerIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1); }
.drawer-fade-leave-active .drawer { animation: drawerOut 0.25s ease; }
@keyframes drawerIn { from { transform: translateX(100%); } to { transform: none; } }
@keyframes drawerOut { from { transform: none; } to { transform: translateX(100%); } }
</style>
