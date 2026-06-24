# 🦊 白狐影视 · BaihuTV

> 影视聚合播放平台 · 密码保护 · 多分辨率(360P-1080P) · D1 云同步 · CF Pages 一键部署

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔐 密码保护 | 访问需输入密码，防止资源被滥用 |
| 🎬 多分辨率 | 360P / 480P / 720P / 1080P 自由切换 |
| 📡 22条内置API | 一键抓取验活，自动测速排序 |
| ⚙️ API 管理 | 添加/编辑/删除/测速/拖拽排序 |
| ☁️ D1 云同步 | API列表、观看历史多设备同步 |
| 📺 全品类 | 电影 / 电视剧 / 动漫 / 综艺 |
| 💾 进度记忆 | 自动保存播放进度 |
| 🌙 多主题 | 暗黑 / 明亮 / 深空蓝 / 暗夜绿 |
| 📱 全响应式 | 手机 / 平板 / 电脑完美适配 |
| ⌨️ 快捷键 | 空格/方向键/F 全屏 |

---

## 🚀 部署方式

### 方式一：Cloudflare Pages（推荐，免费）

#### 1. Fork 仓库

点击右上角 **Fork** 将本仓库 fork 到你的账号。

#### 2. 连接 CF Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages → Create → Pages → Connect to Git**
3. 选择你 fork 的仓库
4. 填写构建配置：

```
┌─────────────────────────────────────────────────┐
│  Framework preset:    None（不选框架）            │
│  Build command:       （留空）                    │
│  Build output dir:    public                     │
│  Root directory:      /（默认）                   │
└─────────────────────────────────────────────────┘
```

5. 点击 **Save and Deploy**，等待部署完成。

#### 3. 设置环境变量（必须）

部署完成后，进入 **Settings → Environment variables → Add variable**：

```
┌──────────────────────────────────────────────────────────┐
│  变量名           变量值            说明                  │
│  ─────────────── ─────────────────── ────────────────── │
│  SITE_PASSWORD   你的自定义密码      ⚠️ 必须修改！        │
│  STRICT_PROXY    false               允许所有域名代理     │
└──────────────────────────────────────────────────────────┘
```

> ⚠️ **安全提示**：`SITE_PASSWORD` 默认值为 `baihu2025`，**请务必修改**！

设置完成后点击 **Save and Deploy** 重新部署使变量生效。

---

#### 4. （可选）绑定 D1 数据库实现云同步

1. 在 Cloudflare Dashboard → **Storage & Databases → D1** 新建数据库：

```
┌─────────────────────────────────────────┐
│  Database name:  baihutv-db             │
└─────────────────────────────────────────┘
```

2. 创建后复制 **Database ID**

3. 在 Pages 项目 → **Settings → Functions → D1 database bindings**：

```
┌─────────────────────────────────────────────────────────┐
│  Variable name:  DB                                      │
│  D1 database:    baihutv-db（选择刚创建的数据库）          │
└─────────────────────────────────────────────────────────┘
```

4. 重新部署后，设置面板中的"云同步"功能即可使用。

---

### 方式二：上传部署（直接上传文件到 CF Pages）

适合不使用 Git 的情况：

1. 下载本仓库 ZIP：点击 **Code → Download ZIP** 解压
2. 进入 CF Dashboard → **Workers & Pages → Create → Pages → Upload assets**
3. 上传 `public/` 目录下的所有文件（`index.html`、`css/`、`js/`、`_headers`、`_redirects`）

> ⚠️ **注意**：直接上传方式**不支持** Functions（即 `/api/proxy` 代理功能）。  
> 建议使用 Git 连接方式以获得完整功能。

---

### 方式三：wrangler CLI 部署

```bash
# 安装依赖
npm install

# 本地预览
npm run dev

# 部署到 CF Pages
npm run deploy
```

---

### 方式四：Vercel 部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luobikang1/tv3)

Vercel 部署需要额外添加 `api/proxy.js` 作为 Serverless Function（见 `docs/vercel.md`）。

---

## ⚙️ 关键配置变量

### Cloudflare 环境变量

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   SITE_PASSWORD = "你的密码"                                     │
│   ▲ 访问密码，用户登录时需输入此密码                               │
│   ▲ 同时作为 D1 API 的鉴权 Token                                 │
│   ▲ 默认值 baihu2025，请务必在 CF Dashboard 中修改！              │
│                                                                  │
│   STRICT_PROXY  = "false"                                        │
│   ▲ false = 允许代理任意域名（推荐）                              │
│   ▲ true  = 只允许白名单内的影视API域名                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### wrangler.toml（本地部署）

```toml
[vars]
# ┌─────────────────────────────────────────────┐
# │  修改以下密码后重新执行 npm run deploy        │
# └─────────────────────────────────────────────┘
SITE_PASSWORD = "baihu2025"   # ← 修改这里
STRICT_PROXY  = "false"
```

### D1 绑定（wrangler.toml 中）

```toml
# 取消注释并填入你的 D1 Database ID
# [[d1_databases]]
# binding       = "DB"              # ← 保持 DB 不变
# database_name = "baihutv-db"      # ← 你的数据库名
# database_id   = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← 替换此处
```

---

## 📁 项目结构

```
BaihuTV/
├── public/                   # 前端静态文件（CF Pages 部署目录）
│   ├── index.html            # 主页面（含登录、播放器、设置）
│   ├── _headers              # CF Pages HTTP 头配置
│   ├── _redirects            # CF Pages 路由重定向（SPA回退）
│   ├── css/
│   │   └── style.css         # 全部样式
│   └── js/
│       ├── api-pool.js       # 22条内置API + 测速函数
│       └── app.js            # 主应用逻辑
├── functions/
│   └── api/
│       └── [[route]].js      # CF Pages Functions（代理+D1+Auth）
├── wrangler.toml             # CF 配置文件
├── package.json
└── README.md
```

---

## ⌨️ 键盘快捷键

| 按键 | 功能 |
|------|------|
| `空格` | 播放 / 暂停 |
| `←` / `→` | 快退 / 快进 10 秒 |
| `↑` / `↓` | 音量增 / 减 |
| `F` | 全屏 |
| `Esc` | 返回 / 关闭弹窗 |

---

## ❓ 常见问题

**Q: 部署后打开网页一片空白？**  
A: 检查 CF Pages 的构建输出目录是否设置为 `public`，不要填写其他路径。

**Q: 登录提示"网络异常"？**  
A: 确认 `functions/api/[[route]].js` 文件存在于仓库中，CF Pages Functions 需要此文件提供 `/api/auth` 接口。

**Q: 视频无法播放？**  
A: 在设置 → API管理中点击"🔍 抓取可用API"，等待测速完成后重试。

**Q: D1 同步提示"D1 not configured"？**  
A: 需要在 CF Pages → Settings → Functions 中绑定 D1 数据库，变量名必须为 `DB`。

**Q: 如何修改密码？**  
A: 在 CF Dashboard → Pages → 你的项目 → Settings → Environment variables 中修改 `SITE_PASSWORD`，保存后重新部署。

---

## 📄 License

MIT © BaihuTV Contributors
