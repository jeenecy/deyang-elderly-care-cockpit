# 部署说明 · GitHub Pages 线上预览

本项目已通过 **GitHub Pages** 发布线上预览版。本文档记录完整部署步骤，供复现与后续迭代使用。

## 一、线上地址

| 资源 | 地址 |
| --- | --- |
| 🟢 在线预览（驾驶舱大屏） | https://jeenecy.github.io/deyang-elderly-care-cockpit/ |
| 📦 源码仓库 | https://github.com/jeenecy/deyang-elderly-care-cockpit |
| 🏷️ Release v1.0.0（含构建产物 zip） | https://github.com/jeenecy/deyang-elderly-care-cockpit/releases/tag/v1.0.0 |

> 后台管理默认演示账号：`admin01` / `123456`（公开仓库已随之公开，生产环境请替换真实鉴权）。

## 二、项目文件结构（静态产物）

GitHub Pages 服务的是 `gh-pages` 分支下的静态文件，由 Vite 构建生成：

```
dist/                  # Vite 构建产物（相对路径 base，适配 Pages 项目站）
├── index.html
├── assets/
│   ├── index-*.css
│   └── index-*.js
└── vendor/
    └── three.min.js   # 3D 地图引擎
```

源码分支 `main` 不提交 `dist/`、`node_modules/`、`.workbuddy/`、Release 附件 zip（见 `.gitignore`）。

## 三、GitHub Pages 配置要点

### 1. 构建用相对路径 base（关键）
GitHub Pages **项目站**的访问路径是 `https://<user>.github.io/<repo>/`，根路径非 `/`。
若用绝对路径 `/assets/...`，资源会 404。本项目 `vite.config.js` 已设：

```js
export default defineConfig({
  base: './',            // 相对路径，Pages 不再 404
  build: { emptyOutDir: true }  // 每次构建清空 dist，避免历史哈希残留
})
```

构建命令：
```bash
npm install
node_modules/vite/bin/vite.js build --base ./
```

### 2. 发布到 `gh-pages` 分支
Pages 源设为 `gh-pages` / 根目录。用临时仓库推送（不污染源码库）：

```bash
TOKEN=<你的PAT>   # 勾选 repo 权限
TMP=$(mktemp -d)
cp -r dist/. "$TMP"/
cd "$TMP"
git init -b gh-pages -q
git config user.name "你的名字"; git config user.email "you@x.com"
git add -A
git commit -q -m "deploy: GitHub Pages"
git remote add origin "https://${TOKEN}@github.com/<user>/<repo>.git"
git push -u origin gh-pages
cd -; rm -rf "$TMP"
```

### 3. 开启 Pages（二选一）
- **API**：
  ```bash
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -d '{"source":{"branch":"gh-pages","path":"/"}}' \
    https://api.github.com/repos/<user>/<repo>/pages
  ```
- **网页**：仓库 → Settings → Pages → Source 选 `gh-pages` → Save。

首次构建约需 1 分钟，状态可在 Settings → Pages 查看（`built` 即就绪）。

## 四、发布 Release 并挂载预览附件

Release 附件是「可下载的离线预览包」，与 Pages 在线预览互补：

```bash
# 1) 打 tag + 创建 release（body 含 Pages 链接）
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d '{"tag_name":"v1.0.0","name":"v1.0.0","body":"..."}' \
  https://api.github.com/repos/<user>/<repo>/releases
# 返回 JSON 中取 id

# 2) 上传 dist 压缩包作为附件
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/zip" \
  --data-binary @dist-v1.0.0.zip \
  "https://uploads.github.com/repos/<user>/<repo>/releases/<ID>/assets?name=dist-v1.0.0.zip"
```

## 五、本仓库分支说明

| 分支 | 内容 | 用途 |
| --- | --- | --- |
| `main` | 全部源码 + README + DEPLOY | 开发主干 |
| `gh-pages` | `dist/` 静态产物 | GitHub Pages 线上预览源 |

## 六、已知限制

- **线上预览为前端只读演示**：GitHub Pages 仅托管静态文件，无 Node 后端（`server/` 的 records API 不在线），后台增删改不落库。需要真实后端的在线版，请单独部署 Node 服务 + 反向代理。
- **默认账号公开**：公开仓库下演示账号 `admin01/123456` 可见，正式发布请修改 `src/stores/data.js` 中 `authConfig` 默认口令。
- **3D 视图**：依赖 `dist/vendor/three.min.js`，已随 `dist` 一并发布，Pages 可直接加载。
