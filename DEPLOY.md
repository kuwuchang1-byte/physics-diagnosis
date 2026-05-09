# 高中物理学情诊断助手 — 部署指南

## 架构

```
Frontend (Vercel)  ────►  Backend (Railway)
  React + Vite               Node.js + Express + WebSocket
  静态网页                    API + WebSocket + SQLite
```

## 第一步：部署后端（Railway）

1. 注册 [Railway](https://railway.app/)（GitHub登录，免费$5/月额度）
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库，目录选 `backend`
4. Railway 会自动检测 `Dockerfile` 并构建
5. 在 Dashboard 中设置环境变量：
   - `AI_API_KEY` = 你的智谱AI API Key
   - `AI_BASE_URL` = `https://open.bigmodel.cn/api/paas/v4`
   - `AI_MODEL` = `glm-4-flash`
   - `PORT` = `3001`
6. 部署完成后，复制分配的域名（如 `https://physics-api.up.railway.app`）

## 第二步：部署前端（Vercel）

1. 注册 [Vercel](https://vercel.com/)（GitHub登录，免费）
2. 点击 "Add New" → "Project"
3. 选择同一个 GitHub 仓库
4. **关键设置**：
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. 在 Environment Variables 中添加：
   - `VITE_API_URL` = 你上一步获取的 Railway 域名（如 `https://physics-api.up.railway.app`）
6. 点击 Deploy

## 第三步：验证

1. 访问 Vercel 分配的域名（如 `https://physics-diagnosis.vercel.app`）
2. 输入学生信息
3. 开始AI诊断对话

## 本地开发

```bash
# 终端1：启动后端
cd backend
cp .env.example .env  # 填入 AI_API_KEY
npm install
npm run dev

# 终端2：启动前端
cd frontend
npm install
npm run dev
```

前端 dev server (`localhost:5173`) 自动通过 Vite proxy 连接后端 (`localhost:3001`)。
