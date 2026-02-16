import { useState, useEffect, useRef } from 'react'
import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { Send, Loader2, Bot, User, Sparkles, MessageSquare } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'

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
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-pink-200">
                    <Bot className="w-6 h-6 text-white"/>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                </span>
            </div>
            <div>
                <h2 className="font-bold text-gray-900 text-sm">Qubit</h2>
                <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                   Built by ARTINT<span className="text-blue-500">SER</span>
                </p>
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-gray-100 border-gray-200' : 'bg-pink-50 border-pink-100'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-gray-600"/> : <Sparkles className="w-4 h-4 text-pink-600"/>}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                ? 'bg-gray-900 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-md'
            }`}>
                {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                    <div className="prose prose-sm max-w-none prose-pink prose-p:leading-relaxed prose-headings:font-bold prose-strong:font-bold prose-ul:list-disc prose-ul:pl-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                )}

                <div className={`text-[10px] mt-2 opacity-60 ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
          </div>
        ))}

        {loading && (
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-pink-600"/>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-md flex items-center gap-3">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Analyzing...</span>
                </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {selectedSectionKey && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 text-xs text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 shadow-sm"
              >
                  <MessageSquare className="w-3.5 h-3.5"/>
                  <span className="font-medium">Context: Section {selectedSectionKey}</span>
              </motion.div>
          )}
          <div className="relative flex items-end gap-2 border border-gray-200 rounded-2xl shadow-sm bg-gray-50/50 p-1.5 focus-within:ring-2 focus-within:ring-pink-100 focus-within:border-pink-400 focus-within:bg-white transition-all duration-200">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask follow-up questions..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-3 text-sm text-gray-900 placeholder:text-gray-400"
                rows={1}
            />
            <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-brand-gradient text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg disabled:shadow-none mb-0.5 active:scale-95"
            >
                <Send className="w-4 h-4"/>
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">AI can make mistakes. Verify important information.</p>
          </div>
      </div>
    </div>
  )
}
