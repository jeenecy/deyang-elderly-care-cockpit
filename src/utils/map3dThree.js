// 德阳智慧养老 · 真 WebGL 3D 地图引擎（Three.js r160，UMD 全局 THREE）
//
// 相比 echarts-gl geo3D / Canvas 2.5D 的提升：
//   - 真几何挤出（ExtrudeGeometry），每个区县按老年人口驱动高度
//   - PBR 顶面（clearcoat 玻璃感）+ 侧墙自定义渐变 shader（底暗顶亮 + 顶部热边）
//   - 真实平行光阴影（PCFSoft）投到地面，深度线索到位
//   - 自研两段式 Bloom 后期（亮度提取 → 双向高斯 → 加性合成 + sRGB 编码）
//   - 地面扫描环 / 极坐标网格 / 光柱标记 / 精灵标签
//   - 轨道控制（拖拽旋转、滚轮缩放、空闲自动缓转）+ Raycaster 悬停高亮与点击
//
// API 与旧引擎保持一致，BigScreen 侧零改动即可替换：
//   new Map3DEngine(container, { onSelect, onHover })
//   .setGeo(geo, districtStats, regionCenter) / .setData({tab, showAll, markers})
//   .start() / .stop() / .resize() / .dispose() / ._raf

const T = () => window.THREE

/* ---------------------------------- 工具 ---------------------------------- */

function decimate(ring, minDist) {
  if (ring.length <= 2) return ring.slice()
  const out = [ring[0]]
  let last = ring[0]
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i]
    const dx = p[0] - last[0]
    const dy = p[1] - last[1]
    if (dx * dx + dy * dy >= minDist * minDist) { out.push(p); last = p }
  }
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

function avgRing(ring) {
  let x = 0, y = 0
  ring.forEach(p => { x += p[0]; y += p[1] })
  return [x / ring.length, y / ring.length]
}

// 程序化地形着色 GLSL 库（无缝、无平铺接缝，直接按世界坐标求值）
// 提供：value noise / fbm → 等高线、测绘网格、点阵、高程明暗
const TERRAIN_GLSL = `
float thash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float tnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(thash(i), thash(i + vec2(1.0, 0.0)), u.x),
             mix(thash(i + vec2(0.0, 1.0)), thash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float tfbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * tnoise(p); p = p * 2.03 + 17.3; a *= 0.5; }
  return v;
}
// 抗锯齿线条：给定标量场 x 与周期 T，取等值线
float isoLine(float x, float period, float width) {
  float f = x / period;
  float d = abs(fract(f) - 0.5) * 2.0;
  float w = fwidth(f) * 2.4 + width;
  return 1.0 - smoothstep(0.0, w, d);
}
float gridLine(vec2 p, float period, float width) {
  vec2 f = p / period;
  vec2 d = abs(fract(f) - 0.5) * 2.0;
  vec2 w = fwidth(f) * 2.4 + width;
  return 1.0 - smoothstep(0.0, max(w.x, w.y), min(d.x, d.y));
}
`

// ===== 科技绿主题色板（单一数据源，便于换肤与维护）=====
const PALETTE = {
  bg:            null,       // 透明背景（scene.background=null），canvas 露大屏底，翠绿轮廓/纹理更跳
  fog:           0x05111f,   // 中性深蓝黑雾（接近大屏底 #030816），保留空间纵深但不泛绿
  ground:        0x05121c,   // 保留色（地面已设为完全透明 alpha=0，此值仅作兜底，不渲染）
  hemiSky:       0x6affb0,  // 半球天光（绿）
  hemiGround:    0x04130a,
  key:           0xeafff4,  // 主光（暖白偏绿）
  rimC:          0x1aff9c,  // 冷绿轮廓光
  rimW:          0x9dff5c,  // 暖绿补光
  core:          0x00ff9c,  // 中心氛围点光
  terrainDeep:   0x0a4d35,  // 低洼深绿
  terrainHi:     0x16c98a,  // 高地翠绿
  terrainLine:   0x5cffb0,  // 测绘/等高线亮绿
  wallTop:       0x1fae7a,  // 建筑（侧壁）顶部
  wallBot:       0x06321f,  // 建筑底部
  scan:          0x2bff8c,  // 地面扫描主绿
  scan2:         0x1aff9c,
  road:          0xb6ff3c,  // 路网亮黄绿（区别于地形翠绿）
  label:         0x9dffc4,  // 区县标签描边绿
  markerFallback: '#00ffae'
}

// 环境反射（等距柱状渐变 → PMREM 预滤波），让金属/清漆表面不发死黑
function envTexture() {
  const w = 256, h = 128
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')
  const gr = g.createLinearGradient(0, 0, 0, h)
  gr.addColorStop(0.00, '#5fffb0')   // 天顶（绿调，压暗避免清漆面泛白）
  gr.addColorStop(0.35, '#1c6b4a')
  gr.addColorStop(0.52, '#0a3324')   // 地平线
  gr.addColorStop(1.00, '#03101c')   // 地面（去绿，中性深蓝黑，避免反射泛绿）
  g.fillStyle = gr
  g.fillRect(0, 0, w, h)
  // 侧向暖色光源，避免通体单一冷调（弱化，只做色彩层次不做提亮）
  const wg = g.createRadialGradient(w * 0.78, h * 0.36, 0, w * 0.78, h * 0.36, w * 0.24)
  wg.addColorStop(0, 'rgba(150, 255, 190, 0.28)')
  wg.addColorStop(1, 'rgba(150, 255, 190, 0)')
  g.fillStyle = wg
  g.fillRect(0, 0, w, h)
  const tex = new (T().CanvasTexture)(c)
  tex.mapping = T().EquirectangularReflectionMapping
  tex.colorSpace = T().SRGBColorSpace
  return tex
}

// 径向辉光精灵贴图
function glowTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gr.addColorStop(0.6, 'rgba(255,255,255,0.14)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, s, s)
  const tex = new (T().CanvasTexture)(c)
  tex.colorSpace = T().SRGBColorSpace
  return tex
}

