<template>
  <teleport to="body">
    <div class="toast-host">
      <transition-group name="toast">
        <div v-for="t in toast.items" :key="t.id" class="toast" :class="t.type">
          <span class="ico">
            <svg viewBox="0 0 24 24" v-if="t.type === 'success'"><path d="M20 6L9 17l-5-5"/></svg>
            <svg viewBox="0 0 24 24" v-else-if="t.type === 'error'"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <svg viewBox="0 0 24 24" v-else-if="t.type === 'warn'"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            <svg viewBox="0 0 24 24" v-else><path d="M12 16v-5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </span>
          <span class="msg">{{ t.message }}</span>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useToast } from '../../composables/useToast.js'
const toast = useToast()
</script>

<style scoped>
.toast-host { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 2000;
  display: flex; flex-direction: column; gap: 10px; align-items: center; pointer-events: none; }
.toast { display: flex; align-items: center; gap: 10px; min-width: 240px; max-width: 420px;
  padding: 11px 16px; border-radius: 10px; font-size: 14px; color: #fff;
  background: rgba(13, 21, 48, 0.96); border: 1px solid var(--c-line2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px); }
.toast .ico { width: 18px; height: 18px; flex-shrink: 0; }
.toast .ico svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.toast.success { border-color: rgba(0, 255, 204, 0.5); } .toast.success .ico { color: #00ffcc; }
.toast.error { border-color: rgba(255, 77, 77, 0.5); } .toast.error .ico { color: #ff4d4d; }
.toast.warn { border-color: rgba(255, 170, 0, 0.5); } .toast.warn .ico { color: #ffaa00; }
.toast.info { border-color: var(--c-line2); } .toast.info .ico { color: var(--c-primary); }
.toast-enter-active, .toast-leave-active { transition: all .28s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-enter-from { opacity: 0; transform: translateY(-16px); }
.toast-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
