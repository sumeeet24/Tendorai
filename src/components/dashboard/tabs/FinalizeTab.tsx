import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { CheckCircle, AlertTriangle, XCircle, FileText, AlertOctagon, ArrowRight, Loader2, Info } from 'lucide-react'

interface FinalizeTabProps {
  tender: TenderProfile
  eligibility: EligibilityResult | null
}

export default function FinalizeTab({ tender, eligibility }: FinalizeTabProps) {
  const metadata = (tender.metadata || {}) as TenderMetadata
  const requiredDocs = metadata.required_documents || []
  const uploads = metadata.uploads || {}
  const drafts = metadata.drafts || {}
  const eligibilityResult = metadata.eligibility_result || eligibility

  // Calculate missing items
  const missingDocs = requiredDocs.filter(doc => !uploads[doc.name] && !drafts[doc.name])
  const pendingDrafts = requiredDocs.filter(doc => drafts[doc.name] && !uploads[doc.name]) // Generated but not uploaded as final? Or just drafts present.
  // Actually, if drafted, it's not missing.
  // But maybe we want to convert draft to final upload? For now, if drafted, it's good progress.

  const isEligible = eligibilityResult?.status === 'ELIGIBLE'
  const isReady = missingDocs.length === 0 && isEligible

  return (
    <div className="space-y-8">
        {/* Status Header */}
        <div className={`p-6 rounded-lg border flex items-center justify-between ${isReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-4">
                {isReady ? <CheckCircle className="w-8 h-8 text-green-600"/> : <AlertTriangle className="w-8 h-8 text-yellow-600"/>}
                <div>
                    <h2 className={`text-xl font-bold ${isReady ? 'text-green-800' : 'text-yellow-800'}`}>
                        {isReady ? 'Tender Analysis Complete' : 'Action Required'}
                    </h2>
                    <p className={`${isReady ? 'text-green-700' : 'text-yellow-700'}`}>
                        {isReady ? 'All requirements met. You are ready to proceed.' : 'Please address the missing items below.'}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completion</span>
                <div className="text-2xl font-bold text-gray-900">
                    {Math.round(((requiredDocs.length - missingDocs.length) / (requiredDocs.length || 1)) * 100)}%
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checklist */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-indigo-600"/>
                    Submission Checklist
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-700 font-medium">Eligibility Check</span>
                        {eligibilityResult?.status === 'ELIGIBLE' ? (
                            <span className="text-green-600 flex items-center gap-1 text-sm font-bold"><CheckCircle className="w-4 h-4"/> Passed</span>
                        ) : (
                            <span className="text-red-600 flex items-center gap-1 text-sm font-bold"><XCircle className="w-4 h-4"/> Failed/Pending</span>
                        )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-700 font-medium">Required Documents</span>
                        {missingDocs.length === 0 ? (
                            <span className="text-green-600 flex items-center gap-1 text-sm font-bold"><CheckCircle className="w-4 h-4"/> All Present</span>
                        ) : (
                            <span className="text-yellow-600 flex items-center gap-1 text-sm font-bold"><AlertTriangle className="w-4 h-4"/> {missingDocs.length} Missing</span>
                        )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="text-gray-700 font-medium">Risk Analysis</span>
                        {(eligibilityResult?.failed_clauses?.length || 0) === 0 ? (
                             <span className="text-green-600 flex items-center gap-1 text-sm font-bold"><CheckCircle className="w-4 h-4"/> Low Risk</span>
                        ) : (
                             <span className="text-red-600 flex items-center gap-1 text-sm font-bold"><AlertOctagon className="w-4 h-4"/> Issues Found</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Missing Items */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600"/>
                    Pending Actions
                </h3>
                {missingDocs.length > 0 ? (
                    <ul className="space-y-3">
                        {missingDocs.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-3 text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-red-500"/>
                                <span className="flex-1">{doc.name}</span>
                                <span className="text-xs text-red-500 font-medium border border-red-200 px-2 py-1 rounded bg-red-50">Missing</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <CheckCircle className="w-12 h-12 mb-2 text-green-200"/>
                        <p>No pending actions.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Final Action */}
        <div className="flex justify-end pt-4 border-t">
            <button
                disabled={!isReady}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
                Proceed to Submission <ArrowRight className="w-5 h-5"/>
            </button>
        </div>
    </div>
  )
}