// 文字标签精灵贴图
function labelTexture(text, color, sub) {
  const pad = 16
  const fs = 40
  const subFs = 26
  const m = document.createElement('canvas').getContext('2d')
  m.font = `600 ${fs}px "Microsoft YaHei", sans-serif`
  const w1 = m.measureText(text).width
  m.font = `400 ${subFs}px "Microsoft YaHei", sans-serif`
  const w2 = sub ? m.measureText(sub).width : 0
  const W = Math.ceil(Math.max(w1, w2) + pad * 2)
  const H = sub ? fs + subFs + pad * 2 + 6 : fs + pad * 2

  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')
  // 玻璃底板
  const rr = 10
  g.beginPath()
  g.moveTo(rr, 0); g.arcTo(W, 0, W, H, rr); g.arcTo(W, H, 0, H, rr)
  g.arcTo(0, H, 0, 0, rr); g.arcTo(0, 0, W, 0, rr); g.closePath()
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, 'rgba(6, 26, 44, 0.88)')
  bg.addColorStop(1, 'rgba(3, 14, 28, 0.78)')
  g.fillStyle = bg; g.fill()
  g.strokeStyle = color; g.globalAlpha = 0.75; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1

  g.textAlign = 'center'
  g.textBaseline = 'top'
  g.shadowColor = color
  g.shadowBlur = 14
  g.fillStyle = '#ffffff'
  g.font = `600 ${fs}px "Microsoft YaHei", sans-serif`
  g.fillText(text, W / 2, pad - 4)
  if (sub) {
    g.shadowBlur = 0
    g.fillStyle = color
    g.font = `400 ${subFs}px "Microsoft YaHei", sans-serif`
    g.fillText(sub, W / 2, pad + fs + 2)
  }
  const tex = new (T().CanvasTexture)(c)
  tex.colorSpace = T().SRGBColorSpace
  return { tex, W, H }
}

/* --------------------------------- 引擎主体 -------------------------------- */

