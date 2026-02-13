import { TenderProfile, EligibilityResult, TenderMetadata } from '@/types'
import { AlertTriangle, CheckCircle, XCircle, FileText, AlertOctagon, Info } from 'lucide-react'

interface OverviewTabProps {
  tender: TenderProfile
  eligibility: EligibilityResult | null
}

export default function OverviewTab({ tender, eligibility }: OverviewTabProps) {
  const metadata = tender.metadata || {}
  const summary = metadata.summary || "Summary not available."
  const eligibilityResult = metadata.eligibility_result || eligibility

  // Extract risks from sections if no explicit risk analysis exists
  // For now, let's use failed clauses as risks if available
  const risks = eligibilityResult?.failed_clauses || []

  // Helper to determine status color/icon
  const getEligibilityStatus = (status?: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Eligible' }
      case 'NOT_ELIGIBLE':
        return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, label: 'Not Eligible' }
      case 'PARTIAL':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle, label: 'Partially Eligible' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', icon: Info, label: 'Pending Analysis' }
    }
  }

  const status = getEligibilityStatus(eligibilityResult?.status)
  const StatusIcon = status.icon

  return (
    <div className="space-y-6">
      {/* Eligibility Status Card */}
      <div className={`p-6 rounded-lg border ${status.bg} ${status.color.replace('text', 'border')}`}>
        <div className="flex items-center gap-3 mb-2">
            <StatusIcon className={`w-8 h-8 ${status.color}`} />
            <h2 className={`text-xl font-bold ${status.color}`}>{status.label}</h2>
        </div>
        <p className="text-gray-700">
            Confidence Score: <span className="font-semibold">{eligibilityResult?.confidence ? `${(eligibilityResult.confidence * 100).toFixed(0)}%` : 'N/A'}</span>
        </p>
      </div>

      {/* Summary Section */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600"/>
            Executive Summary
        </h3>
        <div className="prose text-gray-700 leading-relaxed whitespace-pre-wrap">
            {summary}
        </div>
      </div>

      {/* Risk Flags */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-600"/>
            Risk Flags & Failed Clauses
        </h3>
        {risks.length > 0 ? (
            <div className="space-y-3">
                {risks.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-md">
                        <div className="font-medium text-red-800 mb-1">Clause {risk.clause_id}</div>
                        <p className="text-sm text-red-700">{risk.reason}</p>
                        <p className="text-xs text-gray-500 mt-2 italic">"{risk.text}"</p>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 italic">No major risks or failed clauses detected.</p>
        )}
      </div>
    </div>
  )
}
