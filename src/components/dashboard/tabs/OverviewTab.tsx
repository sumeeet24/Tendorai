import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { AlertTriangle, CheckCircle, XCircle, FileText, AlertOctagon, Info, ShieldCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface OverviewTabProps {
  tender: TenderProfile
  eligibility: EligibilityResult | null
}

export default function OverviewTab({ tender, eligibility }: OverviewTabProps) {
  const metadata = tender.metadata || {}
  const summary = metadata.summary || "Summary not available."
  const eligibilityResult = metadata.eligibility_result || eligibility

  // Handle Risks
  // New risks array from metadata or fallback to failed clauses
  const risks = metadata.risks || []
  const failedClauses = eligibilityResult?.failed_clauses || []

  // Helper to determine status color/icon
  const getEligibilityStatus = (result: EligibilityResult | null) => {
    if (!result) return { color: 'text-gray-600', bg: 'bg-gray-50', icon: Info, label: 'Pending Analysis' }

    // Check new 'eligible' boolean first
    if (result.eligible === true) {
        return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Eligible' }
    } else if (result.eligible === false) {
        return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Not Eligible' }
    }

    // Fallback to old 'status' field
    switch (result.status) {
      case 'ELIGIBLE':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Eligible' }
      case 'NOT_ELIGIBLE':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Not Eligible' }
      case 'PARTIAL':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle, label: 'Partially Eligible' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', icon: Info, label: 'Analysis Required' }
    }
  }

  const status = getEligibilityStatus(eligibilityResult)
  const StatusIcon = status.icon

  // Format confidence
  const getConfidenceDisplay = (conf: string | number | undefined) => {
      if (conf === undefined || conf === null) return null
      if (typeof conf === 'number') return `${(conf * 100).toFixed(0)}%`
      return conf.charAt(0).toUpperCase() + conf.slice(1) // "high" -> "High"
  }
  const confidenceDisplay = getConfidenceDisplay(eligibilityResult?.confidence)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Eligibility Status Card - Modernized */}
      <div className={`p-6 rounded-2xl border ${status.bg} ${status.color.replace('text', 'border')} relative overflow-hidden shadow-sm transition-all hover:shadow-md`}>
        {/* Background Pattern */}
        <div className="absolute -top-4 -right-4 opacity-5 rotate-12">
            <StatusIcon className="w-40 h-40" />
        </div>

        <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg} border-2 ${status.color.replace('text', 'border')} bg-white shadow-sm`}>
                    <StatusIcon className={`w-6 h-6 ${status.color}`} />
                </div>
                <div>
                     <h2 className={`text-2xl font-bold ${status.color} tracking-tight`}>{status.label}</h2>
                     <p className="text-sm text-gray-500 font-medium">Based on automated analysis of tender documents</p>
                </div>

                {confidenceDisplay && (
                    <div className="sm:ml-auto flex items-center gap-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-gray-200/50">
                        <div className="text-right">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Confidence</span>
                            <span className="text-lg font-bold text-gray-800">{confidenceDisplay}</span>
                        </div>
                        <div className="h-10 w-1 bg-gray-200 rounded-full">
                            <div
                                className={`w-full rounded-full ${status.label === 'Eligible' ? 'bg-green-500' : status.label === 'Not Eligible' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                style={{ height: typeof eligibilityResult?.confidence === 'number' ? `${eligibilityResult.confidence * 100}%` : '80%' }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Section (2/3 width) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 pb-4 border-b border-gray-50">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600"/>
                </div>
                Executive Summary
            </h3>
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed prose-headings:font-bold prose-headings:text-gray-800 prose-p:my-3 prose-li:my-1 prose-strong:text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summary}
                </ReactMarkdown>
            </div>
          </div>

          {/* Risk Flags (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <AlertOctagon className="w-5 h-5 text-red-600"/>
                    </div>
                    Risk Assessment
                </h3>

                {risks.length > 0 ? (
                    <div className="space-y-3">
                        {risks.map((risk, idx) => (
                            <div key={idx} className="group p-4 bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded-xl transition-all duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-gray-800 group-hover:text-red-800 text-sm">{risk.risk_type}</div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm ${
                                        risk.severity === 'high' ? 'bg-red-100 text-red-700' :
                                        risk.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {risk.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 group-hover:text-red-700 leading-relaxed line-clamp-3">{risk.clause}</p>
                            </div>
                        ))}
                    </div>
                ) : failedClauses.length > 0 ? (
                    // Fallback
                     <div className="space-y-3">
                        {failedClauses.map((risk, idx) => (
                            <div key={idx} className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                <div className="font-medium text-red-800 mb-1 text-sm">Clause {risk.clause_id}</div>
                                <p className="text-xs text-red-700">{risk.reason}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                        <p className="text-gray-900 font-medium text-sm">No major risks detected</p>
                        <p className="text-gray-500 text-xs mt-1">The AI didn't flag any critical issues.</p>
                    </div>
                )}
              </div>
          </div>
      </div>
    </div>
  )
}
