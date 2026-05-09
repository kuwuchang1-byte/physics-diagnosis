import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/student-info', label: '学生信息', icon: '👤' },
  { path: '/student-info', label: '开始诊断', icon: '📝', clearData: true },
  { path: '/history', label: '诊断记录', icon: '📊' },
  { path: '/faq', label: 'FAQ知识库', icon: '📖' },
  { path: '/admin', label: '管理后台', icon: '⚙️' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                物
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">物理学情诊断</h1>
                <p className="text-xs text-gray-500">高中物理 · 牛顿定律</p>
              </div>
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                item.clearData ? (
                  <button
                    key={item.label}
                    onClick={() => {
                      localStorage.removeItem('currentStudent')
                      window.location.href = '/student-info'
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      location.pathname === '/diagnosis' || location.pathname === '/student-info'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              ))}
            </nav>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                item.clearData ? (
                  <button
                    key={item.label}
                    onClick={() => {
                      localStorage.removeItem('currentStudent')
                      setMobileMenuOpen(false)
                      window.location.href = '/student-info'
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                      location.pathname === '/diagnosis' || location.pathname === '/student-info'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        )}
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* 底部 */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          高中物理学情诊断助手 · 基于 CodeBuddy Agent SDK 构建
        </div>
      </footer>
    </div>
  )
}
