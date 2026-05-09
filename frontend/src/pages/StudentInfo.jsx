import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function StudentInfo() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('高一')
  const [progressNote, setProgressNote] = useState('')
  const [knowledgeArea, setKnowledgeArea] = useState('牛顿定律')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入姓名')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await api('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          grade,
          class_name: '',
          progress_note: progressNote,
        }),
      })
      if (res.success) {
        localStorage.setItem('currentStudent', JSON.stringify({
          id: res.data.id,
          name: name.trim(),
          grade,
          progress_note: progressNote,
          knowledge_area: knowledgeArea,
        }))
        navigate('/diagnosis')
      } else {
        setError(res.error || '创建失败')
      }
    } catch (err) {
      setError('服务器错误: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">开始学情诊断</h1>
        <p className="text-sm text-gray-500 mb-6">请输入学生信息开始AI诊断</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入学生姓名"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
            <select className="input-field" value={grade} onChange={e => setGrade(e.target.value)}>
              <option value="高一">高一</option>
              <option value="高二">高二</option>
              <option value="高三">高三</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">知识模块</label>
            <select className="input-field" value={knowledgeArea} onChange={e => setKnowledgeArea(e.target.value)}>
              <option value="牛顿定律">牛顿定律</option>
              <option value="运动学">运动学</option>
              <option value="力学">力学</option>
              <option value="电学">电学</option>
              <option value="磁学">磁学</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学习备注（选填）</label>
            <textarea
              className="input-field"
              value={progressNote}
              onChange={e => setProgressNote(e.target.value)}
              placeholder="如：刚学完牛顿第一、二定律"
              rows={2}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '创建中...' : '开始诊断'}
          </button>
        </form>
      </div>
    </div>
  )
}
