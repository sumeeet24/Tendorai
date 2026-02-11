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

  // Chat State (Unused but kept for structure)
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([
      { role: 'assistant', content: 'Hello! I am your Tender Assistant. How can I help you analyze this tender?' }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // --- Render Steps ---

  const renderStep1 = () => {
    // tender is passed from server component. It corresponds to tender_profiles row.
    // metadata is a JSONB column where we stored extracted_text and summary.

    const summary = tender.metadata?.summary || tender.summary || "Summary not available yet. Please wait for processing to complete."
    const extractedText = tender.metadata?.extracted_text || tender.extracted_text || ""

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                 <div>
                     <h2 className="text-lg font-bold">Document Status</h2>
                     <div className="flex items-center gap-2 mt-1">
                        {tender.processed ? (
                            <span className="flex items-center text-green-600 font-bold"><CheckCircle className="w-5 h-5 mr-1"/> Processed</span>
                        ) : (
                            <span className="flex items-center text-yellow-600 font-bold"><Loader2 className="w-5 h-5 mr-1 animate-spin"/> Processing...</span>
                        )}
                     </div>
                 </div>
                 <div className="text-right">
                     <p className="text-sm text-gray-500">Closing Date</p>
                     <p className="font-mono font-bold text-red-600">
                         {tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
                     </p>
                 </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white border rounded-lg overflow-hidden shadow">
                <div className="px-4 py-3 bg-indigo-50 border-b font-semibold text-indigo-900 flex items-center gap-2">
                    <FileText className="w-5 h-5"/> Tender Summary (Gemini)
                </div>
                <div className="p-6 text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {summary}
                </div>
            </div>

            {/* Debug Text Toggle */}
            <div className="bg-gray-50 border rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowDebugText(!showDebugText)}
                    className="w-full px-4 py-3 flex justify-between items-center text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                    <span className="font-semibold text-gray-700">View Extracted Text (Debug)</span>
                    {showDebugText ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                </button>
                {showDebugText && (
                    <div className="p-4 bg-gray-900 text-green-400 font-mono text-xs overflow-auto max-h-96 border-t border-gray-200">
                        {extractedText ? extractedText : "No text extracted yet."}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button
                    disabled={true}
                    className="bg-gray-300 text-gray-500 px-6 py-2 rounded-md cursor-not-allowed font-medium"
                >
                    Detailed Analysis (Coming Soon)
                </button>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Progress Bar - Disabled Navigation */}
        <div className="flex items-center justify-between px-8 py-4 bg-white rounded-lg shadow">
            {[1, 2, 3].map(step => (
                <div
                    key={step}
                    className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-600 font-bold' : 'text-gray-300'}`}
                >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 1 ? 'border-indigo-600' : 'border-gray-200'}`}>
                        {step}
                    </div>
                    <span>{step === 1 ? 'Overview' : step === 2 ? 'Actions' : 'Finalize'}</span>
                </div>
            ))}
        </div>

        {activeStep === 1 && renderStep1()}
        {/* Steps 2 and 3 are currently disabled/hidden */}
    </div>
  )
}
