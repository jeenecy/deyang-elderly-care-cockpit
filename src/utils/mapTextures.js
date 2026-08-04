// 程序化地图纹理（离线生成，零外部依赖，返回 dataURL）
// 用于增强大屏 2D 面纹理与 3D 材质细节，避免引入需要 token/网络的地图服务。

function canvas(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  draw(ctx, size)
  return c.toDataURL('image/png')
}

let _dot = null
let _grid = null
let _noise = null
let _terrain = null

// 2D 面纹理：极淡科技网点（透明底，仅网点带色，叠加在区域配色之上）
export function getDotTexture() {
  if (_dot) return _dot
  _dot = canvas(64, (ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    ctx.fillStyle = 'rgba(130, 210, 255, 0.55)'
    const step = 7
    for (let y = step / 2; y < s; y += step) {
      for (let x = step / 2; x < s; x += step) {
        ctx.beginPath()
        ctx.arc(x, y, 0.9, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  return _dot
}

// 3D 材质细节纹理：细网格 + 交点微光（电路/拓扑质感，可平铺）
export function getGridTexture() {
  if (_grid) return _grid
  _grid = canvas(160, (ctx, s) => {
    ctx.clearRect(0, 0, s, s)
    ctx.strokeStyle = 'rgba(120, 205, 255, 0.5)'
    ctx.lineWidth = 1
    const step = 20
    for (let i = 0; i <= s; i += step) {
      ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(s, i + 0.5); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(170, 235, 255, 0.85)'
    for (let y = 0; y <= s; y += step) {
      for (let x = 0; x <= s; x += step) {
        ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
      }
    }
  })
  return _grid
}

// 3D 实景贴片纹理：通亮科技风（只做浅青细节，避免把表面压暗）
// 零外部依赖，canvas 程序化生成，可被 echarts-gl realisticMaterial.detailTexture 平铺使用。
// 关键：基底为近白青（detailTexture 在 echarts-gl 中会与原色相乘，基底越亮表面越亮）。
export function getTerrainTexture() {
  if (_terrain) return _terrain
  _terrain = canvas(512, (ctx, s) => {
    // 1) 通亮基底：近白青，保证平铺后表面不发黑（仅提供极淡青调）
    ctx.fillStyle = '#d8fbf4'
    ctx.fillRect(0, 0, s, s)

    // 2) 极淡青色径向晕染（中心微亮，增强“实景”体积感，但不压暗）
    const bg = ctx.createRadialGradient(s * 0.5, s * 0.5, s * 0.05, s * 0.5, s * 0.5, s * 0.7)
    bg.addColorStop(0, 'rgba(190, 255, 245, 0.45)')
    bg.addColorStop(0.6, 'rgba(150, 245, 235, 0.16)')
    bg.addColorStop(1, 'rgba(210, 250, 245, 0)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, s, s)

    // 3) 细密科技网格（中青线，平铺后呈现数字地形“贴片”质感）
    ctx.strokeStyle = 'rgba(20, 170, 165, 0.28)'
    ctx.lineWidth = 0.9
    const step = 26
    for (let i = 0; i <= s; i += step) {
      ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(s, i + 0.5); ctx.stroke()
    }

    // 4) 网格节点高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    for (let y = 0; y <= s; y += step) {
      for (let x = 0; x <= s; x += step) {
        ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill()
      }
    }

    // 5) 类地形起伏亮纹（白青，浅色调，平铺后增加表面细节）
    for (let i = 0; i < 20; i++) {
      ctx.beginPath()
      const y = Math.random() * s
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(
        s * 0.25, y + (Math.random() - 0.5) * s * 0.3,
        s * 0.75, y + (Math.random() - 0.5) * s * 0.3,
        s, y + (Math.random() - 0.5) * s * 0.16
      )
      const a = 0.05 + Math.random() * 0.14
      ctx.strokeStyle = `rgba(220, 252, 255, ${a})`
      ctx.lineWidth = 1 + Math.random() * 3.5
      ctx.stroke()
    }

    // 6) 细微噪点（亮度较高，仅增加颗粒感）
    const img = ctx.createImageData(s, s)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + Math.random() * 95
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = Math.random() * 14
    }
    ctx.putImageData(img, 0, 0)
  })
  return _terrain
}

// 3D 材质噪点：细微颗粒，模拟真实表面粗糙度
export function getNoiseTexture() {
  if (_noise) return _noise
  _noise = canvas(128, (ctx, s) => {
    const img = ctx.createImageData(s, s)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + Math.random() * 105
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = Math.random() * 26
    }
    ctx.putImageData(img, 0, 0)
  })
  return _noise
}
