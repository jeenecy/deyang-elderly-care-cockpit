<template>
  <div class="wrap-col">
    <div class="a-card">
      <div class="a-card-title">大屏模块配置<span class="sub">实时联动驾驶舱大屏</span></div>
      <div class="mod-grid">
        <div class="mod" v-for="m in modList" :key="m.key" :class="{ off: !store.modules[m.key] }" @click="toggle(m.key)">
          <div class="mod-ico"><IconSvg :name="m.icon" /></div>
          <div class="mod-name">{{ m.name }}</div>
          <div class="switch" :class="{ on: store.modules[m.key] }"><i></i></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="a-card">
        <div class="a-card-title">地图与播报</div>
        <div class="cfg-row">
          <span>地图渲染模式</span>
          <div class="seg">
            <button :class="{ on: store.mapMode === '3d' }" @click="store.setMapMode('3d')">3D 立体</button>
            <button :class="{ on: store.mapMode === '2d' }" @click="store.setMapMode('2d')">2D 平面</button>
          </div>
        </div>
        <div class="cfg-row">
          <span>滚动播报条</span>
          <button class="switch" :class="{ on: store.ticker }" @click="store.ticker = !store.ticker"><i></i></button>
        </div>
        <div class="cfg-row">
          <span>主题配色</span>
          <select class="a-select" :value="store.theme" @change="store.setTheme($event.target.value)">
            <option value="dark">科技蓝（深色）</option>
            <option value="light">浅色</option>
          </select>
        </div>
        <p class="hint">提示：以上配置通过 Pinia 状态实时同步至驾驶舱大屏，返回大屏即可看到效果。</p>
      </div>

      <div class="a-card">
        <div class="a-card-title">地图点位管理<span class="sub">新增 / 删除实时联动大屏标注</span></div>
        <table class="a-table">
          <thead><tr><th>点位名称</th><th>类型</th><th>区县</th><th>经纬度</th><th style="width:80px">操作</th></tr></thead>
          <tbody>
            <tr v-for="p in store.points" :key="p.id">
              <td>{{ p.name }}</td>
              <td><span class="a-tag blue">{{ p.type }}</span></td>
              <td>{{ p.area }}</td>
              <td class="muted">{{ p.lng }}, {{ p.lat }}</td>
              <td><button class="op danger" @click="remove(p)">删除</button></td>
            </tr>
            <tr v-if="store.points.length === 0"><td colspan="5" class="empty">暂无自定义点位，点击「新增点位」创建</td></tr>
          </tbody>
        </table>
        <button class="a-btn" style="margin-top:12px" @click="openAdd"><IconSvg name="plus" /> 新增点位</button>
      </div>
    </div>

    <Modal :show="showForm" title="新增地图点位" width="500px" @update:show="showForm = $event">
      <div class="form">
        <label>点位名称</label>
        <input class="a-input" v-model="form.name" style="width:100%" placeholder="如：XX养老服务中心" />
        <label>类型</label>
        <select class="a-select" v-model="form.type" style="width:100%">
          <option>养老机构</option><option>社区中心</option><option>居家服务站</option>
        </select>
        <label>所属区县</label>
        <input class="a-input" v-model="form.area" style="width:100%" placeholder="如：旌阳区" />
        <label>经度</label>
        <input class="a-input" v-model="form.lng" style="width:100%" placeholder="如：104.4085" />
        <label>纬度</label>
        <input class="a-input" v-model="form.lat" style="width:100%" placeholder="如：31.1734" />
      </div>
      <template #footer>
        <button class="a-btn" @click="showForm = false">取消</button>
        <button class="a-btn primary" @click="save">添加</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useScreenStore } from '../../stores/screen.js'
import IconSvg from './IconSvg.vue'
import Modal from './Modal.vue'
import { useToast } from '../../composables/useToast.js'

const store = useScreenStore()
const toast = useToast()

const modList = [
  { key: 'gov', name: '政府监管', icon: 'shield' },
  { key: 'institution', name: '机构养老', icon: 'database' },
  { key: 'community', name: '社区养老', icon: 'grid' },
  { key: 'home', name: '居家养老', icon: 'cpu' }
]
function toggle(k) { store.setModule(k, !store.modules[k]) }

const showForm = ref(false)
const form = ref({ name: '', type: '养老机构', area: '', lng: '', lat: '' })
function openAdd() {
  form.value = { name: '', type: '养老机构', area: '', lng: '', lat: '' }
  showForm.value = true
}
function save() {
  const f = form.value
  if (!f.name) { toast.warn('请填写点位名称'); return }
  const lng = parseFloat(f.lng)
  const lat = parseFloat(f.lat)
  if (isNaN(lng) || isNaN(lat)) { toast.warn('请填写正确的经纬度'); return }
  store.addPoint({ name: f.name, type: f.type, area: f.area, lng, lat })
  toast.success('点位已添加，大屏已同步')
  showForm.value = false
}
function remove(p) {
  if (!confirm(`确认删除点位「${p.name}」？`)) return
  store.removePoint(p.id)
  toast.success('点位已删除')
}
</script>

<style scoped>
.wrap-col { display: flex; flex-direction: column; gap: 18px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.mod-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.mod { position: relative; padding: 18px; border-radius: 12px; background: rgba(0, 102, 255, .08);
  border: 1px solid var(--c-line); cursor: pointer; transition: all .2s; }
.mod:hover { transform: translateY(-2px); border-color: var(--c-line2); }
.mod.off { opacity: .45; }
.mod-ico { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center;
  color: var(--c-primary); background: rgba(0, 240, 255, .1); border: 1px solid var(--c-line2); margin-bottom: 12px; }
.mod-name { font-size: 15px; color: #fff; font-weight: 600; }
.switch { width: 44px; height: 24px; border-radius: 12px; background: rgba(138, 166, 200, .3); position: absolute; top: 18px; right: 18px; transition: all .2s; }
.switch i { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: all .2s; }
.switch.on { background: linear-gradient(90deg, #0066ff, #00f0ff); }
.switch.on i { left: 23px; }
.cfg-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(0, 240, 255, .08); font-size: 14px; }
.seg { display: flex; border: 1px solid var(--c-line); border-radius: 8px; overflow: hidden; }
.seg button { padding: 7px 16px; background: transparent; color: var(--c-muted); border: none; cursor: pointer; font-size: 13px; }
.seg button.on { background: rgba(0, 102, 255, .25); color: #fff; }
.hint { font-size: 12px; color: var(--c-muted); margin-top: 12px; line-height: 1.6; }
.form { display: flex; flex-direction: column; gap: 6px; }
.form label { font-size: 13px; color: var(--c-muted); margin-top: 10px; }
.form label:first-child { margin-top: 0; }
.op { background: transparent; border: 1px solid rgba(255, 77, 77, .3); color: var(--c-danger); font-size: 12px;
  padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all .2s; }
.op:hover { background: rgba(255, 77, 77, .12); }
.empty { text-align: center; color: var(--c-muted); padding: 18px 0; }
.a-btn svg { width: 15px; height: 15px; }
</style>
