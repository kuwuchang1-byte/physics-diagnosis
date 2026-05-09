export default function MessageBubble({ message, isStreaming }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-500 text-xs px-4 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? 'bg-primary-500 text-white' : 'bg-primary-100'
        }`}
      >
        {isUser ? '你' : '🤖'}
      </div>

      {/* 消息内容 */}
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 leading-relaxed ${
          isUser
            ? 'bg-primary-500 text-white'
            : isStreaming
            ? 'bg-gray-100 text-gray-800 border-l-4 border-primary-400'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary-500 ml-0.5 animate-pulse" />}
        </p>
      </div>
    </div>
  )
}
