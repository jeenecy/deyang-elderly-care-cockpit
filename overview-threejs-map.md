# 3D 地图升级：接入真 Three.js（WebGL）

## 做了什么

把大屏 3D 地图从「Canvas 2.5D 手绘投影」升级为**真正的 WebGL 三维渲染**，同时保留完整降级链。

---

## 1. Three.js 引入方式

`index.html`：

```html
<!-- Three.js r160（最后一个官方 UMD 构建，暴露全局 THREE） -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<!-- CDN 不可达时自动回落到本地 vendor 副本 -->
<script>
  if (!window.THREE) document.write('<script src="/vendor/three.min.js"><\/script>')
</script>
```

**为什么不用 `three@latest`**
官方从 r150 起弃用 UMD 构建，r160 之后彻底移除。`latest` 是移动靶——npm 一发新版，`build/three.min.js` 直接 404，大屏白屏。所以固定在 **r160**（最后一版 UMD，669 KB）。

**本地兜底**
同一份文件已存到 `public/vendor/three.min.js`。CDN 挂了 / 内网断外网时自动切本地，不影响演示。

---

## 2. 新引擎 `src/utils/map3dThree.js`

API 与旧引擎完全一致（`setGeo / setData / start / stop / resize / dispose`），BigScreen 只换了一行 import。

| 能力 | 实现 |
|---|---|
| 立体地形 | GeoJSON → `THREE.Shape`(含孔洞) → `ExtrudeGeometry`，**每区县按老年人口挤出不同高度**（8～34） |
| 顶面材质 | `MeshPhysicalMaterial`，`clearcoat=1` 玻璃清漆 + 程序化科技网格贴图 |
| 侧墙材质 | `MeshStandardMaterial` + `onBeforeCompile` 注入渐变：底部墨蓝 → 顶部亮青，顶边一道 emissive 热边 |
| 环境反射 | `PMREMGenerator` 把 canvas 渐变天空预滤波成 env map，金属/清漆不再发死黑 |
| 真实阴影 | 平行主光 + PCFSoft 2048 阴影贴图，投影到地面，深度线索到位 |
| 后期 Bloom | 自研两段式：亮度提取 → 半分辨率双向高斯 → 加性合成 + 手写 sRGB 编码 + 轻暗角 |
| 地面 | 极坐标网格 + 同心结构环 + **旋转扫描扇形** + 外扩脉冲，全部 GLSL 生成 |
| 标记 | 光柱（上行脉冲波）+ 顶部辉光精灵 + 底部呼吸环，按分类配色 |
| 标签 | 精灵标签（区县名 + 老年人口），随镜头距离淡出 |
| 交互 | 拖拽旋转 / 滚轮缩放 / 空闲 3 秒自动缓转；Raycaster 悬停高亮**抬升区块** + 提示，点击弹详情 |

**降级链**：Three.js → 构造失败 catch → Canvas 2.5D 引擎（`map3dEngine.js` 保留作 fallback）。

---

## 3. 顺带优化

- **删掉 `import 'echarts-gl'`**（geo3D 已彻底弃用）
  bundle `1978 KB → 1385 KB`，gzip `625 → 462 KB`，模块数 `902 → 627`
- `onResize` 补上 `engine3d.resize()`（之前窗口缩放 3D 画布不跟随）

---

## 4. 验证

无头浏览器不可用，改用 **Node 打桩加载 UMD three** 跑通几何链路：

```
THREE loaded, REVISION = 160
worldW 118.1  worldH 117.3  minDist 0.47
旌阳区  polys=1  pts=156  h=26.2  verts=5568   groups=ok  z=ok
罗江区  polys=1  pts=155  h=15.2  verts=5532   groups=ok  z=ok
中江县  原始多边形 5 → 有效 1   h=34.0  verts=14856  groups=ok  z=ok
广汉市  polys=1  pts=168  h=23.9  verts=6000   groups=ok  z=ok
什邡市  polys=1  pts=252  h=20.6  verts=9060   groups=ok  z=ok
绵竹市  polys=1  pts=229  h=21.4  verts=8232   groups=ok  z=ok
total verts = 49248 | NaN geometries = 0
```

**这一步抓到了真 bug**：中江县有 5 个多边形，抽稀后 4 个退化成空几何（`boundingBox.max.z = -Infinity`），会生成空 Mesh 并污染 raycast 拾取列表。已加 `filter(outer.length >= 4)` 剔除，并补最大环回退兜底。

其他踩坑：
- Sprite 的 `geometry` 是 three 内部**共享**实例，清理时绝不能 dispose
- group `rotation.x = -PI/2` 后，shape 局部 `(x,y,z)` → 世界 `(x, z, -y)`，标记定位须用 `(wx, height, -wy)`
- 地面扫描环几何半径写死 300，需按地图 span 缩放，否则飞出画外

---

## 5. 可调旋钮

| 位置 | 参数 |
|---|---|
| 相机 | `theta`(方位) / `phi`(俯仰, 0.22~1.38) / `radius` |
| 起伏 | `height = 8 + ratio * 26` |
| 辉光 | `compMat.uniforms.uStrength`(0.85) / `brightMat.uniforms.uTh`(0.62) |
| 色相 | `hue = 0.485 - ratio * 0.055` |
| 曝光 | `renderer.toneMappingExposure`(1.18) |
| 扫描环 | `scanMat` 片元着色器里的 `sweep / pulse / spokes` 系数 |
