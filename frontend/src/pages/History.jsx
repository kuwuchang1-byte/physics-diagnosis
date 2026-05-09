import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function History() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    api('/api/students').then(d => setStudents(d.data || [])).catch(console.error)
  }, [])

  const loadHistory = (student) => {
    setSelectedStudent(student)
    api(`/api/students/${student.id}/history`).then(d => setHistory(d.data || [])).catch(console.error)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">诊断历史</h1>

      {/* 学生选择 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {students.map(s => (
          <button
            key={s.id}
            className={`card p-3 text-left hover:bg-gray-50 ${selectedStudent?.id === s.id ? 'ring-2 ring-primary-500' : ''}`}
            onClick={() => loadHistory(s)}
          >
            <div className="font-medium text-gray-900">{s.name}</div>
            <div className="text-sm text-gray-500">{s.grade}</div>
          </button>
        ))}
      </div>

      {/* 历史记录 */}
      {selectedStudent && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">{selectedStudent.name} 的诊断记录</h2>
          {history.length === 0 && (
            <p className="text-gray-500 text-center py-8">暂无诊断记录</p>
          )}
          {history.map(h => (
            <Link key={h.id} to={`/diagnosis-result/${h.id}`} className="card p-4 block hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{h.knowledge_area}</span>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                  h.overall_score >= 80 ? 'bg-green-100 text-green-700' :
                  h.overall_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {Math.round(h.overall_score)}分
                </span>
              </div>
              <p className="text-sm text-gray-500">{h.created_at}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
