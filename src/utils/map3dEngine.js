// Canvas 2.5D 立体挤出地图引擎（零依赖）
// 从 GeoJSON 提取多边形 → 世界坐标 → 可旋转斜投影 → 挤出绘制
// 解决 echarts-gl geo3D「全区统一高度 + 灰糊阴影」的观感天花板。
//
// 能力：数据驱动起伏、霓虹玻璃顶面、发光边、侧墙渐变、地面扫描环、
//      光柱标记、漂浮标签、拖拽旋转 / 滚轮缩放 / 自动缓转、
//      悬停高亮、点击选区（回调 onSelect / onHover）。

function hsl(h, s, l, a) {
  return a == null ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`
}
function decimate(ring, minDist) {
  if (ring.length <= 2) return ring.slice()
  const out = [ring[0]]
  let last = ring[0]
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i]
    const dx = p[0] - last[0]
    const dy = p[1] - last[1]
    if (dx * dx + dy * dy >= minDist * minDist) {
      out.push(p)
      last = p
    }
  }
  // 闭合回起点（若末端与首端距离较大则补一段，保证环闭合）
  const f = out[0]
  const e = out[out.length - 1]
  if ((e[0] - f[0]) ** 2 + (e[1] - f[1]) ** 2 > minDist * minDist) out.push(f)
  return out
}
function pointInPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export class Map3DEngine {
  constructor(container, opts = {}) {
    this.container = container
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'map3d-canvas'
    container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    this.onSelect = opts.onSelect || (() => {})
    this.onHover = opts.onHover || (() => {})
    this.onDistrict = opts.onDistrict || null

    // 相机状态
    this.az = opts.az ?? -0.42          // 方位角（绕竖直轴）
    this.pitch = opts.pitch ?? 1.02     // 俯仰（约 58°）
    this.zoom = 1
    this.cx = 0
    this.cy = 0
    this.scale = 1
    this.autoRotate = true

    // 数据
    this.districts = []
    this.markers = []
    this.scan = 0          // 扫描环相位
    this.t = 0             // 时间
    this.hover = null      // {type, name}
    this._distScreen = {}  // 当前帧各区县屏幕多边形（用于命中）
    this._markScreen = []  // 当前帧标记屏幕位置

    // 交互
    this._drag = false
    this._down = null
    this._moved = 0
    this._last = null
    this._raf = null
    this._bind()
    this.resize()
  }

  // ===== 数据装载 =====
  setGeo(geo, districtStats, regionCenter) {
    const features = (geo && geo.features) || []
    // 计算世界包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const raw = []
    features.forEach(f => {
      const name = f.properties && f.properties.name
      const geom = f.geometry
      if (!geom) return
      const polys = []
      const pushPoly = (rings) => polys.push({ outer: rings[0], holes: rings.slice(1) })
      if (geom.type === 'Polygon') pushPoly(geom.coordinates)
      else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(pushPoly)
      const stats = districtStats[name] || { elderly: 1, beds: 0 }
      raw.push({ name, polys, stats })
      polys.forEach(p => {
        p.outer.forEach(c => {
          if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]
          if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]
        })
      })
    })
    const lngC = (minX + maxX) / 2
    const latC = (minY + maxY) / 2
    const k = Math.cos((latC * Math.PI) / 180)
    this._lngC = lngC
    this._latC = latC
    this._k = k
    const S = 100 // 世界单位缩放
    const toWorld = ([lng, lat]) => [(lng - lngC) * k * S, (lat - latC) * S]
    this.worldW = (maxX - minX) * k * S
    this.worldH = (maxY - minY) * S
    const minDist = Math.max(this.worldW, this.worldH) * 0.011

    const maxE = Math.max(...raw.map(d => d.stats.elderly || 1))
    this.districts = raw.map(d => {
      const polys = d.polys.map(p => ({
        outer: decimate(p.outer.map(toWorld), minDist),
        holes: p.holes.map(h => decimate(h.map(toWorld), minDist))
      }))
      const c = (regionCenter && regionCenter[d.name]) || null
      const centroid = c ? toWorld(c) : avg(d.polys[0].outer)
      const ratio = (d.stats.elderly || 1) / maxE
      const height = 4 + ratio * 20        // 数据驱动起伏：4 ~ 24
      const light = 42 + ratio * 16         // 42% ~ 58%
      return { name: d.name, stats: d.stats, polys, centroid, height, light }
    })
  }

  setData({ tab, showAll, markers }) {
    // markers: [{ name, lng, lat, color, cat, detail }]
    this.markers = (markers || []).map(m => ({ ...m }))
    this.tab = tab
    this.showAll = showAll
  }

  // 下钻聚焦：非选中区县整体压暗（Canvas 2.5D 无独立材质，用 globalAlpha 实现）。name 为空 = 返回市级全景。
  setFocus(name) {
    this.focusName = name || null
  }

  // ===== 投影 =====
  _project(X, Y, Z) {
    const ca = Math.cos(this.az), sa = Math.sin(this.az)
    const Xr = X * ca - Y * sa
    const Yr = X * sa + Y * ca
    const cp = Math.cos(this.pitch)
    const sp = Math.sin(this.pitch)
    const sx = this.cx + Xr * this.scale
    const sy = this.cy - Yr * cp * this.scale - Z * sp * this.scale
    return { sx, sy, depth: Yr }
  }

  // ===== 渲染 =====
  _render() {
    const ctx = this.ctx
    const W = this.cssW, H = this.cssH
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    this.t += 0.016
    if (this.autoRotate && !this._drag && !this.hover) this.az += 0.0016
    this.scan = (this.scan + 0.006) % 1

    // 1) 地面扫描环 + 光晕
    this._drawGround(ctx, W, H)

    // 2) 组合深度排序：区县 + 标记
    const entries = []
    this.districts.forEach(d => {
      const p = this._project(d.centroid[0], d.centroid[1], d.height)
      entries.push({ type: 'dist', depth: p.depth, ref: d })
    })
    this.markers.forEach(m => {
      const p = this._project((m.lng - this._lngC) * this._k * 100, (m.lat - this._latC) * 100, 0)
      entries.push({ type: 'mark', depth: p.depth, ref: m })
    })
    entries.sort((a, b) => b.depth - a.depth)

    // 每帧重建命中信息
    this._distScreen = {}
    this._markScreen = []

    entries.forEach(e => {
      if (e.type === 'dist') this._drawDistrict(ctx, e.ref)
      else this._drawMarker(ctx, e.ref)
    })
  }

  _drawGround(ctx, W, H) {
    // 中心光晕
    const c = this._project(0, 0, 0)
    const maxR = Math.max(this.worldW, this.worldH) * this.scale * 0.62
    const g = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, maxR)
    g.addColorStop(0, 'rgba(0, 200, 255, 0.10)')
    g.addColorStop(0.5, 'rgba(0, 140, 255, 0.05)')
    g.addColorStop(1, 'rgba(0, 80, 200, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(c.sx, c.sy, maxR, maxR * Math.cos(this.pitch), 0, 0, Math.PI * 2)
    ctx.fill()

    // 同心扫描环（青白）
    const rings = 3
    for (let i = 0; i < rings; i++) {
      const ph = (this.scan + i / rings) % 1
      const r = ph * maxR
      const a = (1 - ph) * 0.5
      ctx.beginPath()
      ctx.ellipse(c.sx, c.sy, r, r * Math.cos(this.pitch), 0, 0, Math.PI * 2)
      ctx.strokeStyle = hsl(184, 100, 78, a)
      ctx.lineWidth = 1.4
      ctx.shadowColor = 'rgba(0, 220, 255, 0.6)'
      ctx.shadowBlur = 8
      ctx.stroke()
    }
    ctx.shadowBlur = 0
  }

  _drawDistrict(ctx, d) {
    const isHover = this.hover && this.hover.type === 'dist' && this.hover.name === d.name
    const dim = (this.focusName && d.name !== this.focusName) ? 0.38 : 1
    ctx.globalAlpha = dim
    const proj = (pts, Z) => pts.map(p => this._project(p[0], p[1], Z))
    const h = d.height

    // 地面阴影
    const c0 = this._project(d.centroid[0], d.centroid[1], 0)
    ctx.beginPath()
    ctx.ellipse(c0.sx, c0.sy, this.worldH * this.scale * 0.28, this.worldH * this.scale * 0.28 * Math.cos(this.pitch), 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 120, 160, 0.10)'
    ctx.fill()

    d.polys.forEach(poly => {
      const top = proj(poly.outer, h)
      const bot = proj(poly.outer, 0)
      // 侧墙：按中点深度排序（远→近）后绘制
      const edges = []
      for (let i = 0; i < bot.length; i++) {
        const j = (i + 1) % bot.length
        const mx = (bot[i].depth + bot[j].depth) / 2
        edges.push([i, j, mx])
      }
      edges.sort((a, b) => b[2] - a[2])
      const wallL = Math.max(14, d.light - 20)
      for (const [i, j] of edges) {
        ctx.beginPath()
        ctx.moveTo(bot[i].sx, bot[i].sy)
        ctx.lineTo(bot[j].sx, bot[j].sy)
        ctx.lineTo(top[j].sx, top[j].sy)
        ctx.lineTo(top[i].sx, top[i].sy)
        ctx.closePath()
        ctx.fillStyle = hsl(180, 60, wallL, isHover ? 0.95 : 0.92)
        ctx.fill()
      }
      // 顶面（含孔洞，evenodd 填充）
      ctx.beginPath()
      poly.outer.forEach((_, i) => {
        const p = top[i]
        if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy)
      })
      ctx.closePath()
      poly.holes.forEach(hole => {
        const hp = proj(hole, h)
        hp.forEach((p, i) => { if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy) })
        ctx.closePath()
      })
      const grad = ctx.createLinearGradient(0, Math.min(...top.map(p => p.sy)), 0, Math.max(...top.map(p => p.sy)))
      grad.addColorStop(0, hsl(178, 75, Math.min(72, d.light + 18), isHover ? 0.82 : 0.66))
      grad.addColorStop(1, hsl(184, 70, d.light, isHover ? 0.74 : 0.58))
      ctx.fillStyle = grad
      ctx.fill('evenodd')

      // 顶面发光边
      ctx.beginPath()
      poly.outer.forEach((_, i) => {
        const p = top[i]
        if (i === 0) ctx.moveTo(p.sx, p.sy); else ctx.lineTo(p.sx, p.sy)
      })
      ctx.closePath()
      ctx.strokeStyle = isHover ? 'rgba(255,255,255,0.95)' : hsl(186, 100, 82, 0.9)
      ctx.lineWidth = isHover ? 2.4 : 1.5
      ctx.shadowColor = 'rgba(0, 230, 255, 0.85)'
      ctx.shadowBlur = isHover ? 18 : 10
      ctx.stroke()
      ctx.shadowBlur = 0

      // 记录命中多边形（屏幕坐标）
      if (!this._distScreen[d.name]) this._distScreen[d.name] = top.map(p => [p.sx, p.sy])
    })

    // 漂浮标签
    const lp = this._project(d.centroid[0], d.centroid[1], h + 8)
    const label = `${d.name}  ${d.stats.elderly}万`
    ctx.font = '600 13px "Microsoft YaHei", sans-serif'
    const tw = ctx.measureText(label).width
    const padX = 9, padY = 5
    const bx = lp.sx - tw / 2 - padX
    const by = lp.sy - 22
    ctx.beginPath()
    roundRect(ctx, bx, by, tw + padX * 2, 20 + padY, 6)
    ctx.fillStyle = 'rgba(2, 14, 30, 0.72)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.55)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#eaffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, bx + padX, by + (20 + padY) / 2)
    ctx.globalAlpha = 1
  }

  _drawMarker(ctx, m) {
    const X = (m.lng - this._lngC) * this._k * 100
    const Y = (m.lat - this._latC) * 100
    const hMap = { gov: 30, org: 28, com: 26, home: 24, alarm: 36, custom: 30 }
    const H = hMap[m.cat] || 30
    const base = this._project(X, Y, 0)
    const top = this._project(X, Y, H)
    const isHover = this.hover && this.hover.type === 'mark' && this.hover.name === m.name
    const col = m.color || '#00f0ff'

    // 光柱（从地面到顶部，渐变）
    const grad = ctx.createLinearGradient(base.sx, base.sy, top.sx, top.sy)
    grad.addColorStop(0, hexA(col, 0.05))
    grad.addColorStop(0.5, hexA(col, 0.35))
    grad.addColorStop(1, hexA(col, 0.9))
    ctx.strokeStyle = grad
    ctx.lineWidth = isHover ? 4 : 2.4
    ctx.shadowColor = col
    ctx.shadowBlur = isHover ? 22 : 12
    ctx.beginPath()
    ctx.moveTo(base.sx, base.sy)
    ctx.lineTo(top.sx, top.sy)
    ctx.stroke()

    // 顶部光点（脉冲）
    const pulse = 1 + Math.sin(this.t * 3 + (m.lng + m.lat) * 10) * 0.25
    const r = (isHover ? 6.5 : 5) * pulse
    ctx.beginPath()
    ctx.arc(top.sx, top.sy, r, 0, Math.PI * 2)
    ctx.fillStyle = col
    ctx.shadowColor = col
    ctx.shadowBlur = isHover ? 26 : 16
    ctx.fill()
    ctx.beginPath()
    ctx.arc(top.sx, top.sy, r * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.shadowBlur = 0

    // 地面小光圈
    ctx.beginPath()
    ctx.ellipse(base.sx, base.sy, 7, 7 * Math.cos(this.pitch), 0, 0, Math.PI * 2)
    ctx.strokeStyle = hexA(col, 0.5)
    ctx.lineWidth = 1.2
    ctx.stroke()

    // 悬停标签
    if (isHover) {
      const txt = m.name
      ctx.font = '600 12px "Microsoft YaHei", sans-serif'
      const tw = ctx.measureText(txt).width
      const bx = top.sx - tw / 2 - 7
      const by = top.sy - 30
      ctx.beginPath()
      roundRect(ctx, bx, by, tw + 14, 20, 5)
      ctx.fillStyle = 'rgba(2, 14, 30, 0.8)'
      ctx.fill()
      ctx.strokeStyle = hexA(col, 0.7)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#eaffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(txt, bx + 7, by + 10)
    }

    this._markScreen.push({ x: top.sx, y: top.sy, r: 12, name: m.name, detail: m.detail, color: col })
  }

  // ===== 交互 =====
  _bind() {
    const cv = this.canvas
    cv.addEventListener('mousedown', e => {
      this._drag = true; this._down = [e.offsetX, e.offsetY]; this._moved = 0; this._last = [e.offsetX, e.offsetY]
    })
    window.addEventListener('mouseup', e => {
      if (this._drag && this._moved < 5 && this._down) this._click(this._down[0], this._down[1])
      this._drag = false
    })
    cv.addEventListener('mousemove', e => {
      const x = e.offsetX, y = e.offsetY
      if (this._drag && this._last) {
        const dx = x - this._last[0], dy = y - this._last[1]
        this._moved += Math.abs(dx) + Math.abs(dy)
        this.az -= dx * 0.006
        this.pitch = Math.max(0.55, Math.min(1.35, this.pitch - dy * 0.005))
        this._last = [x, y]
      } else {
        this._hoverTest(x, y)
      }
    })
    cv.addEventListener('mouseleave', () => { this.hover = null; this.onHover(null); this.canvas.style.cursor = 'default' })
    cv.addEventListener('wheel', e => {
      e.preventDefault()
      this.zoom = Math.max(0.5, Math.min(2.4, this.zoom * (e.deltaY > 0 ? 0.92 : 1.08)))
    }, { passive: false })
  }

  _hoverTest(x, y) {
    // 优先标记
    let hitMark = null
    for (const m of this._markScreen) {
      const dx = x - m.x, dy = y - m.y
      if (dx * dx + dy * dy <= m.r * m.r) { hitMark = m; break }
    }
    if (hitMark) {
      this.hover = { type: 'mark', name: hitMark.name }
      this.canvas.style.cursor = 'pointer'
      this.onHover({ text: hitMark.name, x, y, color: hitMark.color })
      return
    }
    // 区县（屏幕多边形命中）
    let hitDist = null
    for (const name in this._distScreen) {
      if (pointInPoly(x, y, this._distScreen[name])) { hitDist = name; break }
    }
    if (hitDist) {
      this.hover = { type: 'dist', name: hitDist }
      this.canvas.style.cursor = 'pointer'
      const d = this.districts.find(z => z.name === hitDist)
      this.onHover({ text: `${d.name} · 老年人口 ${d.stats.elderly}万`, x, y, color: '#00f0ff' })
    } else {
      this.hover = null
      this.canvas.style.cursor = 'grab'
      this.onHover(null)
    }
  }

  _click(x, y) {
    for (const m of this._markScreen) {
      const dx = x - m.x, dy = y - m.y
      if (dx * dx + dy * dy <= m.r * m.r) { this.onSelect(m.detail); return }
    }
    for (const name in this._distScreen) {
      if (pointInPoly(x, y, this._distScreen[name])) {
        // 下钻：优先回调 onDistrict（由 BigScreen 接管「区县轮廓板块」与返回市级）
        if (this.onDistrict) { this.onDistrict(name); return }
        const d = this.districts.find(z => z.name === name)
        const per = Math.round((d.stats.beds / d.stats.elderly) * 1000)
        this.onSelect({
          categoryLabel: '区县概览', color: '#00f0ff', name,
          rows: [
            { label: '老年人口', value: d.stats.elderly + ' 万', hot: true },
            { label: '养老床位', value: d.stats.beds + ' 万张' },
            { label: '千名老人床位', value: per + ' 张' },
            { label: '所属层级', value: '区县级养老单元' }
          ],
          desc: `${name}已构建「机构+社区+居家」三级养老服务体系，覆盖城乡老年群体基本养老与医养结合需求。`
        })
        return
      }
    }
  }

  // ===== 生命周期 =====
  resize() {
    const w = this.container.clientWidth || 800
    const h = this.container.clientHeight || 600
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cssW = w
    this.cssH = h
    this.canvas.width = this.cssW * this.dpr
    this.canvas.height = this.cssH * this.dpr
    this.canvas.style.width = this.cssW + 'px'
    this.canvas.style.height = this.cssH + 'px'
    this.cx = this.cssW / 2
    this.cy = this.cssH * 0.56
    const fit = Math.min(this.cssW * 0.9 / (this.worldW || 1), this.cssH * 0.6 / (this.worldH || 1))
    this.scale = fit * this.zoom
  }

  start() {
    if (this._raf) return
    this.resize()
    this._loop = () => { this._render(); this._raf = requestAnimationFrame(this._loop) }
    this._raf = requestAnimationFrame(this._loop)
  }
  stop() {
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  }
  dispose() {
    this.stop()
    this.canvas.remove()
  }
}

function avg(ring) {
  let x = 0, y = 0
  ring.forEach(p => { x += p[0]; y += p[1] })
  return [x / ring.length, y / ring.length]
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
}
function hexA(hex, a) {
  const h = String(hex).replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
