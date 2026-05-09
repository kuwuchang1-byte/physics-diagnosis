import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function FAQ() {
  const [entries, setEntries] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api('/api/faq').then(d => setEntries(d.data || [])).catch(console.error)
    api('/api/faq/categories').then(d => setCategories(d.data || [])).catch(console.error)
  }, [])

  const filtered = entries.filter(e => {
    if (selectedCat && e.category !== selectedCat) return false
    if (search && !e.question.includes(search) && !e.answer.includes(search)) return false
    return true
  })

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">常见问题</h1>

      {/* 搜索和分类 */}
      <div className="flex gap-3 mb-4">
        <input
          className="input-field flex-1"
          placeholder="搜索问题..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input-field w-40" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
          <option value="">全部分类</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 列表 */}
      <div className="space-y-2">
        {filtered.map((entry) => (
          <div key={entry.id} className="card overflow-hidden">
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
            >
              <span className="text-gray-900 font-medium">{entry.question}</span>
              <span className="text-gray-400 text-xl">{expanded === entry.id ? '−' : '+'}</span>
            </button>
            {expanded === entry.id && (
              <div className="px-4 pb-3 text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                {entry.answer}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-8">没有找到相关问题</p>
        )}
      </div>
    </div>
  )
}
