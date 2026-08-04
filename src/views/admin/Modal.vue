<template>
  <teleport to="body">
    <transition name="fade">
      <div class="modal-mask" v-if="show" @click.self="close">
        <div class="modal" :style="{ width }">
          <div class="modal-head">
            <div class="modal-title">{{ title }}</div>
            <button class="modal-close" @click="close" aria-label="关闭">✕</button>
          </div>
          <div class="modal-body"><slot /></div>
          <div class="modal-foot" v-if="$slots.footer"><slot name="footer" /></div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '480px' }
})
const emit = defineEmits(['update:show', 'close'])
function close() {
  emit('update:show', false)
  emit('close')
}
</script>

<style scoped>
.modal-mask { position: fixed; inset: 0; background: rgba(4, 8, 20, 0.62); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1500; }
.modal { background: var(--c-panel); border: 1px solid var(--c-line2); border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); max-width: 92vw; max-height: 86vh; display: flex; flex-direction: column; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--c-line); }
.modal-title { font-size: 16px; font-weight: 600; color: #fff; }
.modal-title::before { content: ''; display: inline-block; width: 4px; height: 15px; border-radius: 2px;
  background: linear-gradient(180deg, var(--c-primary), var(--c-secondary)); margin-right: 9px; vertical-align: -2px; }
.modal-close { background: transparent; border: none; color: var(--c-muted); font-size: 17px; cursor: pointer; transition: color .2s; }
.modal-close:hover { color: #fff; }
.modal-body { padding: 20px; overflow: auto; }
.modal-foot { padding: 14px 20px; border-top: 1px solid var(--c-line); display: flex; justify-content: flex-end; gap: 10px; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
