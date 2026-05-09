import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [conversations, setConversations] = useState([])
  const [studentsStats, setStudentsStats] = useState([])
  const [questions, setQuestions] = useState([])
  const [editQ, setEditQ] = useState(null)

  useEffect(() => {
    api('/api/admin/stats').then(d => setStats(d.data)).catch(console.error)
    api('/api/admin/conversations?limit=50').then(d => setConversations(d.data)).catch(console.error)
    api('/api/admin/students').then(d => setStudentsStats(d.data)).catch(console.error)
    loadQuestions()
  }, [])

  const loadQuestions = (params = '') => {
    api(`/api/questions${params}`).then(d => setQuestions(d.data || d.questions || [])).catch(console.error)
  }

  const handleCleanup = async () => {
    if (!confirm('确定清理所有未完成对话？')) return
    const r = await api('/api/admin/cleanup-conversations', { method: 'POST' })
    if (r.success) {
      alert('已清理')
      api('/api/admin/conversations?limit=50').then(d => setConversations(d.data)).catch(console.error)
    }
  }

  const handleAddQuestion = async () => {
    const q = { ...editQ }
    const res = await api('/api/questions', {
      method: 'POST',
      body: JSON.stringify(q),
    })
    if (res.success) { setEditQ(null); loadQuestions() }
  }

  const handleDeleteQuestion = async (id) => {
    if (!confirm('确定删除这道题？')) return
    const res = await api(`/api/questions/${id}`, { method: 'DELETE' })
    if (res.success) loadQuestions()
  }

  const handleUpdateQuestion = async (q) => {
    const res = await api(`/api/questions/${q.id}`, {
      method: 'PUT',
      body: JSON.stringify(q),
    })
    if (res.success) loadQuestions()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">后台管理</h1>

      {/* 数据统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats && (
          <>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.total_students}</div>
              <div className="text-sm text-gray-500">学生总数</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.total_conversations}</div>
              <div className="text-sm text-gray-500">对话总数</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.total_diagnoses}</div>
              <div className="text-sm text-gray-500">诊断报告数</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.total_questions}</div>
              <div className="text-sm text-gray-500">题库总数</div>
            </div>
          </>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button className="btn-secondary text-sm" onClick={handleCleanup}>清理未完成对话</button>
        <button className="btn-primary text-sm" onClick={() => setEditQ({
          core_dimension: 'physical_concept',
          sub_dimension: 'knowledge_application',
          core_dim_label: '物理观念',
          sub_dim_label: '知识应用',
          exercise_type: 'concept_model',
          exercise_type_label: '概念模型课',
          question_text: '',
          keywords: [],
          hint: '',
          difficulty: 2,
        })}>新增题目</button>
      </div>

      {/* 题库管理 */}
      <div className="card p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">题库管理（{questions.length} 题）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">题目</th>
                <th className="text-left py-2 px-2">维度</th>
                <th className="text-left py-2 px-2">难度</th>
                <th className="text-left py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(q => (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-500">{q.id}</td>
                  <td className="py-2 px-2 max-w-md truncate">{q.question_text?.slice(0, 60)}...</td>
                  <td className="py-2 px-2">{q.core_dim_label} / {q.sub_dim_label}</td>
                  <td className="py-2 px-2">{'⭐'.repeat(q.difficulty || 2)}</td>
                  <td className="py-2 px-2 space-x-2">
                    <button className="text-primary-600 hover:underline" onClick={() => setEditQ(q)}>编辑</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeleteQuestion(q.id)}>删除</button>
                    <button className="text-gray-600 hover:underline" onClick={() => handleUpdateQuestion({ ...q, active: q.active ? 0 : 1 })}>
                      {q.active ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑/新增题目标题 */}
      {editQ && (
        <div className="card p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{editQ.id ? '编辑题目' : '新增题目'}</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select className="input-field" value={editQ.core_dimension} onChange={e => setEditQ({...editQ, core_dimension: e.target.value, core_dim_label: e.target.options[e.target.selectedIndex].text.split('(')[0].trim()})}>
              <option value="physical_concept">物理观念</option>
              <option value="scientific_thinking">科学思维</option>
              <option value="scientific_inquiry">科学探究</option>
              <option value="scientific_attitude">科学态度与责任</option>
            </select>
            <select className="input-field" value={editQ.sub_dimension} onChange={e => setEditQ({...editQ, sub_dimension: e.target.value})}>
              <option value="knowledge_application">知识应用</option>
              <option value="model_construction">模型建构</option>
              <option value="analytical_reasoning">分析推理</option>
              <option value="critical_innovation">批判创新</option>
              <option value="questioning">提出问题</option>
              <option value="rational_inquiry">理性探究</option>
              <option value="reporting">表达交流</option>
              <option value="inquiry_awareness">探究意识</option>
              <option value="collaboration">合作学习</option>
              <option value="stse">STSE</option>
            </select>
          </div>
          <textarea className="input-field mb-3" rows={3} value={editQ.question_text} onChange={e => setEditQ({...editQ, question_text: e.target.value})} placeholder="题目内容" />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input-field" value={editQ.keywords?.join(', ') || ''} onChange={e => setEditQ({...editQ, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="关键词（逗号分隔）" />
            <input className="input-field" type="number" min={1} max={5} value={editQ.difficulty} onChange={e => setEditQ({...editQ, difficulty: parseInt(e.target.value) || 2})} />
          </div>
          <input className="input-field mb-3" value={editQ.hint || ''} onChange={e => setEditQ({...editQ, hint: e.target.value})} placeholder="提示（选填）" />
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleAddQuestion}>{editQ.id ? '保存修改' : '添加题目'}</button>
            <button className="btn-secondary" onClick={() => setEditQ(null)}>取消</button>
          </div>
        </div>
      )}

      {/* 最近对话 */}
      <div className="card p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">最近对话</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">ID</th>
                <th className="text-left py-2 px-2">学生</th>
                <th className="text-left py-2 px-2">知识模块</th>
                <th className="text-left py-2 px-2">状态</th>
                <th className="text-left py-2 px-2">时间</th>
              </tr>
            </thead>
            <tbody>
              {conversations.slice(0, 30).map(c => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-500">{c.id}</td>
                  <td className="py-2 px-2">{c.student_name || '未知'}</td>
                  <td className="py-2 px-2">{c.knowledge_area}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {c.status === 'completed' ? '已完成' : '进行中'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-500">{c.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 学生统计 */}
      <div className="card p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">学生诊断统计</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">姓名</th>
                <th className="text-left py-2 px-2">年级</th>
                <th className="text-left py-2 px-2">诊断次数</th>
                <th className="text-left py-2 px-2">平均分</th>
                <th className="text-left py-2 px-2">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {studentsStats.map(s => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2 px-2 font-medium">{s.name}</td>
                  <td className="py-2 px-2">{s.grade}</td>
                  <td className="py-2 px-2">{s.diagnosis_count}</td>
                  <td className="py-2 px-2">{s.avg_score ? Math.round(s.avg_score) : '-'}</td>
                  <td className="py-2 px-2 text-gray-500">{s.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
