import { useState, useEffect, useRef } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { Send, Loader2, Bot, User, Sparkles, MessageSquare } from 'lucide-react'

interface AgentChatPanelProps {
  tender: TenderProfile
  eligibility: EligibilityResult | null
  selectedSectionKey: string | null
  activeTab: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AgentChatPanel({ tender, eligibility, selectedSectionKey, activeTab }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Tender Intelligence Agent. I have analyzed the tender documents. Ask me anything about requirements, eligibility, or specific clauses.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Context updates - maybe send a system message if context changes significantly?
  // For now, we just use the context in the API call.

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Build context object
      const context = {
        uiState: {
          selectedSection: selectedSectionKey,
          activeTab: activeTab
        },
        // We don't send full metadata here as it might be huge, the backend fetches it.
        // But we can send specific client-side state if needed.
        // The backend fetches tender by ID and gets metadata.
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          tenderId: tender.id,
          context: context
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || "I'm sorry, I couldn't process that.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error("Chat error", error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r">
      {/* Header */}
      <div className="p-4 border-b bg-indigo-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
            <Bot className="w-6 h-6 text-indigo-600"/>
        </div>
        <div>
            <h2 className="font-bold text-gray-900">Tender Agent</h2>
            <p className="text-xs text-indigo-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3"/> Gemini 3 Flash Powered
            </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-gray-600"/> : <Bot className="w-5 h-5 text-indigo-600"/>}
            </div>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-800'}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
          </div>
        ))}
        {loading && (
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-indigo-600"/>
                </div>
                <div className="bg-white border rounded-lg p-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/>
                    <span className="text-xs text-gray-500">Thinking...</span>
                </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
          {selectedSectionKey && (
              <div className="mb-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3"/>
                  Context: Section {selectedSectionKey}
              </div>
          )}
          <div className="relative flex items-end gap-2 border rounded-xl shadow-sm bg-white p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about eligibility, requirements..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2 px-1 text-sm text-gray-900 placeholder:text-gray-400"
                rows={1}
            />
            <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors mb-0.5"
            >
                <Send className="w-4 h-4"/>
            </button>
          </div>
      </div>
    </div>
  )
}
