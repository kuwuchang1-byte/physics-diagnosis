import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'

export default function DiagnosisResult() {
  const { id } = useParams()
  const [result, setResult] = useState(null)

  useEffect(() => {
    api(`/api/diagnosis/result/${id}`)
      .then(d => setResult(d.data))
      .catch(console.error)
  }, [id])

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-gray-500">加载诊断报告...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card p-6">
        {/* 总分 */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-primary-600 mb-2">
            {result.overall_score ?? '--'}<span className="text-2xl text-gray-400">/100</span>
          </div>
          <p className="text-gray-600">{result.summary}</p>
        </div>

        {/* 核心素养维度得分 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">核心素养维度得分</h3>
          {(() => {
            let modules
            try {
              modules = typeof result.module_scores === 'string' ? JSON.parse(result.module_scores) : result.module_scores
            } catch {
              modules = {}
            }
            return (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(modules).map(([key, mod]) => (
                  <div key={key} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">{mod.name || mod.label}</span>
                      <span className={`text-lg font-bold ${mod.score >= 80 ? 'text-green-600' : mod.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {mod.score}分
                      </span>
                    </div>
                    {mod.subScores && Object.keys(mod.subScores).length > 0 && (
                      <div className="space-y-1">
                        {Object.values(mod.subScores).map((sub, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-500">
                            <span>{sub.label || sub.name}</span>
                            <span className="font-medium">{sub.score}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{mod.comments}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* 建议 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">学习建议</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{result.summary}</p>
        </div>

        <div className="flex gap-3">
          <Link to="/" className="btn-primary flex-1 text-center">返回首页</Link>
          <Link to="/history" className="btn-secondary flex-1 text-center">查看历史</Link>
        </div>
      </div>
    </div>
  )
}
