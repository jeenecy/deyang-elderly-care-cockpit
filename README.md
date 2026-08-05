# 德阳市智慧养老数字驾驶舱



面向市/区两级养老主管部门的 **智慧养老数字驾驶舱**：一套「驾驶舱大屏 + 后台管理」的可视化系统，覆盖政府监管、机构养老、社区养老、居家养老、医疗健康等主题，并内置老人档案管理（G03）等核心业务模块。

> 技术栈：Vue 3 + Pinia + Vue Router + Vite + ECharts + Three.js（3D 地图引擎）。后端为轻量 Node JSON 文件服务（records API），便于演示与二次开发。

---

## ✨ 功能模块

### 驾驶舱大屏（免登录）
- 2D / 3D 双模式德阳地图，政府/机构/社区/居家/医疗/关怀对象等多类点位可视化
- <img width="2880" height="1547" alt="image" src="https://github.com/user-attachments/assets/dc35ef56-d892-4b6f-9e5c-4cc54bfa399a" />
<img width="2880" height="1547" alt="image" src="https://github.com/user-attachments/assets/28a0734f-09eb-437e-bb88-669e74e561f7" />
- 顶部板块切换：**政府监管 · 机构养老 · 社区养老 · 居家养老 · 医疗健康 · 关怀对象**
- <img width="1278" height="128" alt="image" src="https://github.com/user-attachments/assets/43c22979-88b2-4191-a72f-326fa7e0a150" />

- 每个板块含 KPI 指标卡 + 多维度图表（分布、构成、TOP 排行、预警率等）
- <img width="2880" height="1547" alt="image" src="https://github.com/user-attachments/assets/34f1fc96-c226-4c09-bb52-d6533bc454d2" />

- 点击地图点位弹出详情卡；实时告警、后台自定义标注点
<img width="1386" height="1158" alt="image" src="https://github.com/user-attachments/assets/db0d820a-37ee-43e9-9038-44de70e33d4b" />

### 后台管理（需登录）
<img width="2880" height="1547" alt="image" src="https://github.com/user-attachments/assets/7473c0eb-ac30-4e5c-9b89-8fa47986a307" />

- **G01 登录鉴权**：前端模拟登录、失败锁定、图形验证码
- *管理功能**：老人档案 CRUD、健康标签多选、紧急联系人、按区县/状态筛选、批量操作、CSV 导出、详情抽屉
- 数据管理、告警中心、物联设备、内容管理、权限、审计日志、登录日志、可视化配置等

---

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动后端（JSON 文件服务，端口 3001）
```bash
npm run server
```

### 3. 启动前端（Vite 开发服务器，端口 5173）
```bash
npm run dev
```
浏览器打开 `http://localhost:5173`。根路径为免登录大屏；`/admin` 进入后台管理。

### 4. 构建生产包
```bash
npm run build      # 产物输出到 dist/
```

### 默认演示账号
| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 管理员 | `admin01` | `123456` |

> ⚠️ 演示项目，默认口令仅用于本地/演示环境，生产部署请务必修改。

---

## 📦 在线预览与发布

- **在线预览（GitHub Pages）**：构建产物 `dist/` 已发布至 `gh-pages` 分支，开启 Pages 后可通过 `https://<owner>.github.io/deyang-elderly-care-cockpit/` 直接访问驾驶舱大屏（只读演示，不含 Node 后端，增删改不落库）。
- **Release 资源**：每个版本在 GitHub Release 中挂载 `dist-v1.0.0.zip`，供下载解压后本地预览。

---

## 📄 许可
本项目用于演示与教学，数据均为模拟数据。
