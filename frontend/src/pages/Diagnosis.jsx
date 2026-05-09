import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MessageBubble from '../components/MessageBubble.jsx'

export default function Diagnosis() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [questionProgress, setQuestionProgress] = useState({ index: 0, total: 0 })

  // 答完后进入回看模式
  const [phase, setPhase] = useState('answering') // 'answering' | 'review'
  const [reviewData, setReviewData] = useState(null) // { answer_details, overall_score, ... }
  const [resultId, setResultId] = useState(null)

  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)
  const studentRef = useRef(null)
  const containerRef = useRef(null)
  const inputAreaRef = useRef(null)

  // 用 ref 保存最新的 currentMessage，避免闭包陷阱
  const currentMessageRef = useRef('')

  // 同步 currentMessage 到 ref
  useEffect(() => {
    currentMessageRef.current = currentMessage
  }, [currentMessage])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentMessage, scrollToBottom])

  // 移动端键盘适配
  useEffect(() => {
    if (!window.visualViewport) return
    const viewport = window.visualViewport
    const onResize = () => {
      setTimeout(scrollToBottom, 50)
    }
    viewport.addEventListener('resize', onResize)
    viewport.addEventListener('scroll', onResize)
    return () => {
      viewport.removeEventListener('resize', onResize)
      viewport.removeEventListener('scroll', onResize)
    }
  }, [scrollToBottom])

  const handleInputFocus = useCallback(() => {
    setTimeout(scrollToBottom, 300)
  }, [scrollToBottom])

  useEffect(() => {
    const stored = localStorage.getItem('currentStudent')
    if (!stored) {
      navigate('/student-info')
      return
    }
    studentRef.current = JSON.parse(stored)

    // 生产环境用 VITE_API_URL 环境变量连接后端，本地开发走同域代理
    const apiUrl = import.meta.env.VITE_API_URL || ''
    let wsUrl
    if (apiUrl) {
      const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const protocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${host}/ws`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws`
    }
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      const student = studentRef.current
      ws.send(JSON.stringify({
        type: 'init',
        student_id: student.id,
        student_name: student.name,
        grade: student.grade,
        progress_note: student.progress_note || '',
        knowledge_area: student.knowledge_area || '牛顿定律',
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'init_ack':
          break

        case 'question':
          // 收到新题目 — 先固化之前的流式消息，再开始新消息
          setCurrentMessage((prev) => {
            if (prev) {
              setMessages((old) => [
                ...old,
                { role: 'assistant', content: prev, id: Date.now() },
              ])
            }
            return ''
          })
          setQuestionProgress({ index: data.index, total: data.total })
          break

        case 'chunk':
          setCurrentMessage((prev) => prev + data.content)
          break

        case 'ack':
          break

        case 'answering_done':
          // 所有题答完 — 将当前流式消息固化
          setCurrentMessage((prev) => {
            if (prev) {
              setMessages((old) => [
                ...old,
                { role: 'assistant', content: prev, id: Date.now() },
              ])
            }
            return ''
          })
          setLoading(false)
          break

        case 'done':
          // 一条消息结束 — 将当前流式消息固化
          setCurrentMessage((prev) => {
            if (prev) {
              setMessages((old) => [
                ...old,
                { role: 'assistant', content: prev, id: Date.now() },
              ])
            }
            return ''
          })
          setLoading(false)
          break

        case 'diagnosis_result':
          setLoading(false)
          // 进入回看模式
          setReviewData(data.data)
          setResultId(data.result_id)
          setPhase('review')
          break

        case 'error':
          setMessages((prev) => [
            ...prev,
            { role: 'system', content: `⚠️ ${data.message}`, id: Date.now() },
          ])
          setLoading(false)
          break
      }
    }

    ws.onerror = () => {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: '⚠️ 连接服务器失败，请确保后端已启动', id: Date.now() },
      ])
    }

    ws.onclose = () => {
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || loading) return
    const content = input.trim()
    setInput('')
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, id: Date.now() },
    ])
    setLoading(true)
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content,
    }))
    setTimeout(scrollToBottom, 100)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ===== 回看模式 =====
  if (phase === 'review' && reviewData) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card p-6">
          {/* 总分 */}
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-primary-600 mb-2">
              {reviewData.overall_score ?? '--'}<span className="text-2xl text-gray-400">/100</span>
            </div>
            <p className="text-gray-600">{reviewData.overall_assessment}</p>
          </div>

          {/* 核心素养维度得分 */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">核心素养维度得分</h3>
            <div className="grid grid-cols-2 gap-3">
            {Object.entries(reviewData.modules || {}).map(([key, mod]) => (
              <div key={key} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 text-sm">{mod.name}</span>
                  <span className={`text-lg font-bold ${mod.score >= 80 ? 'text-green-600' : mod.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {mod.score}分
                  </span>
                </div>
                {mod.subScores && Object.keys(mod.subScores).length > 0 && (
                  <div className="space-y-1">
                    {Object.values(mod.subScores).map((sub) => (
                      <div key={sub.name} className="flex justify-between text-xs text-gray-500">
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
          </div>

          {/* 答题回看 */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">答题回看</h3>
            <div className="space-y-4">
              {(reviewData.answer_details || []).map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 题目 */}
                  <div className="bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-primary-600">
                        第{item.index}题 · {item.coreDimLabel} · {item.subDimLabel}
                      </span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                        item.score >= 80 ? 'bg-green-100 text-green-700' :
                        item.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.score}分
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{item.questionText}</p>
                  </div>
                  {/* 学生回答 + AI评价 */}
                  <div className="px-4 py-3 space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">你的回答：</span>
                      <p className="text-gray-700 text-sm">{item.answer || '（未作答）'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        AI评价{item.scoredBy === 'ai' ? ' 🤖' : ' 📋'}：
                      </span>
                      <p className="text-gray-700 text-sm">{item.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 建议 */}
          {reviewData.recommendations && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">学习建议</h3>
              <ul className="space-y-2">
                {reviewData.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                localStorage.removeItem('currentStudent')
                navigate(`/diagnosis-result/${resultId}`)
              }}
            >
              查看详细诊断报告
            </button>
            <button
              className="btn-secondary flex-1"
              onClick={() => {
                localStorage.removeItem('currentStudent')
                navigate('/')
              }}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== 答题模式 =====
  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="diagnosis-layout card flex flex-col h-[calc(100dvh-180px)] min-h-[400px]">
        {/* 头部 + 进度条 */}
        <div className="pb-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI 诊断对话</h2>
              <p className="text-sm text-gray-500">
                {studentRef.current?.name || ''}同学 · 牛顿定律学情诊断
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-success' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-500">{connected ? '已连接' : '未连接'}</span>
            </div>
          </div>
          {/* 进度条 */}
          {questionProgress.total > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>第 {questionProgress.index} / {questionProgress.total} 题</span>
                <span>{Math.round((questionProgress.index / questionProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(questionProgress.index / questionProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 消息列表 */}
        <div className="diagnosis-messages flex-1 overflow-y-auto py-4 space-y-4" ref={containerRef}>
          {messages.length === 0 && !currentMessage && (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-3">🤖</div>
              <p>正在连接 AI 教师，请稍候...</p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {currentMessage && (
            <MessageBubble
              message={{ role: 'assistant', content: currentMessage }}
              isStreaming
            />
          )}

          {loading && !currentMessage && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="bg-gray-100 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="diagnosis-input-area pt-3 border-t border-gray-200" ref={inputAreaRef}>
          <div className="flex gap-3">
            <textarea
              className="input-field flex-1 min-h-[48px] max-h-[120px] resize-none"
              placeholder="输入你的回答..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              disabled={loading || !connected}
              rows={1}
            />
            <button
              className="btn-primary px-6 shrink-0 self-end"
              onClick={sendMessage}
              disabled={loading || !connected || !input.trim()}
            >
              发送
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">按 Enter 发送，Shift+Enter 换行</p>
        </div>
      </div>
    </div>
  )
}
