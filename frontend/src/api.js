/**
 * API 工具 — 自动添加后端基地址
 * 开发环境：使用 Vite proxy（/api → localhost:3001）
 * 生产环境：使用 VITE_API_URL 环境变量
 */
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function api(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}