export class Map3DEngine {
  constructor(container, opts = {}) {
    if (!window.THREE) throw new Error('Three.js 未加载')
    const TH = T()

    this.container = container
    this.onSelect = opts.onSelect || (() => {})
    this.onHover = opts.onHover || (() => {})
    this.onDistrict = opts.onDistrict || null

    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cssW = container.clientWidth || 800
    this.cssH = container.clientHeight || 600

    // --- renderer ---
    this.renderer = new TH.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.cssW, this.cssH, false)
    this.renderer.outputColorSpace = TH.SRGBColorSpace
    this.renderer.toneMapping = TH.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.20   // 过曝修复数值寻优结果：非过曝版 1.18 返祖；配合选择性 Bloom 阈值 0.29 与淡雾 0x030d1a/0.0026，顶面纹理清晰不糊白
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = TH.PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)
    this.canvas = this.renderer.domElement
    this.canvas.className = 'map3d-canvas'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'
    container.appendChild(this.canvas)

    // --- scene / camera ---
    this.scene = new TH.Scene()
    this.scene.background = null   // 透明背景：canvas 露出大屏深蓝底，翠绿轮廓/地形纹理不再被实心绿盖住，对比更清晰
    this.scene.fog = new TH.FogExp2(PALETTE.fog, 0.0022)   // 中性深蓝黑雾（接近大屏底 #030816），保留空间纵深但边缘不泛绿；区县标签 SpriteMaterial 设 fog:false 故不受雾影响、文字始终清晰
    this.camera = new TH.PerspectiveCamera(40, this.cssW / this.cssH, 0.5, 4000)

    // 轨道参数（球坐标）
    this.theta = -0.42     // 方位角
    this.phi = 0.92        // 极角（0=正上方）
    this.radius = 300
    this.target = new TH.Vector3(0, 6, 0)
    this.autoRotate = true
    this._idle = 0

    this._buildLights()
    this._buildGround()

    this.districtGroup = new TH.Group()
    this.markerGroup = new TH.Group()
    this.labelGroup = new TH.Group()
    this.roadGroup = new TH.Group()   // 路网图层（道路元素，亮黄绿，区别于地形/建筑）
    this.scene.add(this.districtGroup, this.markerGroup, this.labelGroup, this.roadGroup)

    this.raycaster = new TH.Raycaster()
    this.pointer = new TH.Vector2()
    this.hover = null
    this._pickables = []
    this._markPick = []

    this.clock = new TH.Clock()
    this._raf = null
    this._drag = false
    this._panMode = false   // 右键 / Shift+左键 拖拽 = 平移
    this._moved = 0
    this._last = null
    this._glowTex = glowTexture()

    // 环境贴图（PMREM 预滤波，失败则退回原始等距柱状图）
    try {
      const src = envTexture()
      const pmrem = new TH.PMREMGenerator(this.renderer)
      pmrem.compileEquirectangularShader()
      this._envTex = pmrem.fromEquirectangular(src).texture
      pmrem.dispose()
      src.dispose()
    } catch (e) {
      this._envTex = envTexture()
    }
    this.scene.environment = this._envTex

    try { this._initBloom() } catch (e) { this.bloom = null }
    this._bind()
    this.resize()
  }

  /* ------------------------------- 灯光 / 地面 ------------------------------ */

  _buildLights() {
    const TH = T()
    // 半球光只负责把阴影里的暗部从死黑拉回绿调，不参与提亮
    this.scene.add(new TH.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 0.79))

    const key = new TH.DirectionalLight(PALETTE.key, 3.51)
    key.position.set(-120, 220, 150)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 10
    key.shadow.camera.far = 700
    const s = 200
    key.shadow.camera.left = -s
    key.shadow.camera.right = s
    key.shadow.camera.top = s
    key.shadow.camera.bottom = -s
    key.shadow.bias = -0.0012
    key.shadow.normalBias = 0.5
    this.scene.add(key)

    // 冷色轮廓光（背侧）——只勾边，不铺面
    const rimC = new TH.DirectionalLight(PALETTE.rimC, 1.46)
    rimC.position.set(160, 70, -180)
    this.scene.add(rimC)

    // 暖绿补光（右前），拉开冷暖层次避免通体发闷
    const rimW = new TH.DirectionalLight(PALETTE.rimW, 0.49)
    rimW.position.set(190, 60, 120)
    this.scene.add(rimW)

    // 中心底部氛围点光（弱，只给地面一点绿色余晖）
    const core = new TH.PointLight(PALETTE.core, 0.42, 300, 2)
    core.position.set(0, -14, 0)
    this.scene.add(core)
  }

  _buildGround() {
    const TH = T()
    this.groundGroup = new TH.Group()

    // 地面：完全透明（alpha=0），不渲染任何可见颜色；保留下方扫描网格层作为辅助线
    const plane = new TH.Mesh(
      new TH.PlaneGeometry(1600, 1600),
      new TH.MeshStandardMaterial({
        color: PALETTE.ground, roughness: 0.98, metalness: 0.0,
        transparent: true, opacity: 0, depthWrite: false
      })
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.6
    plane.receiveShadow = false   // 透明地面不再接收阴影，避免不可见面上残留暗斑
    this.groundGroup.add(plane)

    // 极坐标网格 + 扫描环（自定义 shader，加性混合）
    this.scanMat = new TH.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: TH.AdditiveBlending,
      side: TH.DoubleSide,
      extensions: { derivatives: true },
        uniforms: {
        uTime: { value: 0 },
        uColor: { value: new TH.Color(PALETTE.scan) },
        uColor2: { value: new TH.Color(PALETTE.scan2) },
        uR: { value: 300 }
      },
      vertexShader: `
        varying vec2 vP;
        void main() {
          vP = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColor; uniform vec3 uColor2; uniform float uR;
        varying vec2 vP;
        void main() {
          float r = length(vP) / uR;              // 0..1
          if (r > 1.0) discard;
          float a = atan(vP.y, vP.x);

          // 矩形测绘网格（科技底板质感，抗锯齿）
          vec2 gc = vP / 26.0;
          vec2 gd = abs(fract(gc) - 0.5) * 2.0;
          vec2 gw = fwidth(gc) * 2.2 + 0.012;
          float grid = 1.0 - smoothstep(0.0, max(gw.x, gw.y), min(gd.x, gd.y));
          grid *= 0.10 * (1.0 - r * 0.75);

          // 同心环
          float rings = smoothstep(0.975, 1.0, abs(sin(r * 22.0))) * 0.10;
          // 主结构环
          float g1 = smoothstep(0.005, 0.0, abs(r - 0.42)) * 0.34;
          float g2 = smoothstep(0.004, 0.0, abs(r - 0.72)) * 0.20;
          float g3 = smoothstep(0.008, 0.0, abs(r - 0.98)) * 0.28;
          // 辐射线
          float spokes = smoothstep(0.985, 1.0, abs(cos(a * 12.0))) * 0.07 * (1.0 - r);
          // 旋转扫描扇形
          float sw = mod(a - uTime * 0.9, 6.28318);
          float sweep = exp(-sw * 3.0) * 0.26 * (1.0 - r * 0.55);
          // 外扩脉冲
          float pw = fract(uTime * 0.22);
          float pulse = smoothstep(0.024, 0.0, abs(r - pw)) * (1.0 - pw) * 0.32;

          float v = grid + rings + g1 + g2 + g3 + spokes + sweep + pulse;
          v = min(v, 0.85);                       // 硬性封顶，防止叠加冲进 Bloom
          v *= smoothstep(1.0, 0.86, r);          // 外缘淡出
          vec3 col = mix(uColor2, uColor, clamp((sweep + pulse + g1) * 1.6, 0.0, 1.0));
          gl_FragColor = vec4(col * v, v * 0.85);
        }
      `
    })
    const scan = new TH.Mesh(new TH.CircleGeometry(300, 128), this.scanMat)
    scan.rotation.x = -Math.PI / 2
    scan.position.y = -0.35
    this.groundGroup.add(scan)

    this.scene.add(this.groundGroup)
  }

  /* --------------------------------- 数据装载 -------------------------------- */

  setGeo(geo, districtStats, regionCenter) {
    const TH = T()
    const features = (geo && geo.features) || []
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
      const stats = (districtStats && districtStats[name]) || { elderly: 1, beds: 0 }
      raw.push({ name, polys, stats })
      polys.forEach(p => p.outer.forEach(c => {
        if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]
        if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]
      }))
    })
    if (!raw.length) return

    const lngC = (minX + maxX) / 2
    const latC = (minY + maxY) / 2
    const k = Math.cos((latC * Math.PI) / 180)
    const S = 100
    this._lngC = lngC; this._latC = latC; this._k = k; this._S = S
    const toWorld = ([lng, lat]) => [(lng - lngC) * k * S, (lat - latC) * S]

    this.worldW = (maxX - minX) * k * S
    this.worldH = (maxY - minY) * S
    const minDist = Math.max(this.worldW, this.worldH) * 0.004  // 真 3D 顶点预算宽裕，保留更多岸线细节

    const maxE = Math.max(...raw.map(d => d.stats.elderly || 1))

    // 清空旧对象
    this._clearGroup(this.districtGroup)
    this._clearGroup(this.labelGroup)
    this._clearGroup(this.roadGroup)
    this._pickables = []

    this.districts = raw.map((d, idx) => {
      // 抽稀后不足 4 点的碎屑多边形会生成空几何（包围盒 -Infinity），直接剔除
      const polys = d.polys
        .map(p => ({
          outer: decimate(p.outer.map(toWorld), minDist),
          holes: p.holes.map(h => decimate(h.map(toWorld), minDist)).filter(h => h.length >= 4)
        }))
        .filter(p => p.outer.length >= 4)
      if (!polys.length) {
        // 极端情况：全被抽稀掉，回退为最大环的原始点集
        const big = d.polys.slice().sort((a, b) => b.outer.length - a.outer.length)[0]
        if (big && big.outer.length >= 4) polys.push({ outer: big.outer.map(toWorld), holes: [] })
      }
      const ratio = (d.stats.elderly || 1) / maxE
      const height = 8 + ratio * 26         // 数据驱动起伏 8 ~ 34
      const c = (regionCenter && regionCenter[d.name]) || null
      const centroid = c ? toWorld(c) : avgRing(d.polys[0].outer.map(toWorld))
      return { name: d.name, stats: d.stats, polys, centroid, height, ratio, idx }
    })

    this.districts.forEach(d => this._buildDistrict(d))
    this.districts.forEach(d => this._buildDistrictLabel(d))
    this._buildRoads()   // 道路/路网层：各区县 centroid → 市政中心枢纽，亮黄绿

    // 地面圈层按地图跨度归一（扫描环几何半径固定 300，需缩放到略大于地图）
    const spanG = Math.max(this.worldW, this.worldH)
    const gs = (spanG * 0.95) / 300
    this.groundGroup.scale.set(gs, 1, gs)

    // 相机取景
    const span = spanG
    this.radius = span * 2.05
    this._minR = span * 1.05
    this._maxR = span * 3.6
    this.target.set(0, 8, 0)
    this._syncCamera()
  }

  _buildDistrict(d) {
    const TH = T()
    // 科技绿双端色阶：低人口偏深绿，高人口偏翠绿，同族色不跳色
    const r = d.ratio
    const deepCol = new TH.Color(PALETTE.terrainDeep).lerp(new TH.Color(PALETTE.terrainHi), r)  // 低洼深绿 → 高地翠绿
    const baseCol = new TH.Color(PALETTE.terrainHi)  // 高地/主色：翠绿
    const lineCol = new TH.Color(PALETTE.terrainLine)  // 测绘线/辉光亮绿
    const uHover = { value: 0 }
    const uDim = { value: 1.0 }   // 下钻聚焦：非选中区县整体压暗，选中保持 1.0

    // 顶面：低金属 + 高粗糙 + 弱清漆，靠程序化地形出质感而非靠打光
    const topMat = new TH.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.16,
      roughness: 0.60,
      clearcoat: 0.32,
      clearcoatRoughness: 0.58,
      envMapIntensity: 1.04
    })
    topMat.extensions = { derivatives: true }
    topMat.onBeforeCompile = (sh) => {
      sh.uniforms.uDeep = { value: deepCol }
      sh.uniforms.uBase = { value: baseCol }
      sh.uniforms.uLine = { value: lineCol }
      sh.uniforms.uHover = uHover
      sh.vertexShader = 'varying vec2 vXY;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vXY = position.xy;'
      )
      sh.fragmentShader =
        'uniform vec3 uDeep;\nuniform vec3 uBase;\nuniform vec3 uLine;\nuniform float uHover;\nuniform float uDim;\nvarying vec2 vXY;\n' +
        TERRAIN_GLSL +
        sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
  float e1 = tfbm(vXY * 0.055);
  float e2 = tfbm(vXY * 0.235 + 41.0);
  float elev = e1 * 0.82 + e2 * 0.18;
  float contour = isoLine(elev, 0.075, 0.010);     // 首曲线
  float major   = isoLine(elev, 0.300, 0.014);     // 计曲线
  float gA = gridLine(vXY,  5.0, 0.010);           // 细测绘网格
  float gB = gridLine(vXY, 20.0, 0.006);           // 主测绘网格
  float shade = 0.54 + elev * 0.92;                // 高程明暗对比加大：暗部不黑、亮部有体积
  vec3 terr = mix(uDeep, uBase, smoothstep(0.20, 0.88, elev)) * shade;
  terr = mix(terr, uLine * 0.68, contour * 0.55);  // 首曲线更亮、更宽
  terr = mix(terr, uLine * 0.95, major * 0.72);    // 计曲线高亮，强调地形起伏
  terr += uLine * (gA * 0.14 + gB * 0.38);         // 测绘网格显著可见
  terr += uLine * uHover * 0.20;
  diffuseColor.rgb = terr;
  diffuseColor.rgb *= uDim;`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.32, clamp(major * 0.8 + gB * 0.5, 0.0, 1.0));`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += uLine * (major * 0.55 + gB * 0.38 + contour * 0.18);
  totalEmissiveRadiance += uLine * uHover * 0.32;
  totalEmissiveRadiance *= uDim;`)
    }

    // 侧墙：底暗顶亮 + 地层线 + 顶部一道细热边
    const sideMat = new TH.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.28, roughness: 0.64, envMapIntensity: 0.90
    })
    sideMat.extensions = { derivatives: true }
    const uH = { value: d.height }
    sideMat.userData.uH = uH
    sideMat.onBeforeCompile = (sh) => {
      sh.uniforms.uH = uH
      sh.uniforms.uBot = { value: deepCol.clone().multiplyScalar(0.68) }
      sh.uniforms.uTop = { value: baseCol.clone().multiplyScalar(1.02) }
      sh.uniforms.uEdge = { value: lineCol }
      sh.uniforms.uHover = uHover
      sh.vertexShader = 'varying float vExtr;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vExtr = position.z;'
      )
      sh.fragmentShader =
        'uniform float uH;\nuniform vec3 uBot;\nuniform vec3 uTop;\nuniform vec3 uEdge;\nuniform float uHover;\nuniform float uDim;\nvarying float vExtr;\n' +
        TERRAIN_GLSL +
        sh.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
  float tt = clamp(vExtr / max(uH, 0.001), 0.0, 1.0);
  float strata = isoLine(vExtr, 2.6, 0.05);        // 地层线，强化"切片"感
  vec3 sideC = mix(uBot, uTop, pow(tt, 0.85));
  sideC += uEdge * strata * 0.065;
  sideC += uEdge * uHover * 0.16;
  diffuseColor.rgb = sideC;
  diffuseColor.rgb *= uDim;`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float tE = clamp(vExtr / max(uH, 0.001), 0.0, 1.0);
  totalEmissiveRadiance += uEdge * pow(tE, 16.0) * 0.55;
  totalEmissiveRadiance += uEdge * strata * 0.028;
  totalEmissiveRadiance += uEdge * uHover * 0.22;
  totalEmissiveRadiance *= uDim;`)
    }

    const group = new TH.Group()
    d.polys.forEach(p => {
      const shape = new TH.Shape(p.outer.map(([x, y]) => new TH.Vector2(x, y)))
      p.holes.forEach(h => shape.holes.push(new TH.Path(h.map(([x, y]) => new TH.Vector2(x, y)))))
      const geo = new TH.ExtrudeGeometry(shape, {
        depth: d.height, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2, curveSegments: 1
      })
      const mesh = new TH.Mesh(geo, [topMat, sideMat])
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.district = d.name
      group.add(mesh)
      this._pickables.push(mesh)

      // 顶面发光轮廓
      const pts = p.outer.map(([x, y]) => new TH.Vector3(x, y, d.height + 0.35))
      const lineGeo = new TH.BufferGeometry().setFromPoints(pts)
      const line = new TH.Line(lineGeo, new TH.LineBasicMaterial({
        color: lineCol, transparent: true, opacity: 0.55, blending: TH.AdditiveBlending, depthWrite: false
      }))
      group.add(line)

      // 落地基线（贴地淡光）
      const bpts = p.outer.map(([x, y]) => new TH.Vector3(x, y, 0.15))
      const bGeo = new TH.BufferGeometry().setFromPoints(bpts)
      group.add(new TH.Line(bGeo, new TH.LineBasicMaterial({
        color: lineCol, transparent: true, opacity: 0.18, blending: TH.AdditiveBlending, depthWrite: false
      })))
    })

    group.rotation.x = -Math.PI / 2   // 挤出方向 +Z → 世界 +Y
    group.userData.district = d.name
    this.districtGroup.add(group)

    d.group = group
    d.topMat = topMat
    d.sideMat = sideMat
    d.uHover = uHover
    d.uDim = uDim
    d.lift = 0
    d.liftTarget = 0
    d.hoverTarget = 0
  }

  _buildDistrictLabel(d) {
    const TH = T()
    const { tex, W, H } = labelTexture(d.name, '#9dffc4', `${d.stats.elderly}万老人`)
    const spr = new TH.Sprite(new TH.SpriteMaterial({
      map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false
    }))
    const k = 0.10
    spr.scale.set(W * k, H * k, 1)
    spr.position.set(d.centroid[0], d.height + 14, -d.centroid[1])
    spr.renderOrder = 20
    spr.userData.districtLabel = d.name
    this.labelGroup.add(spr)
    d.label = spr
  }

  // 道路/路网图层：以亮黄绿连接各区县 centroid 到市政中心枢纽，
  // 与「地形翠绿」「建筑深绿」形成清晰的三元色彩区分（道路/地形/建筑）。
  _buildRoads() {
    const TH = T()
    this._clearGroup(this.roadGroup)
    if (!this.districts || this.districts.length < 2) return
    const pts = this.districts.map(d => [d.centroid[0], -d.centroid[1]])  // 世界坐标：z = -y
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const mat = new TH.LineBasicMaterial({
      color: PALETTE.road, transparent: true, opacity: 0.55,
      blending: TH.AdditiveBlending, depthWrite: false
    })
    pts.forEach(p => {
      const g = new TH.BufferGeometry().setFromPoints([
        new TH.Vector3(p[0], 0.7, p[1]),
        new TH.Vector3(cx, 0.7, cy)
      ])
      this.roadGroup.add(new TH.Line(g, mat))
    })
    // 中心枢纽节点（亮环）
    const hub = new TH.Mesh(
      new TH.RingGeometry(3.2, 5.4, 36),
      new TH.MeshBasicMaterial({ color: PALETTE.road, transparent: true, opacity: 0.75, side: TH.DoubleSide, blending: TH.AdditiveBlending, depthWrite: false })
    )
    hub.rotation.x = -Math.PI / 2
    hub.position.set(cx, 0.7, cy)
    this.roadGroup.add(hub)
  }

  setData({ tab, showAll, markers }) {
    this.tab = tab
    this.showAll = showAll
    this.markers = (markers || []).map(m => ({ ...m }))
    this._buildMarkers()
  }

  // 下钻聚焦：选中区县抬升 + 保持高亮，其余整体压暗（uDim 0.32）。name 为空 = 返回市级全景。
  setFocus(name) {
    this.focusName = name || null
    ;(this.districts || []).forEach(d => {
      const on = this.focusName && d.name === this.focusName
      d.liftTarget = on ? 7 : 0
      d.hoverTarget = on ? 1 : 0
      if (d.uDim) d.uDim.value = (this.focusName && !on) ? 0.32 : 1.0
    })
  }

  _buildMarkers() {
    const TH = T()
    this._clearGroup(this.markerGroup)
    this._markPick = []
    this._pillarMats = []
    if (!this.markers || !this.districts) return

    const S = this._S
    const toWorld = (lng, lat) => [(lng - this._lngC) * this._k * S, (lat - this._latC) * S]

    // 共享光柱 shader（加性、底亮顶淡、脉冲上行）
    if (!this._pillarProto) {
      this._pillarProto = new TH.CylinderGeometry(0.85, 0.85, 1, 12, 1, true)
      this._pillarProto.translate(0, 0.5, 0)   // 底部对齐原点
    }

    this.markers.forEach((m, i) => {
      const [wx, wy] = toWorld(m.lng, m.lat)
      const base = this._heightAt(wx, wy)
      const col = new TH.Color(m.color || PALETTE.markerFallback)
      const h = 16 + (m.cat === 'alarm' ? 10 : 0)

      const g = new TH.Group()
      g.position.set(wx, base, -wy)

      // 光柱
      const mat = new TH.ShaderMaterial({
        transparent: true, depthWrite: false, blending: TH.AdditiveBlending, side: TH.DoubleSide,
        uniforms: { uColor: { value: col }, uTime: { value: 0 }, uSeed: { value: i * 0.37 } },
        vertexShader: `
          varying float vY; varying vec2 vUv;
          void main() { vY = uv.y; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          uniform vec3 uColor; uniform float uTime; uniform float uSeed; varying float vY;
          void main() {
            float fall = pow(1.0 - vY, 1.7);
            float wave = smoothstep(0.10, 0.0, abs(fract(uTime * 0.5 + uSeed) - vY)) * 0.7;
            float a = min(fall * 0.48 + wave, 0.9);
            gl_FragColor = vec4(uColor * (0.72 + wave * 0.85), a);
          }
        `
      })
      const pillar = new TH.Mesh(this._pillarProto, mat)
      pillar.scale.set(1, h, 1)
      g.add(pillar)
      this._pillarMats = this._pillarMats || []
      this._pillarMats.push(mat)

      // 顶部光点
      const spr = new TH.Sprite(new TH.SpriteMaterial({
        map: this._glowTex, color: col, transparent: true, opacity: 0.62,
        blending: TH.AdditiveBlending, depthWrite: false, depthTest: false
      }))
      spr.scale.set(8, 8, 1)
      spr.position.y = h
      spr.renderOrder = 12
      g.add(spr)

      // 底部呼吸环
      const ringMat = new TH.ShaderMaterial({
        transparent: true, depthWrite: false, blending: TH.AdditiveBlending, side: TH.DoubleSide,
        uniforms: { uColor: { value: col }, uTime: { value: 0 }, uSeed: { value: i * 0.53 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform vec3 uColor; uniform float uTime; uniform float uSeed; varying vec2 vP;
          void main() {
            float r = length(vP) / 7.0;
            float p = fract(uTime * 0.45 + uSeed);
            float ring = smoothstep(0.10, 0.0, abs(r - p)) * (1.0 - p);
            float core = smoothstep(0.30, 0.0, r) * 0.30;
            float a = min(ring + core, 0.8);
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor * 0.9, a * 0.6);
          }
        `
      })
      const ring = new TH.Mesh(new TH.CircleGeometry(7, 40), ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.4
      g.add(ring)
      this._pillarMats.push(ringMat)

      // 拾取代理（不可见，放大命中范围）
      const pick = new TH.Mesh(
        new TH.SphereGeometry(5.2, 8, 8),
        new TH.MeshBasicMaterial({ visible: false })
      )
      pick.position.y = h
      pick.userData.marker = m
      g.add(pick)
      this._markPick.push(pick)

      this.markerGroup.add(g)
    })
  }

  // 查询 (wx, wy) 落在哪个区县上，返回该区县顶面高度
  _heightAt(wx, wy) {
    if (!this.districts) return 0
    for (const d of this.districts) {
      for (const p of d.polys) {
        if (pointInPoly(wx, wy, p.outer)) return d.height
      }
    }
    return 4
  }

  /* ---------------------------------- Bloom --------------------------------- */

  _initBloom() {
    const TH = T()
    const w = Math.max(2, Math.floor(this.cssW * this.dpr))
    const h = Math.max(2, Math.floor(this.cssH * this.dpr))
    const o = { type: TH.HalfFloatType, minFilter: TH.LinearFilter, magFilter: TH.LinearFilter, depthBuffer: true }

    this.rtScene = new TH.WebGLRenderTarget(w, h, o)
    this.rtA = new TH.WebGLRenderTarget(w >> 1, h >> 1, { ...o, depthBuffer: false })
    this.rtB = new TH.WebGLRenderTarget(w >> 1, h >> 1, { ...o, depthBuffer: false })

    this.quadCam = new TH.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new TH.Scene()
    const quadGeo = new TH.PlaneGeometry(2, 2)

    const VS = `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `
    this.brightMat = new TH.ShaderMaterial({
      uniforms: { tD: { value: null }, uTh: { value: 0.29 }, uSoft: { value: 0.22 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D tD; uniform float uTh; uniform float uSoft; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tD, vUv).rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          float k = smoothstep(uTh, uTh + uSoft, l);
          gl_FragColor = vec4(c * k, 1.0);
        }
      `
    })
    this.blurMat = new TH.ShaderMaterial({
      uniforms: { tD: { value: null }, uDir: { value: new TH.Vector2(1, 0) } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D tD; uniform vec2 uDir; varying vec2 vUv;
        void main() {
          vec3 s = texture2D(tD, vUv).rgb * 0.2270270270;
          s += texture2D(tD, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
          s += texture2D(tD, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
          s += texture2D(tD, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
          s += texture2D(tD, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
          gl_FragColor = vec4(s, 1.0);
        }
      `
    })
    this.compMat = new TH.ShaderMaterial({
      uniforms: { tScene: { value: null }, tBloom: { value: null }, uStrength: { value: 0.38 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uStrength; varying vec2 vUv;
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c));
        }
        void main() {
          vec4 base = texture2D(tScene, vUv);
          vec3 bloom = texture2D(tBloom, vUv).rgb;
          // 屏幕混合而非纯加性：亮部不会无限累加击穿
          vec3 b = bloom * uStrength;
          vec3 col = 1.0 - (1.0 - clamp(base.rgb, 0.0, 1.0)) * (1.0 - clamp(b, 0.0, 1.0));
          col = mix(base.rgb, col, 0.9);

          // 轻度 S 曲线：压暗部、留高光，避免整体压曝后发灰
          col = col * col * (3.0 - 2.0 * col) * 0.34 + col * 0.66;
          // 暗部注入绿调，强化科技感而非纯黑
          col += vec3(0.010, 0.046, 0.028) * (1.0 - smoothstep(0.0, 0.35, dot(col, vec3(0.33))));

          // 轻微暗角，聚焦中心
          vec2 q = vUv - 0.5;
          col *= 1.0 - dot(q, q) * 0.38;
          gl_FragColor = vec4(toSRGB(col), max(base.a, min(1.0, dot(bloom, vec3(0.5)))));
        }
      `,
      transparent: true
    })
    this.quadMesh = new TH.Mesh(quadGeo, this.brightMat)
    this.quadMesh.frustumCulled = false
    this.quadScene.add(this.quadMesh)
    this.bloom = true
  }

  _renderBloom() {
    const r = this.renderer
    r.setRenderTarget(this.rtScene)
    r.clear()
    r.render(this.scene, this.camera)

    const w = this.rtA.width, h = this.rtA.height

    this.quadMesh.material = this.brightMat
    this.brightMat.uniforms.tD.value = this.rtScene.texture
    r.setRenderTarget(this.rtA)
    r.render(this.quadScene, this.quadCam)

    this.quadMesh.material = this.blurMat
    this.blurMat.uniforms.tD.value = this.rtA.texture
    this.blurMat.uniforms.uDir.value.set(1 / w, 0)
    r.setRenderTarget(this.rtB)
    r.render(this.quadScene, this.quadCam)

    this.blurMat.uniforms.tD.value = this.rtB.texture
    this.blurMat.uniforms.uDir.value.set(0, 1 / h)
    r.setRenderTarget(this.rtA)
    r.render(this.quadScene, this.quadCam)

    this.quadMesh.material = this.compMat
    this.compMat.uniforms.tScene.value = this.rtScene.texture
    this.compMat.uniforms.tBloom.value = this.rtA.texture
    r.setRenderTarget(null)
    r.clear()
    r.render(this.quadScene, this.quadCam)
  }

  /* ---------------------------------- 交互 ---------------------------------- */

  _bind() {
    const el = this.canvas
    el.style.cursor = 'grab'
    el.style.touchAction = 'none'

    this._onDown = (e) => {
      this._drag = true
      this._moved = 0
      this._last = { x: e.clientX, y: e.clientY }
      this._idle = 0
      // 右键 / Shift+左键 = 平移；左键 = 旋转
      this._panMode = (e.button === 2) || (e.button === 0 && e.shiftKey)
      el.style.cursor = this._panMode ? 'move' : 'grabbing'
      el.setPointerCapture && el.setPointerCapture(e.pointerId)
    }
    this._onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const kx = this.cssW / (rect.width || 1)
      const ky = this.cssH / (rect.height || 1)
      const lx = (e.clientX - rect.left) * kx
      const ly = (e.clientY - rect.top) * ky

      if (this._drag && this._last) {
        const dx = e.clientX - this._last.x
        const dy = e.clientY - this._last.y
        this._moved += Math.abs(dx) + Math.abs(dy)
        if (this._panMode) {
          // 平移：按当前相机朝向把屏幕拖拽映射到地面平面
          const scale = this.radius * 0.0016
          const camDir = new TH.Vector3(); this.camera.getWorldDirection(camDir)
          const right = new TH.Vector3().crossVectors(camDir, new TH.Vector3(0, 1, 0)).normalize()
          const fwd = new TH.Vector3(-camDir.x, 0, -camDir.z).normalize()
          this.target.addScaledVector(right, -dx * scale)
          this.target.addScaledVector(fwd, dy * scale)
          // 限制平移范围，避免丢失地图
          const lim = (this.worldW || 200) * 1.6
          this.target.x = Math.max(-lim, Math.min(lim, this.target.x))
          this.target.z = Math.max(-lim, Math.min(lim, this.target.z))
        } else {
          this.theta -= dx * 0.005
          this.phi = Math.max(0.22, Math.min(1.38, this.phi - dy * 0.004))
        }
        this._last = { x: e.clientX, y: e.clientY }
        this._idle = 0
        this._syncCamera()
        return
      }
      this.pointer.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1
      this.pointer.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1
      this._hoverTest(lx, ly)
    }
    this._onUp = () => {
      this._drag = false
      this._panMode = false
      this._last = null
      el.style.cursor = this.hover ? 'pointer' : 'grab'
    }
    this._onClick = () => {
      if (this._moved > 6) return
      const hit = this._pick()
      if (hit && hit.marker) { this.onSelect(hit.marker.detail); return }
      if (hit && hit.district) {
        // 下钻：优先回调 onDistrict（由 BigScreen 接管「区县轮廓板块」与返回市级）
        if (this.onDistrict) { this.onDistrict(hit.district); return }
        const d = this.districts.find(z => z.name === hit.district)
        if (!d) return
        const per = Math.round((d.stats.beds / d.stats.elderly) * 1000)
        this.onSelect({
          categoryLabel: '区县概览', color: '#00f0ff', name: d.name,
          rows: [
            { label: '老年人口', value: d.stats.elderly + ' 万', hot: true },
            { label: '养老床位', value: d.stats.beds + ' 万张' },
            { label: '千名老人床位', value: per + ' 张' },
            { label: '所属层级', value: '区县级养老单元' }
          ],
          desc: `${d.name}已构建「机构+社区+居家」三级养老服务体系，覆盖城乡老年群体基本养老与医养结合需求。`
        })
      }
    }
    this._onWheel = (e) => {
      e.preventDefault()
      const f = e.deltaY > 0 ? 1.08 : 0.926
      this.radius = Math.max(this._minR || 80, Math.min(this._maxR || 900, this.radius * f))
      this._idle = 0
      this._syncCamera()
    }
    this._onLeave = () => {
      this.hover = null
      this._applyHover(null)
      this.onHover(null)
    }

    this._onCtx = (e) => e.preventDefault()   // 屏蔽右键菜单，使右键可用于平移
    el.addEventListener('pointerdown', this._onDown)
    el.addEventListener('pointermove', this._onMove)
    window.addEventListener('pointerup', this._onUp)
    el.addEventListener('click', this._onClick)
    el.addEventListener('wheel', this._onWheel, { passive: false })
    el.addEventListener('pointerleave', this._onLeave)
    el.addEventListener('contextmenu', this._onCtx)
  }

  _pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const mk = this.raycaster.intersectObjects(this._markPick, false)
    if (mk.length) return { marker: mk[0].object.userData.marker }
    const dt = this.raycaster.intersectObjects(this._pickables, false)
    if (dt.length) return { district: dt[0].object.userData.district }
    return null
  }

  _hoverTest(lx, ly) {
    const hit = this._pick()
    if (hit && hit.marker) {
      const m = hit.marker
      this._applyHover(null)
      this.hover = { type: 'mark', name: m.name }
      this.canvas.style.cursor = 'pointer'
      this.onHover({ text: m.name, x: lx, y: ly, color: m.color })
      return
    }
    if (hit && hit.district) {
      this._applyHover(hit.district)
      const d = this.districts.find(z => z.name === hit.district)
      this.hover = { type: 'dist', name: hit.district }
      this.canvas.style.cursor = 'pointer'
      this.onHover({ text: `${d.name} · 老年人口 ${d.stats.elderly}万`, x: lx, y: ly, color: '#00f0ff' })
      return
    }
    this._applyHover(null)
    this.hover = null
    this.canvas.style.cursor = this._drag ? 'grabbing' : 'grab'
    this.onHover(null)
  }

  _applyHover(name) {
    if (this._hoverName === name) return
    this._hoverName = name
    ;(this.districts || []).forEach(d => {
      const on = d.name === name
      d.liftTarget = on ? 5.5 : 0
      d.hoverTarget = on ? 1 : 0
    })
  }

  /* -------------------------------- 相机 / 渲染 ------------------------------- */

  _syncCamera() {
    const sp = Math.sin(this.phi), cp = Math.cos(this.phi)
    this.camera.position.set(
      this.target.x + this.radius * sp * Math.sin(this.theta),
      this.target.y + this.radius * cp,
      this.target.z + this.radius * sp * Math.cos(this.theta)
    )
    this.camera.lookAt(this.target)
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime

    // 空闲自动缓转
    this._idle += dt
    if (this.autoRotate && this._idle > 3 && !this._drag) {
      this.theta -= dt * 0.055
      this._syncCamera()
    }

    if (this.scanMat) this.scanMat.uniforms.uTime.value = t
    ;(this._pillarMats || []).forEach(m => { m.uniforms.uTime.value = t })

    // 悬停抬升 + 辉光缓动
    ;(this.districts || []).forEach(d => {
      if (Math.abs(d.lift - d.liftTarget) > 0.01) {
        d.lift += (d.liftTarget - d.lift) * Math.min(1, dt * 9)
        d.group.position.y = d.lift
        if (d.label) d.label.position.y = d.height + 14 + d.lift
      }
      if (d.uHover && Math.abs(d.uHover.value - d.hoverTarget) > 0.005) {
        d.uHover.value += (d.hoverTarget - d.uHover.value) * Math.min(1, dt * 10)
      }
    })

    // 标签随距离淡出，避免近景遮挡
    const camD = this.camera.position.distanceTo(this.target)
    const la = Math.max(0.25, Math.min(1, (camD - (this._minR || 80) * 0.9) / 120))
    this.labelGroup.children.forEach(s => { s.material.opacity = la })

    if (this.bloom) this._renderBloom()
    else this.renderer.render(this.scene, this.camera)
  }

  /* --------------------------------- 生命周期 -------------------------------- */

  resize() {
    const w = this.container.clientWidth || 800
    const h = this.container.clientHeight || 600
    if (w === this.cssW && h === this.cssH && this._sized) return
    this._sized = true
    this.cssW = w
    this.cssH = h
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    if (this.bloom) {
      const pw = Math.max(2, Math.floor(w * this.dpr))
      const ph = Math.max(2, Math.floor(h * this.dpr))
      this.rtScene.setSize(pw, ph)
      this.rtA.setSize(pw >> 1, ph >> 1)
      this.rtB.setSize(pw >> 1, ph >> 1)
    }
    this._syncCamera()
  }

  start() {
    if (this._raf) return
    this.resize()
    this.clock.start()
    const loop = () => {
      this._tick()
      this._raf = requestAnimationFrame(loop)
    }
    this._raf = requestAnimationFrame(loop)
    if (!this._ro && window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize())
      this._ro.observe(this.container)
    }
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  }

  _clearGroup(g) {
    if (!g) return
    while (g.children.length) {
      const c = g.children.pop()
      c.traverse && c.traverse(o => {
        // Sprite 的 geometry 是 three 内部共享实例，绝不能 dispose
        if (o.geometry && !o.isSprite && o.geometry !== this._pillarProto) o.geometry.dispose()
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material]
          ms.forEach(m => {
            if (m.map && m.map !== this._glowTex) m.map.dispose()
            m.dispose()
          })
        }
      })
      g.remove(c)
    }
  }

  dispose() {
    this.stop()
    if (this._ro) { this._ro.disconnect(); this._ro = null }
    const el = this.canvas
    el.removeEventListener('pointerdown', this._onDown)
    el.removeEventListener('pointermove', this._onMove)
    window.removeEventListener('pointerup', this._onUp)
    el.removeEventListener('click', this._onClick)
    el.removeEventListener('wheel', this._onWheel)
    el.removeEventListener('pointerleave', this._onLeave)
    el.removeEventListener('contextmenu', this._onCtx)
    this._clearGroup(this.districtGroup)
    this._clearGroup(this.markerGroup)
    this._clearGroup(this.labelGroup)
    this._clearGroup(this.groundGroup)
    if (this.rtScene) this.rtScene.dispose()
    if (this.rtA) this.rtA.dispose()
    if (this.rtB) this.rtB.dispose()
    if (this._glowTex) this._glowTex.dispose()
    if (this._envTex) this._envTex.dispose()
    this.renderer.dispose()
    el.remove()
  }
}
