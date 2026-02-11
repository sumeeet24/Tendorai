'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Send, FileText, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import FileUpload from '@/components/FileUpload'

interface Props {
  tender: any
  company: any
  eligibility: any
  userId: string
}

export default function TenderAnalysisClient({ tender, company, eligibility, userId }: Props) {
  const [activeStep, setActiveStep] = useState(1)
  const [showDebugText, setShowDebugText] = useState(false)
  const router = useRouter()

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([
      { role: 'assistant', content: 'Hello! I am your Tender Assistant. How can I help you analyze this tender?' }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const handleSendMessage = async () => {
      if (!inputMessage.trim()) return

      const newMessage = inputMessage
      setInputMessage('')
      setChatMessages(prev => [...prev, { role: 'user', content: newMessage }])
      setChatLoading(true)

      try {
          const res = await fetch('/api/chat', {
              method: 'POST',
              body: JSON.stringify({
                  message: newMessage,
                  tenderId: tender.id,
                  context: { uiState: { activeStep } }
              })
          })
          const data = await res.json()
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } catch (err) {
          console.error(err)
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }])
      } finally {
          setChatLoading(false)
      }
  }

  const handleGenerateBid = async (type: 'technical' | 'compliance') => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Generating ${type} draft... Please wait.` }])

      try {
          const res = await fetch('/api/generate-bid', {
              method: 'POST',
              body: JSON.stringify({ tenderId: tender.id, type })
          })
          const data = await res.json()
          // Display the result in chat or modal? Chat is easy for copy paste.
          setChatMessages(prev => [...prev, { role: 'assistant', content: `Here is your draft:\n\n**${data.title || 'Draft'}**\n\n${data.content || JSON.stringify(data)}` }])
      } catch (err) {
          console.error(err)
          setChatMessages(prev => [...prev, { role: 'assistant', content: 'Failed to generate draft.' }])
      }
  }

  // --- Render Steps ---

  const renderStep1 = () => {
    // If summary exists (new flow), show summary. Else show old clauses flow.
    const isNewFlow = !!tender.summary || !!tender.ocr_text;

    if (isNewFlow) {
        return (
            <div className="space-y-6">
                 {/* Header Status */}
                 <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                     <div>
                         <h2 className="text-lg font-bold">Analysis Status</h2>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center text-green-600 font-bold"><CheckCircle className="w-5 h-5 mr-1"/> Analyzed</span>
                         </div>
                     </div>
                     <div className="text-right">
                         <p className="text-sm text-gray-500">Closing Date</p>
                         <p className="font-mono font-bold text-red-600">
                             {tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
                         </p>
                     </div>
                 </div>

                 {/* Summary Section */}
                 <div className="bg-white p-6 rounded-lg shadow space-y-4">
                     <h3 className="text-lg font-semibold text-gray-900">Executive Summary</h3>
                     <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                         {tender.summary || 'No summary available.'}
                     </div>
                 </div>

                 {/* Debug Button */}
                 <div className="flex justify-between items-center">
                     <button
                        onClick={() => setShowDebugText(!showDebugText)}
                        className="text-sm text-gray-500 underline hover:text-gray-700 flex items-center"
                     >
                        <FileText className="w-4 h-4 mr-1"/>
                        {showDebugText ? 'Hide Extracted Text' : 'View Extracted Text (Debug)'}
                     </button>

                     <button onClick={() => setActiveStep(2)} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">
                        Proceed to Actions
                     </button>
                 </div>

                 {/* Debug View */}
                 {showDebugText && (
                     <div className="bg-gray-50 p-4 rounded border font-mono text-xs text-gray-700 h-96 overflow-y-auto whitespace-pre-wrap">
                         {tender.ocr_text || 'No extracted text found.'}
                     </div>
                 )}
            </div>
        )
    }

    // Group clauses by category
    const categories: Record<string, any[]> = {}
    tender.clauses?.forEach((c: any) => {
        if (!categories[c.category]) categories[c.category] = []
        categories[c.category].push(c)
    })

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                 <div>
                     <h2 className="text-lg font-bold">Eligibility Status</h2>
                     <div className="flex items-center gap-2 mt-1">
                        {eligibility?.status === 'ELIGIBLE' && <span className="flex items-center text-green-600 font-bold"><CheckCircle className="w-5 h-5 mr-1"/> Eligible</span>}
                        {eligibility?.status === 'NOT_ELIGIBLE' && <span className="flex items-center text-red-600 font-bold"><XCircle className="w-5 h-5 mr-1"/> Not Eligible</span>}
                        {(!eligibility || eligibility.status === 'PARTIAL') && <span className="flex items-center text-yellow-600 font-bold"><AlertTriangle className="w-5 h-5 mr-1"/> Partial / Pending</span>}

                        <span className="text-gray-500 text-sm ml-4">Confidence: {eligibility?.confidence ? Math.round(eligibility.confidence * 100) : 0}%</span>
                     </div>
                 </div>
                 <div className="text-right">
                     <p className="text-sm text-gray-500">Closing Date</p>
                     <p className="font-mono font-bold text-red-600">
                         {tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
                     </p>
                 </div>
            </div>

            <div className="space-y-4">
                {Object.keys(categories).map(cat => (
                    <div key={cat} className="bg-white border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700 flex justify-between">
                            {cat}
                            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">{categories[cat].length} clauses</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {categories[cat].map((clause: any, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600 border-l-2 border-indigo-200 pl-3">
                                    <p>{clause.raw_text}</p>
                                    <div className="mt-1 flex gap-2 text-xs text-gray-400">
                                        <span>Page {clause.page_start}-{clause.page_end}</span>
                                        {clause.numbers?.length > 0 && <span>Values: {clause.numbers.join(', ')}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end">
                <button onClick={() => setActiveStep(2)} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">
                    Proceed to Actions
                </button>
            </div>
        </div>
    )
  }

  const renderStep2 = () => {
      // Split Screen
      return (
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
              {/* LEFT: Actions */}
              <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                  <div className="bg-white p-4 rounded-lg shadow">
                      <h3 className="font-bold text-gray-900 mb-4">Missing Documents / Actions</h3>

                      {/* List failures from eligibility */}
                      {eligibility?.failed_clauses?.length > 0 ? (
                          <div className="space-y-4">
                              {eligibility.failed_clauses.map((fail: any, idx: number) => (
                                  <div key={idx} className="border border-red-200 bg-red-50 p-3 rounded-md">
                                      <p className="text-sm text-red-800 font-medium">Issue: {fail.reason}</p>
                                      <p className="text-xs text-red-600 mt-1">Clause ID: {fail.clause_id}</p>
                                      <div className="mt-3">
                                          <FileUpload
                                              label="Upload Evidence"
                                              documentType="other"
                                              companyId={company.id}
                                              ownerId={userId}
                                              onUploadComplete={() => router.refresh()}
                                          />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-green-600 text-sm flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2"/> No critical eligibility failures detected.
                          </div>
                      )}

                      <div className="mt-6 pt-6 border-t">
                          <h4 className="font-semibold text-gray-700 mb-2">Bid Generation</h4>
                          <div className="flex gap-2">
                              <button onClick={() => handleGenerateBid('technical')} className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50">Draft Technical Bid</button>
                              <button onClick={() => handleGenerateBid('compliance')} className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50">Draft Compliance</button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* RIGHT: Chat */}
              <div className="w-full lg:w-96 flex flex-col bg-white rounded-lg shadow border">
                  <div className="p-3 border-b bg-gray-50 font-semibold text-gray-700">Tender Assistant</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                  {msg.content}
                              </div>
                          </div>
                      ))}
                      {chatLoading && <div className="text-xs text-gray-400">Thinking...</div>}
                  </div>
                  <div className="p-3 border-t flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="Ask about this tender..."
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button onClick={handleSendMessage} disabled={chatLoading} className="text-indigo-600 hover:text-indigo-800">
                          <Send className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  const renderStep3 = () => {
      return (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 text-center">Ready for Submission?</h2>

              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                      <span className="font-medium">Eligibility Status</span>
                      <span className={`px-2 py-1 rounded text-sm font-bold ${eligibility?.status === 'ELIGIBLE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {eligibility?.status || 'UNKNOWN'}
                      </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                      <span className="font-medium">Documents Uploaded</span>
                      <span className="font-mono">{tender.clauses ? 'Checked' : 'Pending'}</span>
                  </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                  <button className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">Export Checklist</button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Mark as Ready</button>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-white rounded-lg shadow">
            {[1, 2, 3].map(step => (
                <button
                    key={step}
                    onClick={() => setActiveStep(step)}
                    className={`flex items-center gap-2 ${activeStep === step ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${activeStep === step ? 'border-indigo-600' : 'border-gray-300'}`}>
                        {step}
                    </div>
                    <span>{step === 1 ? 'Overview' : step === 2 ? 'Actions' : 'Finalize'}</span>
                </button>
            ))}
        </div>

        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}
        {activeStep === 3 && renderStep3()}
    </div>
  )
}
